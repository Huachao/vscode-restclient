'use strict';

import * as adal from 'adal-node';
import { commands, QuickPickItem, QuickPickOptions, TextDocument, Uri, window } from 'vscode';
import * as Constants from '../../common/constants';
import { HttpRequest } from '../../models/httpRequest';
import { ResolveErrorMessage } from '../../models/httpVariableResolveResult';
import { VariableType } from '../../models/variableType';
import { AadTokenCache } from '../aadTokenCache';
import { HttpClient } from '../httpClient';
import { HttpVariableContext, HttpVariableProvider, HttpVariableValue } from './httpVariableProvider';

const clipboardy = require('clipboardy');

export class AadTokenVariableProvider implements HttpVariableProvider {

    private readonly aadRegex: RegExp = new RegExp(`\\s*\\${Constants.AzureActiveDirectoryVariableName}(\\s+(${Constants.AzureActiveDirectoryForceNewOption}))?(\\s+(ppe|public|cn|de|us))?(\\s+(([^\\.|!aud)])\\.[^\\}\\s]+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?(\\s+aud:([^\\.\\s]+\\.[^\\}\\s]+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?(\\s+clientid:([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?(\\s+username:([^\\@]+@[^\\.]+\\.[^\\}\\s]+))?(\\s+password:([^\\.]+[^\\}\\s]+))?`);

    private readonly requestUrlRegex: RegExp = /^(?:[^\s]+\s+)([^:]*:\/\/\/?[^/\s]*\/?)/;

    private static _instance: AadTokenVariableProvider;

    public static get Instance(): AadTokenVariableProvider {
        if (!AadTokenVariableProvider._instance) {
            AadTokenVariableProvider._instance = new AadTokenVariableProvider();
        }

        return AadTokenVariableProvider._instance;
    }

    public readonly type: VariableType = VariableType.System;

    public async has(document: TextDocument, name: string, context: HttpVariableContext): Promise<boolean> {
        const [variableName] = name.split(' ').filter(Boolean);
        return Constants.AzureActiveDirectoryVariableName === variableName;
    }

    public async get(document: TextDocument, name: string, context: HttpVariableContext): Promise<HttpVariableValue> {
        if (!this.has(document, name, context)) {
            const [variableName] = name.split(' ').filter(Boolean);
            return { name: variableName, error: ResolveErrorMessage.SystemVariableNotExist };
        }

        return await this.resolveTokenInt(name, context);
    }

    public async getAll(document: TextDocument, context: HttpVariableContext): Promise<HttpVariableValue[]> {
        return [{name: Constants.AzureActiveDirectoryVariableName}];
    }

    private resolveTokenInt(command: string, context: HttpVariableContext): Promise<HttpVariableValue> {
        // get target app from URL
        const match = this.requestUrlRegex.exec(context.parsedRequest);
        const url = (match && match[1]) || context.parsedRequest;

        let { cloud, targetApp } = this.getCloudProvider(url);

        // parse input options -- [new] [public|cn|de|us|ppe] [<domain|tenantId>] [aud:<domain|tenantId>] [clientid:<clientId>] [username:<username> password:<password>]
        let tenantId = Constants.AzureActiveDirectoryDefaultTenantId;
        let clientId = Constants.AzureActiveDirectoryClientId;
        let username = null;
        let password = null;
        let forceNewToken = false;
        const groups = this.aadRegex.exec(command);
        if (groups) {
            forceNewToken = groups[2] === Constants.AzureActiveDirectoryForceNewOption;
            cloud = groups[4] || cloud;
            tenantId = groups[6] || tenantId;
            targetApp = groups[8] || targetApp;
            clientId = groups[11] || clientId;
            username = groups[13] || username;
            password = groups[15] || password;
        }

        // verify cloud (default to public)
        cloud = cloud in Constants.AzureClouds ? cloud : 'public';

        const endpoint = Constants.AzureClouds[cloud].aad;
        const signInUrl = `${endpoint}${tenantId}`;
        const authContext = new adal.AuthenticationContext(signInUrl);

        return new Promise((resolve, reject) => {
            const resolveToken = (token: adal.TokenResponse, cache: boolean = true, copy?: boolean) => {
                if (cache) {
                    // save token using both specified and resulting domain/tenantId to cover more reuse scenarios
                    AadTokenCache.set(`${cloud}:${token.tenantId}:${clientId}:${username}`, token);
                    AadTokenCache.set(`${cloud}:${tenantId}:${clientId}:${username}`, token);
                }

                const tokenString = token ? `${token.tokenType} ${token.accessToken}` : null;
                if (copy && tokenString) {
                    // only copy the token to the clipboard if it's the first use (since we tell them we're doing it)
                    clipboardy.writeSync(tokenString);
                }

                resolve({ name: Constants.AzureActiveDirectoryVariableName, value: tokenString });
            };

            const acquireToken = () => {
                if (username !== null && password !== null) {
                    this._acquireTokenWithUsernamePassword(resolveToken, reject, authContext, cloud, tenantId, targetApp, clientId, username, password);
                } else {
                    this._acquireTokenWithUserCode(resolveToken, reject, authContext, cloud, tenantId, targetApp, clientId);
                }
            };

            // use previous token, if one has been obtained for the directory
            const cachedToken = !forceNewToken && AadTokenCache.get(`${cloud}:${tenantId}:${clientId}:${username}`);
            if (cachedToken) {
                // if token expired, try to refresh; otherwise, use cached token
                if (cachedToken.expiresOn <= new Date()) {
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
    }

    private getCloudProvider(endpoint: string): { cloud: string, targetApp: string } {
        for (const c in Constants.AzureClouds) {
            let { aad, arm, armAudience } = Constants.AzureClouds[c];
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

    private _signInFailed(stage: string, message: string) {
        window.showErrorMessage(`Sign in failed. Please try again.\r\n\r\nStage: ${stage}\r\n\r\n${message}`, { modal: true });
    }

    private _acquireTokenWithUsernamePassword(
        resolve: (value?: adal.TokenResponse | PromiseLike<adal.TokenResponse>, cache?: boolean, copy?: boolean) => void,
        reject: (reason?: any) => void,
        authContext: adal.AuthenticationContext,
        cloud: string,
        tenantId: string,
        targetApp: string,
        clientId: string,
        username: string,
        password: string
    ) {
        authContext.acquireTokenWithUsernamePassword(targetApp, username, password, clientId, (codeError: Error, response: adal.TokenResponse | adal.ErrorResponse) => {
            if (codeError) {
                if (response && response.error === "interaction_required") {
                    const mfaRequiredString = `Signing in require multi factor authentication. You have to use different method of authentication.`;
                    const acquireWithCode = () => this._acquireTokenWithUserCode(resolve, reject, authContext, cloud, tenantId, targetApp, clientId);
                    window.showErrorMessage(mfaRequiredString, { modal: true }, "Sign In", "Cancel").then(acquireWithCode);
                    return;
                }
                this._signInFailed("acquireTokenWithUsernamePassword", codeError.message);
                return reject(codeError);
            }

            return resolve(<adal.TokenResponse>response, true, true);
        });
    }

    private _acquireTokenWithUserCode(
        resolve: (value?: adal.TokenResponse | PromiseLike<adal.TokenResponse>, cache?: boolean, copy?: boolean) => void,
        reject: (reason?: any) => void,
        authContext: adal.AuthenticationContext,
        cloud: string,
        tenantId: string,
        targetApp: string,
        clientId: string
    ) {
        authContext.acquireUserCode(targetApp, clientId, "en-US", (codeError: Error, codeResponse: adal.UserCodeInfo) => {
            if (codeError) {
                this._signInFailed("acquireUserCode", codeError.message);
                return reject(codeError);
            }

            const prompt1 = `Sign in to Azure AD with the following code (will be copied to the clipboard) to add a token to your request.\r\n\r\nCode: ${codeResponse.userCode}`;
            const prompt2 = `1. Azure AD verification page opened in default browser (you may need to switch apps)\r\n2. Paste code to sign in and authorize VS Code (already copied to the clipboard)\r\n3. Confirm when done\r\n4. Token will be copied to the clipboard when finished\r\n\r\nCode: ${codeResponse.userCode}`;
            const signIn = "Sign in";
            const tryAgain = "Try again";
            const done = "Done";
            const signInPrompt = value => {
                if (value === signIn || value === tryAgain) {
                    clipboardy.writeSync(codeResponse.userCode);
                    commands.executeCommand("vscode.open", Uri.parse(codeResponse.verificationUrl));
                    window.showInformationMessage(prompt2, { modal: true }, done, tryAgain).then(signInPrompt);
                } else if (value === done) {
                    authContext.acquireTokenWithDeviceCode(targetApp, clientId, codeResponse, (tokenError: Error, tokenResponse: adal.TokenResponse) => {
                        if (tokenError) {
                            this._signInFailed("acquireTokenWithDeviceCode", tokenError.message);
                            return reject(tokenError);
                        }

                        // if no directory chosen, pick one (otherwise, the token is likely useless :P)
                        if (tenantId === Constants.AzureActiveDirectoryDefaultTenantId) {
                            const client = new HttpClient();
                            const request = new HttpRequest(
                                "GET", `${Constants.AzureClouds[cloud].arm}/tenants?api-version=2017-08-01`,
                                { Authorization: this._getTokenString(tokenResponse) }, null, null);
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
                                            let bestMatches = [];
                                            const bestMatchesRegex = new RegExp(`(^${displayNameFirstWord}\.com$)|(^${displayNameFirstWord}\.[a-z]+(?:\.[a-z]+)?$)|(^${displayNameFirstWord}[a-z]+\.com$)|(^${displayNameFirstWord}[^:]*$)|(^[^:]*${displayNameFirstWord}[^:]*$)`, "gi");
                                            const bestMatchesRegexGroups = bestMatchesRegex.source.match(new RegExp(`${displayNameFirstWord}`, "g")).length;
                                            for (let d of element.domains) {
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
                                            domain = bestMatches.find(m => m) || domain;
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
                                let result = directories.length && directories[0];

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
                                }

                                // if directory selected, sign in to that directory; otherwise, stick with the default
                                if (result) {
                                    const newDirAuthContext = new adal.AuthenticationContext(`${Constants.AzureClouds[cloud].aad}${result.description}`);
                                    newDirAuthContext.acquireTokenWithRefreshToken(tokenResponse.refreshToken, clientId, null, (newDirError: Error, newDirResponse: adal.TokenResponse) => {
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
            window.showInformationMessage(prompt1, { modal: true }, signIn).then(signInPrompt);
        });
    }

    private _getTokenString(token: adal.TokenResponse) {
        return token ? `${token.tokenType} ${token.accessToken}` : null;
    }
}