import * as adal from 'adal-node';
import dayjs, { Dayjs, OpUnitType } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import * as dotenv from 'dotenv';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Clipboard, commands, env, QuickPickItem, QuickPickOptions, TextDocument, Uri, window } from 'vscode';
import * as Constants from '../../common/constants';
import { HttpRequest } from '../../models/httpRequest';
import { ResolveErrorMessage, ResolveWarningMessage } from '../../models/httpVariableResolveResult';
import { VariableType } from '../../models/variableType';
import { AadTokenCache } from '../aadTokenCache';
import { HttpClient } from '../httpClient';
import { EnvironmentVariableProvider } from './environmentVariableProvider';
import { HttpVariable, HttpVariableContext, HttpVariableProvider } from './httpVariableProvider';

const uuidv4 = require('uuid/v4');

dayjs.extend(utc);

type SystemVariableValue = Pick<HttpVariable, Exclude<keyof HttpVariable, 'name'>>;
type ResolveSystemVariableFunc = (name: string, document: TextDocument, context: HttpVariableContext) => Promise<SystemVariableValue>;

export class SystemVariableProvider implements HttpVariableProvider {

    private readonly clipboard: Clipboard;
    private readonly resolveFuncs: Map<string, ResolveSystemVariableFunc> = new Map<string, ResolveSystemVariableFunc>();
    private readonly timestampRegex: RegExp = new RegExp(`\\${Constants.TimeStampVariableName}(?:\\s(\\-?\\d+)\\s(y|Q|M|w|d|h|m|s|ms))?`);
    private readonly datetimeRegex: RegExp = new RegExp(`\\${Constants.DateTimeVariableName}\\s(rfc1123|iso8601|\'.+\'|\".+\")(?:\\s(\\-?\\d+)\\s(y|Q|M|w|d|h|m|s|ms))?`);
    private readonly localDatetimeRegex: RegExp = new RegExp(`\\${Constants.LocalDateTimeVariableName}\\s(rfc1123|iso8601|\'.+\'|\".+\")(?:\\s(\\-?\\d+)\\s(y|Q|M|w|d|h|m|s|ms))?`);
    private readonly randomIntegerRegex: RegExp = new RegExp(`\\${Constants.RandomIntVariableName}\\s(\\-?\\d+)\\s(\\-?\\d+)`);
    private readonly processEnvRegex: RegExp = new RegExp(`\\${Constants.ProcessEnvVariableName}\\s(\\%)?(\\w+)`);

    private readonly dotenvRegex: RegExp = new RegExp(`\\${Constants.DotenvVariableName}\\s(\\%)?([\\w-.]+)`);

    private readonly requestUrlRegex: RegExp = /^(?:[^\s]+\s+)([^:]*:\/\/\/?[^/\s]*\/?)/;

    private readonly aadRegex: RegExp = new RegExp(`\\s*\\${Constants.AzureActiveDirectoryVariableName}(\\s+(${Constants.AzureActiveDirectoryForceNewOption}))?(\\s+(ppe|public|cn|de|us))?(\\s+([^\\.]+\\.[^\\}\\s]+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?(\\s+aud:([^\\.]+\\.[^\\}\\s]+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?\\s*`);

    private readonly innerSettingsEnvironmentVariableProvider: EnvironmentVariableProvider =  EnvironmentVariableProvider.Instance;
    private static _instance: SystemVariableProvider;

    public static get Instance(): SystemVariableProvider {
        if (!this._instance) {
            this._instance = new SystemVariableProvider();
        }

        return this._instance;
    }

    private constructor() {
        this.clipboard = env.clipboard;
        this.registerTimestampVariable();
        this.registerDateTimeVariable();
        this.registerLocalDateTimeVariable();
        this.registerGuidVariable();
        this.registerRandomIntVariable();
        this.registerProcessEnvVariable();
        this.registerDotenvVariable();
        this.registerAadTokenVariable();
    }

    public readonly type: VariableType = VariableType.System;

    public async has(name: string, document: TextDocument): Promise<boolean> {
        const [variableName] = name.split(' ').filter(Boolean);
        return this.resolveFuncs.has(variableName);
    }

    public async get(name: string, document: TextDocument, context: HttpVariableContext): Promise<HttpVariable> {
        const [variableName] = name.split(' ').filter(Boolean);
        if (!this.resolveFuncs.has(variableName)) {
            return { name: variableName, error: ResolveErrorMessage.SystemVariableNotExist };
        }

        const result = await this.resolveFuncs.get(variableName)!(name, document, context);
        return { name: variableName, ...result };
    }

    public async getAll(document: undefined, context: HttpVariableContext): Promise<HttpVariable[]> {
        return [...this.resolveFuncs.keys()].map(name => ({ name }));
    }

    private registerTimestampVariable() {
        this.resolveFuncs.set(Constants.TimeStampVariableName, async name => {
            const groups = this.timestampRegex.exec(name);
            if (groups !== null && groups.length === 3) {
                const [, offset, option] = groups;
                const ts = offset && option
                    ? dayjs.utc().add(+offset, option as OpUnitType).unix()
                    : dayjs.utc().unix();
                return { value: ts.toString() };
            }

            return { warning: ResolveWarningMessage.IncorrectTimestampVariableFormat };
        });
    }

    private registerDateTimeVariable() {
        this.resolveFuncs.set(Constants.DateTimeVariableName, async name => {
            const groups = this.datetimeRegex.exec(name);
            if (groups !== null && groups.length === 4) {
                const [, type, offset, option] = groups;
                let date: Dayjs;
                if (offset && option) {
                    date = dayjs.utc().add(+offset, option as OpUnitType);
                } else {
                    date = dayjs.utc();
                }

                if (type === 'rfc1123') {
                    return { value: date.toDate().toUTCString() };
                } else if (type === 'iso8601') {
                    return { value: date.toISOString() };
                } else {
                    return { value: date.format(type.slice(1, type.length - 1)) };
                }
            }

            return { warning: ResolveWarningMessage.IncorrectDateTimeVariableFormat };
        });
    }

    private registerLocalDateTimeVariable() {
        this.resolveFuncs.set(Constants.LocalDateTimeVariableName, async name => {
            const groups = this.localDatetimeRegex.exec(name);
            if (groups !== null && groups.length === 4) {
                const [, type, offset, option] = groups;
                let date = dayjs.utc().local();
                if (offset && option) {
                    date = date.add(+offset, option as OpUnitType);
                }

                if (type === 'rfc1123') {
                    return { value: date.locale('en').format('ddd, DD MMM YYYY HH:mm:ss ZZ') };
                } else if (type === 'iso8601') {
                    return { value: date.toISOString() };
                } else {
                    return { value: date.format(type.slice(1, type.length - 1)) };
                }
            }

            return { warning: ResolveWarningMessage.IncorrectLocalDateTimeVariableFormat };
        });
    }

    private registerGuidVariable() {
        this.resolveFuncs.set(Constants.GuidVariableName, async () => ({ value: uuidv4() }));
    }

    private registerRandomIntVariable() {
        this.resolveFuncs.set(Constants.RandomIntVariableName, async name => {
            const groups = this.randomIntegerRegex.exec(name);
            if (groups !== null && groups.length === 3) {
                const [, min, max] = groups;
                const minNum = Number(min);
                const maxNum = Number(max);
                if (minNum < maxNum) {
                    return { value: (Math.floor(Math.random() * (maxNum - minNum)) + minNum).toString() };
                }
            }

            return { warning: ResolveWarningMessage.IncorrectRandomIntegerVariableFormat };
        });
    }
    private registerProcessEnvVariable() {
        this.resolveFuncs.set(Constants.ProcessEnvVariableName, async name => {
            const groups = this.processEnvRegex.exec(name);
            if (groups !== null && groups.length === 3 ) {
                const [, refToggle, environmentVarName] = groups;
                let processEnvName = environmentVarName;
                if (refToggle !== undefined) {
                    processEnvName = await this.resolveSettingsEnvironmentVariable(environmentVarName);
                }
                const envValue = process.env[processEnvName];
                if (envValue !== undefined) {
                    return { value: envValue.toString() };
                } else {
                    return { value: '' };
                }
            }
            return { warning: ResolveWarningMessage.IncorrectProcessEnvVariableFormat };
        });
    }

    private registerDotenvVariable() {
        this.resolveFuncs.set(Constants.DotenvVariableName, async (name, document) => {
            const absolutePath = path.join(path.dirname(document.fileName), '.env');
            if (!await fs.pathExists(absolutePath)) {
                return { warning: ResolveWarningMessage.DotenvFileNotFound };
            }
            const groups = this.dotenvRegex.exec(name);
            if (groups !== null && groups.length === 3) {
                const parsed = dotenv.parse(await fs.readFile(absolutePath));
                const [, refToggle, key] = groups;
                let dotEnvVarName = key;
                if (refToggle !== undefined) {
                    dotEnvVarName = await this.resolveSettingsEnvironmentVariable(key);
                }
                if (!(dotEnvVarName in parsed)) {
                    return { warning: ResolveWarningMessage.DotenvVariableNotFound };
                }

                return { value: parsed[dotEnvVarName] };
            }

            return { warning: ResolveWarningMessage.IncorrectDotenvVariableFormat };
        });
    }

    private registerAadTokenVariable() {
        this.resolveFuncs.set(Constants.AzureActiveDirectoryVariableName, (name, document, context) => {
            // get target app from URL
            const match = this.requestUrlRegex.exec(context.parsedRequest);
            const url = (match && match[1]) || context.parsedRequest;

            let { cloud, targetApp } = this.getCloudProvider(url);

            // parse input options -- [new] [public|cn|de|us|ppe] [<domain|tenantId>] [aud:<domain|tenantId>]
            let tenantId = Constants.AzureActiveDirectoryDefaultTenantId;
            let forceNewToken = false;
            const groups = this.aadRegex.exec(name);
            if (groups) {
                forceNewToken = groups[2] === Constants.AzureActiveDirectoryForceNewOption;
                cloud = groups[4] || cloud;
                tenantId = groups[6] || tenantId;
                targetApp = groups[8] || targetApp;
            }

            // verify cloud (default to public)
            cloud = cloud in Constants.AzureClouds ? cloud : 'public';

            const endpoint = Constants.AzureClouds[cloud].aad;
            const signInUrl = `${endpoint}${tenantId}`;
            const authContext = new adal.AuthenticationContext(signInUrl);

            const clientId = Constants.AzureActiveDirectoryClientId;

            return new Promise((resolve, reject) => {
                const resolveToken = (token: adal.TokenResponse, cache: boolean = true, copy?: boolean) => {
                    if (cache) {
                        // save token using both specified and resulting domain/tenantId to cover more reuse scenarios
                        AadTokenCache.set(`${cloud}:${token.tenantId}`, token);
                        AadTokenCache.set(`${cloud}:${tenantId}`, token);
                    }

                    const tokenString = `${token.tokenType} ${token.accessToken}`;
                    if (copy && tokenString) {
                        // only copy the token to the clipboard if it's the first use (since we tell them we're doing it)
                       this.clipboard.writeText(tokenString).then(() => resolve({ value: tokenString }));
                    } else {
                        resolve({ value: tokenString });
                    }
                };
                const acquireToken = () => this._acquireToken(resolveToken, reject, authContext, cloud, tenantId, targetApp, clientId);

                // use previous token, if one has been obtained for the directory
                const cachedToken = !forceNewToken && AadTokenCache.get(`${cloud}:${tenantId}`);
                if (cachedToken) {
                    // if token expired, try to refresh; otherwise, use cached token
                    if (cachedToken.expiresOn <= new Date() && cachedToken.refreshToken) {
                        authContext.acquireTokenWithRefreshToken(cachedToken.refreshToken, clientId, targetApp, (refreshError: Error, refreshResponse: adal.TokenResponse) => {
                            // if refresh fails, acquire new token; otherwise, cache updated token
                            if (refreshError) {
                                acquireToken();
                            } else {
                                resolveToken(refreshResponse);
                            }
                        });
                    } else {
                        resolveToken(cachedToken, false);
                    }
                    return;
                }

                acquireToken();
            });
        });
    }

    private async resolveSettingsEnvironmentVariable(name: string) {
        if (await this.innerSettingsEnvironmentVariableProvider.has(name)) {
            const { value, error, warning } =  await this.innerSettingsEnvironmentVariableProvider.get(name);
            if (!error && !warning) {
                return value!.toString();
            } else {
                return name;
            }
        } else {
            return name;
        }
    }

    // #region AAD

    private getCloudProvider(endpoint: string): { cloud: string, targetApp: string } {
        for (const c in Constants.AzureClouds) {
            const { aad, arm, armAudience } = Constants.AzureClouds[c];
            if (aad === endpoint || arm === endpoint) {
                return {
                    cloud: c,
                    targetApp: arm === endpoint && armAudience ? armAudience : endpoint
                };
            }
        }

        // fall back to URL TLD
        return {
            cloud: endpoint.substr(endpoint.lastIndexOf('.') + 1),
            targetApp: endpoint
        };
    }

    private _acquireToken(
        resolve: (value?: adal.TokenResponse | PromiseLike<adal.TokenResponse>, cache?: boolean, copy?: boolean) => void,
        reject: (reason?: any) => void,
        authContext: adal.AuthenticationContext,
        cloud: string,
        tenantId: string,
        targetApp: string,
        clientId: string
    ) {
        const messageBoxOptions = { modal: true };
        const signInFailed = (stage: string, message: string) => {
            window.showErrorMessage(`Sign in failed. Please try again.\r\n\r\nStage: ${stage}\r\n\r\n${message}`, messageBoxOptions);
        };
        authContext.acquireUserCode(targetApp, clientId, "en-US", (codeError: Error, codeResponse: adal.UserCodeInfo) => {
            if (codeError) {
                signInFailed("acquireUserCode", codeError.message);
                return reject(codeError);
            }

            const prompt1 = `Sign in to Azure AD with the following code (will be copied to the clipboard) to add a token to your request.\r\n\r\nCode: ${codeResponse.userCode}`;
            const prompt2 = `1. Azure AD verification page opened in default browser (you may need to switch apps)\r\n2. Paste code to sign in and authorize VS Code (already copied to the clipboard)\r\n3. Confirm when done\r\n4. Token will be copied to the clipboard when finished\r\n\r\nCode: ${codeResponse.userCode}`;
            const signIn = "Sign in";
            const tryAgain = "Try again";
            const done = "Done";
            const signInPrompt = value => {
                if (value === signIn || value === tryAgain) {
                    this.clipboard.writeText(codeResponse.userCode).then(() => {
                        commands.executeCommand("vscode.open", Uri.parse(codeResponse.verificationUrl));
                        window.showInformationMessage(prompt2, messageBoxOptions, done, tryAgain).then(signInPrompt);
                    });
                } else if (value === done) {
                    authContext.acquireTokenWithDeviceCode(targetApp, clientId, codeResponse, (tokenError: Error, tokenResponse: adal.TokenResponse) => {
                        if (tokenError) {
                            signInFailed("acquireTokenWithDeviceCode", tokenError.message);
                            return reject(tokenError);
                        }

                        // if no directory chosen, pick one (otherwise, the token is likely useless :P)
                        if (tenantId === Constants.AzureActiveDirectoryDefaultTenantId) {
                            const client = new HttpClient();
                            const request = new HttpRequest(
                                "GET", `${Constants.AzureClouds[cloud].arm}/tenants?api-version=2017-08-01`,
                                { Authorization: this._getTokenString(tokenResponse) });
                            return client.send(request).then(async value => {
                                const items = JSON.parse(value.body).value;
                                const directories: QuickPickItem[] = [];
                                items.forEach(element => {
                                    /**
                                     * Some directories have multiple domains, but ARM doesn't return the primary domain
                                     * first. For instance, Microsoft has 268 domains and "microsoft.com" is #12. This
                                     * block attempts to pick the closest match based on the first word of the display
                                     * name (e.g. "Foo" in "Foo Bar"). If the search fails, the first domain is used.
                                     */
                                    let displayName = element.displayName;
                                    const count = element.domains.length;
                                    let domain = element.domains && element.domains[0];
                                    if (count > 1) {
                                        try {
                                            // find the best matches
                                            const displayNameSpaceIndex = displayName.indexOf(" ");
                                            const displayNameFirstWord = displayNameSpaceIndex > -1
                                                ? displayName.substring(0, displayNameSpaceIndex)
                                                : displayName;
                                            const bestMatches: string[] = [];
                                            const bestMatchesRegex = new RegExp(`(^${displayNameFirstWord}.com$)|(^${displayNameFirstWord}.[a-z]+(?:.[a-z]+)?$)|(^${displayNameFirstWord}[a-z]+.com$)|(^${displayNameFirstWord}[^:]*$)|(^[^:]*${displayNameFirstWord}[^:]*$)`, "gi");
                                            const bestMatchesRegexGroups = bestMatchesRegex.source.match(new RegExp(`${displayNameFirstWord}`, "g"))!.length;
                                            for (const d of element.domains) {
                                                // find matches; use empty array for all captures (+1 for the full string) if no matches found
                                                const matches = bestMatchesRegex.exec(d)
                                                    || Array(bestMatchesRegexGroups + 1).fill(null);

                                                // stop looking if the best match is found
                                                bestMatches[0] = matches[1];
                                                if (bestMatches[0]) {
                                                    break;
                                                }

                                                // keep old matches, save new matches
                                                for (let g = 1; g < bestMatchesRegexGroups; g++) {
                                                    bestMatches[g] = bestMatches[g] || matches[g + 1];
                                                }
                                            }

                                            // use the first match in the array of matches
                                            domain = bestMatches.find(m => !!m) || domain;
                                        } catch {
                                        }
                                        domain = `${domain} (+${count - 1} more)`;
                                    }

                                    /**
                                     * People with multiple directories sometimes end up 2 or more "Default Directory"
                                     * names. To improve findability and recognition speed, we are prepending the domain
                                     * prefix (e.g. abc.onmicrosoft.com == "abc (Default Directory)"), making the sorted
                                     * list easier to traverse.
                                     */
                                    if (displayName === Constants.AzureActiveDirectoryDefaultDisplayName) {
                                        const separator = domain.indexOf(".");
                                        displayName = `${separator > 0 ? domain.substring(0, separator) : domain} (${displayName})`;
                                    }
                                    directories.push({ label: displayName, description: element.tenantId, detail: domain });
                                });

                                // default to first directory
                                let result: QuickPickItem | undefined;
                                if (directories.length > 1) {
                                    // sort by display name and domain (in case display name isn't unique)
                                    directories.sort((a, b) => a.label + a.detail < b.label + b.detail ? -1 : 1);

                                    const options: QuickPickOptions = {
                                        matchOnDescription: true,  // tenant id
                                        matchOnDetail: true,       // url
                                        placeHolder: `Select the directory to sign in to or press 'Esc' to use the default`,
                                        ignoreFocusOut: true,      // keep list open when focus is lost (so we don't have to get the device code again)
                                    };
                                    result = await window.showQuickPick(directories, options);
                                } else {
                                    result = directories[0];
                                }

                                // if directory selected, sign in to that directory; otherwise, stick with the default
                                if (result) {
                                    const newDirAuthContext = new adal.AuthenticationContext(`${Constants.AzureClouds[cloud].aad}${result.description}`);
                                    newDirAuthContext.acquireTokenWithRefreshToken(tokenResponse.refreshToken!, clientId, null!, (newDirError: Error, newDirResponse: adal.TokenResponse) => {
                                        // cache/copy new directory token, if successful
                                        resolve(newDirError ? tokenResponse : newDirResponse, true, true);
                                    });
                                } else {
                                    return resolve(tokenResponse, true, true);
                                }
                            });
                        }

                        // explicitly copy this token since we've informed the user in the dialog
                        return resolve(tokenResponse, true, true);
                    });
                }
            };
            window.showInformationMessage(prompt1, messageBoxOptions, signIn).then(signInPrompt);
        });
    }

    private _getTokenString(token: adal.TokenResponse) {
        return token ? `${token.tokenType} ${token.accessToken}` : '';
    }

    // #endregion
}
