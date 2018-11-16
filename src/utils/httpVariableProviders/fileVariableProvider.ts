'use strict';

import { TextDocument } from 'vscode';
import * as Constants from '../../common/constants';
import { ResolveErrorMessage } from '../../models/httpVariableResolveResult';
import { VariableType } from '../../models/variableType';
import { calculateMD5Hash } from '../misc';
import { HttpVariableProvider, HttpVariableValue } from './httpVariableProvider';
import { RequestVariableProvider } from './requestVariableProvider';

type FileVariableValue = Record<'name' | 'value', string>;

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

    private readonly cache = new Map<string, FileVariableValue[]>();

    private readonly fileMD5Hash = new Map<string, string>();

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
            const value = await this.processFileVariableValue(document, variable.value);
            return { name, value };
        }
    }

    public async getAll(document: TextDocument): Promise<HttpVariableValue[]> {
        const variables = await this.getFileVariables(document);
        return await Promise.all(variables.map(
            async ({ name, value }) => {
                const parsedValue = await this.processFileVariableValue(document, value);
                return { name, value: parsedValue };
            }));
    }

    private async getFileVariables(document: TextDocument): Promise<FileVariableValue[]> {
        const file = document.uri.toString();
        const fileContent = document.getText();
        const fileHash = calculateMD5Hash(fileContent);
        if (!this.cache.has(file) || fileHash !== this.fileMD5Hash.get(file)) {
            const regex = new RegExp(Constants.FileVariableDefinitionRegex, 'mg');
            const variables = new Map<string, FileVariableValue>();
            let match: RegExpExecArray;
            while (match = regex.exec(fileContent)) {
                const [, key, originalValue] = match;
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
                variables.set(key, { name: key, value });
            }
            this.cache.set(file, [...variables.values()]);
            this.fileMD5Hash.set(file, fileHash);
        }

        return this.cache.get(file);
    }

    private async processFileVariableValue(document: TextDocument, value: string): Promise<string> {
        const variableReferenceRegex = /\{{2}(.+?)\}{2}/g;
        let result = '';
        let match: RegExpExecArray;
        let lastIndex = 0;
        variable:
        while (match = variableReferenceRegex.exec(value)) {
            result += value.substring(lastIndex, match.index);
            lastIndex = variableReferenceRegex.lastIndex;
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