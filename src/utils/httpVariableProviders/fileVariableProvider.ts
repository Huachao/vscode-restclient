'use strict';

import { TextDocument } from 'vscode';
import * as Constants from "../../common/constants";
import { ResolveErrorMessage } from '../../models/httpVariableResolveResult';
import { VariableType } from '../../models/variableType';
import { calculateMD5Hash } from '../misc';
import { HttpVariableProvider, HttpVariableValue } from './httpVariableProvider';

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

    private readonly cache = new Map<string, HttpVariableValue[]>();

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
            return variable;
        }
    }

    public getAll(document: TextDocument): Promise<HttpVariableValue[]> {
        return this.getFileVariables(document);
    }

    private async getFileVariables(document: TextDocument): Promise<HttpVariableValue[]> {
        const file = document.uri.toString();
        const fileContent = document.getText();
        const fileHash = calculateMD5Hash(fileContent);
        if (!this.cache.has(file) || fileHash !== this.fileMD5Hash.get(file)) {
            const variables: HttpVariableValue[] = [];

            const regex = new RegExp(Constants.FileVariableDefinitionRegex, 'mg');

            let match: RegExpExecArray;
            while (match = regex.exec(fileContent)) {
                let key = match[1];
                let originalValue = match[2];
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

            this.cache.set(file, variables);
            this.fileMD5Hash.set(file, fileHash);
        }

        return this.cache.get(file);
    }
}