'use strict';
import { VariableType } from "./models/variableType"
import { HttpResponse } from "./models/httpResponse"

import { window, TextDocument } from 'vscode';
import { EnvironmentController } from './controllers/environmentController';
import * as Constants from "./constants"
import { Func } from './common/delegates';
import * as moment from "moment"
import { ResponseCache } from "./responseCache";
import { HttpResponseCacheKey } from "./models/httpResponseCacheKey";
import { ResponseProcessor } from "./responseProcessor";
const uuid = require('node-uuid');

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

        let responseVariables = VariableProcessor.getResponseVariablesInCurrentFile();
        for (let [variableName, response] of responseVariables) {
            let regex = new RegExp(`\\{\\{\\s*${variableName}.*\\s*\\}\\}`, 'g');
            let matches = request.match(regex);
            if (matches && matches.length > 0) {
                for (var i = 0; i < matches.length; i++) {
                    var responseVar = matches[i].replace('{{', '').replace('}}', '');
                    try {
                        const value = ResponseProcessor.getValueAtPath(response, responseVar);
                        request = request.replace(new RegExp(`\\{\\{\\s*${responseVar}\\s*\\}\\}`, 'g'), value.toString());
                    } catch {
                        window.showWarningMessage(`Could not merge in response variable. Is ${responseVar} the correct path?`)
                    }
                }   
            }
        }

        return request;
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
        let editor = window.activeTextEditor;
        if (!editor || !editor.document) {
            return new Map<string, string>();
        }

        return VariableProcessor.getCustomVariablesInFile(editor.document);
    }

    public static getCustomVariablesInFile(document: TextDocument): Map<string, string> {
        let variables = new Map<string, string>();

        let text = document.getText();
        let lines: string[] = text.split(/\r?\n/g);
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

    public static getResponseVariablesInCurrentFile(): Map<string, HttpResponse> {
        let editor = window.activeTextEditor;
        if (!editor || !editor.document) {
            return  new Map<string, HttpResponse>();
        }

        return VariableProcessor.getResponseVariablesInFile(editor.document);
    }

    public static getResponseVariablesInFile(document: TextDocument): Map<string, HttpResponse> {
        let variables = new Map<string, HttpResponse>();

        let text = document.getText();
        let lines: string[] = text.split(/\r?\n/g);
        let documentUri = document.uri.toString();
        lines.forEach(line => {
            let match: RegExpExecArray;
            if (match = Constants.ResponseVariableDefinitionRegex.exec(line)) {
                let key = match[1];
                const response = ResponseCache.get(new HttpResponseCacheKey(key, documentUri));
                if (response) {
                    variables.set(key, response);
                }
            }
        });

        return variables;
    }

    public static async checkVariableDefinitionExists(document: TextDocument, variableNames: string[]): Promise<{ name: string, exists: boolean }[]> {
        let definitions = await VariableProcessor.getVariableDefinitionsInFile(document);

        return variableNames.map((name) => 
            ({name, exists: definitions.has(name)})
        );
    }

    public static async getVariableDefinitionsInFile(document: TextDocument): Promise<Map<string, VariableType[]>> {
        let fileVariables = VariableProcessor.getCustomVariablesInFile(document);
        let environmentVariables = await EnvironmentController.getCustomVariables();
        let responseVariables = VariableProcessor.getResponseVariablesInFile(document);

        let variableDefinitions = new Map<string, VariableType[]>();
        fileVariables.forEach((val, key) => {
            variableDefinitions.set(key, [ VariableType.Custom ]);
        });

        environmentVariables.forEach((val, key) => {
            if (variableDefinitions.has(key)) {
                let types = variableDefinitions.get(key);
                types.push(VariableType.Environment);
                variableDefinitions.set(key, types);
            } else {
                variableDefinitions.set(key, [ VariableType.Environment ]);
            }
        });

        responseVariables.forEach((val, key) => {
            if (variableDefinitions.has(key)) {
                let types = variableDefinitions.get(key);
                types.push(VariableType.Response);
                variableDefinitions.set(key, types);
            } else {
                variableDefinitions.set(key, [ VariableType.Response ]);
            }
        });

        return variableDefinitions;
    }
}