'use strict';

import { TextDocument } from 'vscode';
import * as Constants from "../../common/constants";
import { ResolveErrorMessage } from '../../models/httpVariableResolveResult';
import { VariableType } from '../../models/variableType';
import { HttpVariableProvider, HttpVariableValue } from './httpVariableProvider';
import { RequestVariableProvider } from './requestVariableProvider';

export class FileVariableProvider implements HttpVariableProvider {
    private static _instance: FileVariableProvider;

    public static get Instance(): FileVariableProvider {
        if (!FileVariableProvider._instance) {
            FileVariableProvider._instance = new FileVariableProvider();
        }

        return FileVariableProvider._instance;
    }

    private readonly escapee: Map<string, string> = new Map<string, string>([
        ['n', '\n'],
        ['r', '\r'],
        ['t', '\t']
    ]);

    private readonly innerVariableProviders: HttpVariableProvider[] = [
        RequestVariableProvider.Instance,
    ];

    private constructor() {
    }

    public readonly type: VariableType = VariableType.File;

    public async has(document: TextDocument, name: string): Promise<boolean> {
        const variables = await this.getFileVariables(document);
        return variables.some(v => v.name === name);
    }

    public async get(document: TextDocument, name: string): Promise<HttpVariableValue> {
        const variables = await this.getFileVariables(document);
        const variable = variables.find(v => v.name === name);
        if (!variable) {
            return { name, error: ResolveErrorMessage.FileVariableNotExist };
        } else {
            return variable;
        }
    }

    public getAll(document: TextDocument): Promise<HttpVariableValue[]> {
        return this.getFileVariables(document);
    }

    private async getFileVariables(document: TextDocument): Promise<HttpVariableValue[]> {
        const fileContent = document.getText();
        const variables: HttpVariableValue[] = [];

        const regex = new RegExp(Constants.FileVariableDefinitionRegex, 'mg');

        let match: RegExpExecArray;
        while (match = regex.exec(fileContent)) {
            const key = match[1];
            const originalValue = await (this.processFileVariableValue(document, match[2]));
            let value = "";
            let isPrevCharEscape = false;
            for (const currentChar of originalValue) {
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
            variables.push({ name: key, value });
        }

        return variables;
    }

    private async processFileVariableValue(document: TextDocument, value: string): Promise<string> {
        const variableRefercenceRegex = /\{{2}(.+?)\}{2}/g;
        let result = '';
        let match: RegExpExecArray;
        let lastIndex = 0;
        variable:
        while (match = variableRefercenceRegex.exec(value)) {
            result += value.substring(lastIndex, match.index);
            lastIndex = variableRefercenceRegex.lastIndex;
            const name = match[1].trim();
            const context = { rawRequest: value, parsedRequest: result };
            for (const provider of this.innerVariableProviders) {
                if (await provider.has(document, name, context)) {
                    const { value, error, warning } = await provider.get(document, name, context);
                    if (!error && !warning) {
                        result += value;
                        continue variable;
                    } else {
                        break;
                    }
                }
            }

            result += `{{${name}}}`;
        }
        result += value.substring(lastIndex);
        return result;
    }
}