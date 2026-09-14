import { AuthenticationResult, PublicClientApplication } from '@azure/msal-node';
import dayjs, { Dayjs, ManipulateType } from 'dayjs';
import utc from 'dayjs/plugin/utc';
import * as dotenv from 'dotenv';
import * as fs from 'fs-extra';
import * as path from 'path';
import { Clipboard, commands, env, QuickPickItem, QuickPickOptions, TextDocument, Uri, window } from 'vscode';
import * as Constants from '../../common/constants';
import { EnvironmentController } from '../../controllers/environmentController';
import { HttpRequest } from '../../models/httpRequest';
import { ResolveErrorMessage, ResolveWarningMessage } from '../../models/httpVariableResolveResult';
import { VariableType } from '../../models/variableType';
import { AadTokenCache } from '../aadTokenCache';
import { AadV2TokenProvider } from '../aadV2TokenProvider';
import { CALLBACK_PORT, OidcClient } from '../auth/oidcClient';
import { HttpClient } from '../httpClient';
import { EnvironmentVariableProvider } from './environmentVariableProvider';
import { HttpVariable, HttpVariableContext, HttpVariableProvider } from './httpVariableProvider';

import { v4 as uuidv4 } from 'uuid';

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
    private readonly oidcRegex: RegExp = new RegExp(`\\s*(\\${Constants.OidcVariableName})(?:\\s+(${Constants.OIdcForceNewOption}))?(?:\\s*clientId:([\\w|.|:|/|_|-]+))?(?:\\s*issuer:([\\w|.|:|/]+))?(?:\\s*callbackDomain:([\\w|.|:|/|_|-]+))?(?:\\s*callbackPort:([\\w|_]+))?(?:\\s*authorizeEndpoint:([\\w|.|:|/|_|-]+))?(?:\\s*tokenEndpoint:([\\w|.|:|/|_|-]+))?(?:\\s*scopes:([\\w|.|:|/|_|-]+))?(?:\\s*audience:([\\w|.|:|/|_|-]+))?`);

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
        this.registerOidcTokenVariable();
        this.registerAadV2TokenVariable();
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
                    ? dayjs.utc().add(+offset, option as ManipulateType).unix()
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
                    date = dayjs.utc().add(+offset, option as ManipulateType);
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
                    date = date.add(+offset, option as ManipulateType);
                }

                if (type === 'rfc1123') {
                    return { value: date.locale('en').format('ddd, DD MMM YYYY HH:mm:ss ZZ') };
                } else if (type === 'iso8601') {
                    return { value: date.format() };
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
            let folderPath = path.dirname(document.fileName);
            const { name : environmentName } = await EnvironmentController.getCurrentEnvironment();

            let pathsFound = [false, false];

            while ((pathsFound = await Promise.all([
                fs.pathExists(path.join(folderPath, `.env.${environmentName}`)),
                fs.pathExists(path.join(folderPath, '.env'))
            ])).every(result => result === false)) {
                folderPath = path.join(folderPath, '..');
                if (folderPath === path.parse(process.cwd()).root) {
                    return { warning: ResolveWarningMessage.DotenvFileNotFound };
                }
            }
            const absolutePath = path.join(folderPath, pathsFound[0] ? `.env.${environmentName}` : '.env');
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
            const authority = `${endpoint}${tenantId}`;
            const clientId = Constants.AzureActiveDirectoryClientId;

            const pca = new PublicClientApplication({
                auth: {
                    clientId: clientId,
                    authority: authority
                }
            });

            return new Promise((resolve, reject) => {
                const resolveToken = (token: AuthenticationResult, cache: boolean = true) => {
                    if (cache && token) {
                        // save token using both specified and resulting domain/tenantId to cover more reuse scenarios
                        AadTokenCache.set(`${cloud}:${token.tenantId}`, token);
                        AadTokenCache.set(`${cloud}:${tenantId}`, token);
                    }

                    const tokenString = this._getTokenString(token);
                    resolve({ value: tokenString });
                };
                const acquireToken = () => this._acquireToken(resolveToken, reject, pca, cloud, tenantId, targetApp, clientId);

                // use previous token, if one has been obtained for the directory
                const cachedToken = !forceNewToken && AadTokenCache.get(`${cloud}:${tenantId}`);
                if (cachedToken) {
                    if (cachedToken.expiresOn && cachedToken.expiresOn <= new Date()) {
                        if (cachedToken.account) {
                            pca.acquireTokenSilent({
                                account: cachedToken.account,
                                scopes: this._getScopes(targetApp)
                            }).then(silentResult => {
                                if (silentResult) {
                                    resolveToken(silentResult);
                                } else {
                                    acquireToken();
                                }
                            }).catch(() => {
                                acquireToken();
                            });
                        } else {
                            acquireToken();
                        }
                    } else {
                        resolveToken(cachedToken, false);
                    }
                    return;
                }

                acquireToken();
            });
        });
    }

    private registerOidcTokenVariable() {
        this.resolveFuncs.set(Constants.OidcVariableName, async (name, document, context) => {
            const matchVar = this.oidcRegex.exec(name) ?? [];
            const [_, _1, forceNew, clientId, _3, callbackDomain, callbackPort, authorizeEndpoint, tokenEndpoint,  scopes, audience] = matchVar;

            const access_token = await OidcClient.getAccessToken(forceNew ? true : false, clientId, callbackDomain, parseInt(callbackPort ?? CALLBACK_PORT), authorizeEndpoint, tokenEndpoint, scopes, audience);
            return { value: access_token ?? "" };
        });
    }

    private registerAadV2TokenVariable() {
        this.resolveFuncs.set(Constants.AzureActiveDirectoryV2TokenVariableName,
            async (name) => {
                const aadV2TokenProvider = new AadV2TokenProvider();
                const token = await aadV2TokenProvider.acquireToken(name);
                return {value: token};
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
        resolve: (value?: AuthenticationResult | PromiseLike<AuthenticationResult>, cache?: boolean) => void,
        reject: (reason?: any) => void,
        pca: PublicClientApplication,
        cloud: string,
        tenantId: string,
        targetApp: string,
        clientId: string
    ) {
        const messageBoxOptions = { modal: true };
        const signInFailed = (stage: string, message: string) => {
            window.showErrorMessage(`Sign in failed. Please try again.\r\n\r\nStage: ${stage}\r\n\r\n${message}`, messageBoxOptions);
        };

        const scopes = this._getScopes(targetApp);

        pca.acquireTokenByDeviceCode({
            deviceCodeCallback: (codeResponse) => {
                const prompt1 = `Sign in to Azure AD with the following code (will be copied to the clipboard) to add a token to your request.\r\n\r\nCode: ${codeResponse.userCode}`;
                const prompt2 = `1. Azure AD verification page opened in default browser (you may need to switch apps)\r\n2. Paste code to sign in and authorize VS Code (already copied to the clipboard)\r\n3. Confirm when done\r\n\r\nCode: ${codeResponse.userCode}`;
                const signIn = "Sign in";
                const tryAgain = "Try again";
                const done = "Done";

                const signInPrompt = value => {
                    if (value === signIn || value === tryAgain) {
                        this.clipboard.writeText(codeResponse.userCode).then(() => {
                            commands.executeCommand("vscode.open", Uri.parse(codeResponse.verificationUri));
                            window.showInformationMessage(prompt2, messageBoxOptions, done, tryAgain).then(signInPrompt);
                        });
                    }
                };
                window.showInformationMessage(prompt1, messageBoxOptions, signIn).then(signInPrompt);
            },
            scopes: scopes
        }).then(async (tokenResponse) => {
            if (!tokenResponse) {
                signInFailed("acquireTokenByDeviceCode", "No token returned");
                return reject(new Error("No token returned"));
            }

            // if no directory chosen, pick one (otherwise, the token is likely useless :P)
            if (tenantId === Constants.AzureActiveDirectoryDefaultTenantId) {
                const client = new HttpClient();
                const request = new HttpRequest(
                    "GET", `${Constants.AzureClouds[cloud].arm}/tenants?api-version=2017-08-01`,
                    { Authorization: this._getTokenString(tokenResponse) });
                try {
                    const value = await client.send(request);
                    const items = JSON.parse(value.body).value;
                    const directories: QuickPickItem[] = [];
                    items.forEach(element => {
                        let displayName = element.displayName;
                        const count = element.domains ? element.domains.length : 0;
                        let domain = element.domains && element.domains[0];
                        if (count > 1) {
                            try {
                                const displayNameSpaceIndex = displayName.indexOf(" ");
                                const displayNameFirstWord = displayNameSpaceIndex > -1
                                    ? displayName.substring(0, displayNameSpaceIndex)
                                    : displayName;
                                const bestMatches: string[] = [];
                                const bestMatchesRegex = new RegExp(`(^${displayNameFirstWord}.com$)|(^${displayNameFirstWord}.[a-z]+(?:.[a-z]+)?$)|(^${displayNameFirstWord}[a-z]+.com$)|(^${displayNameFirstWord}[^:]*$)|(^[^:]*${displayNameFirstWord}[^:]*$)`, "gi");
                                const bestMatchesRegexGroups = bestMatchesRegex.source.match(new RegExp(`${displayNameFirstWord}`, "g"))!.length;
                                for (const d of element.domains) {
                                    const matches = bestMatchesRegex.exec(d)
                                        || Array(bestMatchesRegexGroups + 1).fill(null);

                                    bestMatches[0] = matches[1];
                                    if (bestMatches[0]) {
                                        break;
                                    }

                                    for (let g = 1; g < bestMatchesRegexGroups; g++) {
                                        bestMatches[g] = bestMatches[g] || matches[g + 1];
                                    }
                                }

                                domain = bestMatches.find(m => !!m) || domain;
                            } catch {
                            }
                            domain = `${domain} (+${count - 1} more)`;
                        }

                        if (displayName === Constants.AzureActiveDirectoryDefaultDisplayName) {
                            const separator = domain ? domain.indexOf(".") : -1;
                            displayName = `${separator > 0 ? domain.substring(0, separator) : domain} (${displayName})`;
                        }
                        directories.push({ label: displayName, description: element.tenantId, detail: domain });
                    });

                    let result: QuickPickItem | undefined;
                    if (directories.length > 1) {
                        directories.sort((a, b) => a.label + a.detail < b.label + b.detail ? -1 : 1);

                        const options: QuickPickOptions = {
                            matchOnDescription: true,
                            matchOnDetail: true,
                            placeHolder: `Select the directory to sign in to or press 'Esc' to use the default`,
                            ignoreFocusOut: true,
                        };
                        result = await window.showQuickPick(directories, options);
                    } else {
                        result = directories[0];
                    }

                    if (result && result.description) {
                        const newTenantId = result.description;
                        const newPca = new PublicClientApplication({
                            auth: {
                                clientId: clientId,
                                authority: `${Constants.AzureClouds[cloud].aad}${newTenantId}`
                            }
                        });
                        if (tokenResponse.account) {
                            try {
                                const newDirResponse = await newPca.acquireTokenSilent({
                                    account: tokenResponse.account,
                                    scopes: scopes
                                });
                                if (newDirResponse) {
                                    return resolve(newDirResponse, true);
                                }
                            } catch {
                                // Ignore silent token failure for new directory and fallback
                            }
                        }
                    }
                } catch {
                    // Ignore tenant fetch errors
                }
            }

            return resolve(tokenResponse, true);
        }).catch(err => {
            signInFailed("acquireTokenByDeviceCode", err.message || String(err));
            return reject(err);
        });
    }

    private _getTokenString(token: AuthenticationResult) {
        return token ? `${token.tokenType} ${token.accessToken}` : '';
    }

    private _getScopes(targetApp: string): string[] {
        if (!targetApp) {
            return ['https://management.azure.com/.default'];
        }
        if (targetApp.endsWith('/.default')) {
            return [targetApp];
        }
        const cleanApp = targetApp.endsWith('/') ? targetApp.slice(0, -1) : targetApp;
        return [`${cleanApp}/.default`];
    }

    // #endregion
}
