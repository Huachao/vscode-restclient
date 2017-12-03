'use strict';

import { window } from 'vscode';
import { EnvironmentController } from './controllers/environmentController';
import * as Constants from './constants';
import { Func } from './common/delegates';
import * as moment from 'moment';
import { HttpResponse } from './models/httpResponse';
import { ResponseStore } from './responseStore';
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

        let responseVariables = VariableProcessor.getResponseVariables();
        for (let [variableName, response] of responseVariables) {
            let regex = new RegExp(`\\{\\{\\s*${variableName}.*\\s*\\}\\}`, 'g');
            let matches = request.match(regex);
            if (matches && matches.length > 0) {
                for (var i = 0; i < matches.length; i++) {
                    var responseVar = matches[i].replace('{{', '').replace('}}', '');
                    var parts = responseVar.split('.');
                    let value = response;
                    for (var j = 1; j < parts.length; j++) {
                        const part = parts[j];
                        if (part === "body") {
                            value = JSON.parse(value[part]);                            
                        } else {
                            value = value[part];   
                        }
                    }
                    request = request.replace(new RegExp(`\\{\\{\\s*${responseVar}\\s*\\}\\}`, 'g'), value.toString());
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

    public static getResponseVariables(): Map<string, HttpResponse> {
        return ResponseStore.VariableCache;
    }
}