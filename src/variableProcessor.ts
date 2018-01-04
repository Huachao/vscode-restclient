'use strict';

import { commands, Uri, window } from 'vscode';
import { EnvironmentController } from './controllers/environmentController';
import * as Constants from './constants';
import { Func } from './common/delegates';
import * as adal from 'adal-node';
import * as moment from 'moment';
const copyPaste = require('copy-paste');
const uuid = require('node-uuid');

const aadRegexPattern = `\\{\\{\\s*\\${Constants.AzureActiveDirectoryVariableName}(\\s+(${Constants.AzureActiveDirectoryForceNewOption}))?(\\s+(ppe|public|cn|de|us))?(\\s+([^\\.]+\\.[^\\}\\s]+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?\\s*\\}\\}`;
const aadTokenCache = {};

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

        // any vars that make decisions on the URL (request var) must be last so all vars have been evaluated
        let aadRegex = new RegExp(aadRegexPattern, 'g');
        if (aadRegex.test(request)) {
            request = request.replace(aadRegex, await VariableProcessor.getAadToken(request));
        }

        return request;
    }

    public static async clearAadTokenCache() {
        for (let key in aadTokenCache) {
            delete aadTokenCache[key];
        }
    }

    public static async getAadToken(url: string): Promise<string> {
        // get target app from URL
        let targetApp = (new RegExp("^[^\\s]+\\s+([^:]*:///?[^/]*/)").exec(url) || [url])[1] || "";

        // detect known cloud URLs + fix audiences
        let defaultCloud = null;
        let cloud = null;
        for (let c in Constants.AzureClouds) {
            // set first cloud to be default
            if (!defaultCloud) { defaultCloud = c; }

            let found = false;
            for (let api in Constants.AzureClouds[c]) {
                if (api.endsWith("Audience")) { continue; }
                if (targetApp === Constants.AzureClouds[c][api]) {
                    cloud = c;
                    targetApp = Constants.AzureClouds[c][api + "Audience"] || targetApp;
                    found = true;
                    break;
                }
            }
            if (found) { break; }
        }

        // fall back to URL TLD
        if (cloud === null) {
            cloud = targetApp.substring(targetApp.lastIndexOf(".") + 1, targetApp.length - 1);
        }

        // parse input options -- [new] [public|cn|de|us|ppe] [<domain|tenantId>]
        let tenantId = "common";
        let forceNewToken = false;
        const groups = new RegExp(aadRegexPattern).exec(url);
        if (groups) {
            forceNewToken = groups[2] === Constants.AzureActiveDirectoryForceNewOption;
            cloud = groups[4] || cloud;
            tenantId = groups[6] || tenantId;
        }

        // verify cloud (default to public)
        cloud = Constants.AzureClouds[cloud] ? cloud : defaultCloud;

        const endpoint = Constants.AzureClouds[cloud].aad;
        const signInUrl = `${endpoint}${tenantId}`;
        const authContext: any = new adal.AuthenticationContext(signInUrl);

        const clientId = Constants.AzureActiveDirectoryClientId;
        const messageBoxOptions = { modal: true };

        const promise = new Promise<string>((resolve, reject) => {
            // use previous token, if one has been obtained and hasn't expired
            const cachedToken = !forceNewToken && aadTokenCache[`${cloud}:${tenantId}`];
            if (cachedToken && cachedToken.expiry > new Date()) {
                return resolve(cachedToken.token);
            }

            authContext.acquireUserCode(targetApp, clientId, "en-US", (codeError: Error, codeResponse: adal.UserCodeInfo) => {
                if (codeError) {
                    window.showErrorMessage(`Sign in failed. Please try again.\r\n\r\nStage: acquireUserCode\r\n\r\n${codeError.message}`, messageBoxOptions);
                    return reject(codeError);
                }

                const prompt1 = `Sign in to Azure AD with the following code (will be copied to the clipboard) to add a token to your request.\r\n\r\nCode: ${codeResponse.userCode}`;
                const prompt2 = `1. Azure AD verification page opened in default browser (you may need to switch apps)\r\n2. Paste code to sign in and authorize VS Code (already copied to the clipboard)\r\n3. Confirm when done\r\n4. Token will be copied to the clipboard when finished\r\n\r\nCode: ${codeResponse.userCode}`;
                const signIn = "Sign in";
                const tryAgain = "Try again";
                const done = "Done";
                const signInPrompt = value => {
                    if (value === signIn || value === tryAgain) {
                        copyPaste.copy(codeResponse.userCode);
                        commands.executeCommand("vscode.open", Uri.parse(codeResponse.verificationUrl));
                        window.showInformationMessage(prompt2, messageBoxOptions, done, tryAgain).then(signInPrompt);
                    } else if (value === done) {
                        authContext.acquireTokenWithDeviceCode(targetApp, clientId, codeResponse, (tokenError: Error, tokenResponse: adal.TokenResponse) => {
                            if (tokenError) {
                                window.showErrorMessage(`Sign in failed. Please try again.\r\n\r\nStage: acquireTokenWithDeviceCode\r\n\r\n${tokenError.message}`, messageBoxOptions);
                                return reject(tokenError);
                            }

                            const token = tokenResponse ? `${tokenResponse.tokenType} ${tokenResponse.accessToken}` : null;

                            // save token using both specified and resulting domain/tenantId to cover more reuse scenarios
                            aadTokenCache[`${cloud}:${tenantId}`] = aadTokenCache[`${cloud}:${tokenResponse.tenantId}`] = { token: token, expiry: tokenResponse.expiresOn };

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
                let value = "";
                let isPrevCharEscape = false;
                for (let index = 0; index < originalValue.length; index++) {
                    let currentChar = originalValue[index];
                    if (isPrevCharEscape) {
                        isPrevCharEscape = false;
                        value += this.escapee.get(currentChar) || currentChar;
                    } else {
                        if (currentChar === "\\") {
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