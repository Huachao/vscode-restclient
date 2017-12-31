'use strict';

import { commands, Uri, window } from 'vscode';
import { EnvironmentController } from './controllers/environmentController';
import * as Constants from './constants';
import { Func } from './common/delegates';
import * as moment from 'moment';
const uuid = require('node-uuid');
const adal = require('adal-node');
const copyPaste = require('copy-paste');

const aadRegexPattern = `\\{\\{\\s*\\${Constants.AzureActiveDirectoryVariableName}(\\s+(${Constants.AzureActiveDirectoryForceNewOption}))?(\\s*|\\s+([^\\.]+\\.[^\\}\\s]+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))\\}\\}`;
const aadTokenCache = {};

// see UserCodeInfo at https://github.com/AzureAD/azure-activedirectory-library-for-nodejs/blob/dev/lib/adal.d.ts
interface SignInCode {
    deviceCode: string;
    expiresIn: number;
    interval: number;
    message: string;
    userCode: string;
    verificationUrl: string;
    error?: any;
    errorDescription?: any;
    [x: string]: any;
}

// see TokenResponse at https://github.com/AzureAD/azure-activedirectory-library-for-nodejs/blob/dev/lib/adal.d.ts
interface SignInToken {
    tokenType: string;
    expiresIn: number;
    expiresOn: Date | string;
    resource: string;
    accessToken: string;
    refreshToken?: string;
    createdOn?: Date | string;
    userId?: string;
    isUserIdDisplayable?: boolean;
    tenantId?: string;
    oid?: string;
    givenName?: string;
    familyName?: string;
    identityProvider?: string;
    error?: any;
    errorDescription?: any;
    [x: string]: any;
}

export class VariableProcessor {

    private static readonly escapee: Map<string, string> = new Map<string, string>([
        ['n', '\n'],
        ['r', '\r'],
        ['t', '\t']
    ]);

    public static async processRawRequest(request: string) {
        let globalVariables = VariableProcessor.getGlobalVariables();
        for (let variablePattern in globalVariables) {
            let regex = new RegExp(`\\{\\{\\s*${variablePattern}\\s*\\}\\}`, 'g');
            if (regex.test(request)) {
                request = request.replace(regex, globalVariables[variablePattern]);
            }
        }

        // special-casing AAD token since it's the only variable that requires a promise
        let aadRegex = new RegExp(aadRegexPattern, 'g');
        if (aadRegex.test(request)) {
            request = request.replace(aadRegex, await VariableProcessor.getAadToken(request));
        }

        let fileVariables = VariableProcessor.getCustomVariablesInCurrentFile();
        for (let [variableName, variableValue] of fileVariables) {
            let regex = new RegExp(`\\{\\{\\s*${variableName}\\s*\\}\\}`, 'g');
            if (regex.test(request)) {
                request = request.replace(regex, variableValue);
            }
        }

        let environmentVariables = await EnvironmentController.getCustomVariables();
        for (let [variableName, variableValue] of environmentVariables) {
            let regex = new RegExp(`\\{\\{\\s*${variableName}\\s*\\}\\}`, 'g');
            if (regex.test(request)) {
                request = request.replace(regex, variableValue);
            }
        }

        return request;
    }

    public static async getAadToken(url: string): Promise<string> {
        // get target app from URL
        const targetApp = (new RegExp('^[^\\s]+\\s+([^:]*:///?[^/]*/)').exec(url) || [url])[1];

        // get the target cloud sign-in URL
        const tld = targetApp.substring(targetApp.lastIndexOf(".") + 1, targetApp.length - 1);
        const endpoint = Constants.AzureActiveDirectorySignInUrls[tld] || Constants.AzureActiveDirectorySignInUrls.public;

        // parse input options ([new] [domain|tenantId])
        let tenantId = "common";
        let forceNewToken = false;
        const groups = new RegExp(aadRegexPattern).exec(url);
        if (groups) {
            forceNewToken = (groups.length > 2 && groups[2] == Constants.AzureActiveDirectoryForceNewOption);
            if (groups.length > 4 && groups[4]) {
                tenantId = groups[4];
            }
        }

        const signInUrl = `${endpoint}${tenantId}`;
        const authContext: any = new adal.AuthenticationContext(signInUrl);

        const clientId = Constants.AzureActiveDirectoryClientId;
        const messageBoxOptions = { modal: true };
        
        const promise = new Promise<string>((resolve, reject) => {
            // use previous token, if one has been obtained and hasn't expired
            const cachedToken = !forceNewToken && aadTokenCache[tenantId];
            if (cachedToken && cachedToken.expiry > new Date()) {
                return resolve(cachedToken.token);
            }

            authContext.acquireUserCode(targetApp, clientId, "en-US", (codeError: Error, codeResponse: SignInCode) => {
                if (codeError) {
                    window.showErrorMessage(`Sign in failed. Please try again.\r\n\r\nStage: acquireUserCode\r\n\r\n${codeError.message}`, messageBoxOptions);
                    return reject(codeError);
                }

                const prompt1 = `Sign in to Azure AD with the following code (will be copied to the clipboard) to add a token to your request.\r\n\r\nCode: ${codeResponse.userCode}`;
                const prompt2 = `Azure AD verification page opened in default browser. Paste code to complete sign in (already copied to the clipboard) and confirm when done. Token will be copied to the clipboard when done.\r\n\r\nCode: ${codeResponse.userCode}`;
                const signIn = "Sign in";
                const tryAgain = "Try again";
                const done = "Done";
                const signInPrompt = value => {
                    if (value == signIn || value == tryAgain) {
                        copyPaste.copy(codeResponse.userCode);
                        commands.executeCommand('vscode.open', Uri.parse(codeResponse.verificationUrl));
                        window.showInformationMessage(prompt2, messageBoxOptions, done, tryAgain).then(signInPrompt);
                    } else if (value == done) {
                        authContext.acquireTokenWithDeviceCode(targetApp, clientId, codeResponse, (tokenError: Error, tokenResponse: SignInToken) => {
                            if (tokenError) {
                                window.showErrorMessage(`Sign in failed. Please try again.\r\n\r\nStage: acquireTokenWithDeviceCode\r\n\r\n${tokenError.message}`, messageBoxOptions);
                                return reject(tokenError);
                            }
                            
                            const token = tokenResponse ? `${tokenResponse.tokenType} ${tokenResponse.accessToken}` : null;
                            
                            // save token using both specified and resulting domain/tenantId to cover more reuse scenarios
                            aadTokenCache[tenantId] = aadTokenCache[tokenResponse.tenantId] = { token: token, expiry: tokenResponse.expiresOn };
                            
                            // only copy the token to the clipboard if it's the first use (since we tell them we're doing it)
                            copyPaste.copy(token);
                            resolve(token);
                        });
                    } else {
                        return reject("Cancelled");
                    }
                };
                window.showInformationMessage(prompt1, messageBoxOptions, signIn).then(signInPrompt);
            });
        });
        
        promise.catch(error => {
            console.error(error);
        });
        
        return promise;
    }

    public static getGlobalVariables(): { [key: string]: Func<string, string> } {
        return {
            [`\\${Constants.TimeStampVariableName}(?:\\s(\\-?\\d+)\\s(y|Q|M|w|d|h|m|s|ms))?`]: match => {
                let regex = new RegExp(`\\${Constants.TimeStampVariableName}(?:\\s(\\-?\\d+)\\s(y|Q|M|w|d|h|m|s|ms))?`);
                let groups = regex.exec(match);
                if (groups !== null && groups.length === 3) {
                    return groups[1] && groups[2]
                        ? moment.utc().add(Number(groups[1]), <moment.DurationInputArg2>groups[2]).unix()
                        : moment.utc().unix();
                }
                return match;
            },
            [`\\${Constants.GuidVariableName}`]: match => uuid.v4(),
            [`\\${Constants.RandomInt}\\s(\\-?\\d+)\\s(\\-?\\d+)`]: match => {
                let regex = new RegExp(`\\${Constants.RandomInt}\\s(\\-?\\d+)\\s(\\-?\\d+)`);
                let groups = regex.exec(match);
                if (groups !== null) {
                    let min = Number(groups[1]);
                    let max = Number(groups[2]);
                    if (min < max) {
                        min = Math.ceil(min);
                        max = Math.floor(max);
                        return Math.floor(Math.random() * (max - min)) + min;
                    }
                }
                return match;
            }
        };
    }

    public static getCustomVariablesInCurrentFile(): Map<string, string> {
        let variables = new Map<string, string>();
        let editor = window.activeTextEditor;
        if (!editor || !editor.document) {
            return variables;
        }

        let document = editor.document.getText();
        let lines: string[] = document.split(/\r?\n/g);
        lines.forEach(line => {
            let match: RegExpExecArray;
            if (match = Constants.VariableDefinitionRegex.exec(line)) {
                let key = match[1];
                let originalValue = match[2];
                let value = '';
                let isPrevCharEscape = false;
                for (let index = 0; index < originalValue.length; index++) {
                    let currentChar = originalValue[index];
                    if (isPrevCharEscape) {
                        isPrevCharEscape = false;
                        value += this.escapee.get(currentChar) || currentChar;
                    } else {
                        if (currentChar === '\\') {
                            isPrevCharEscape = true;
                            continue;
                        }
                        value += currentChar;
                    }
                }
                variables.set(key, value);
            }
        });

        return variables;
    }
}