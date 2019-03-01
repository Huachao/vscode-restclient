'use strict';

import { TextDocument } from 'vscode';
import * as Constants from '../../common/constants';
import { ResolveErrorMessage, ResolveResult, ResolveState, ResolveWarningMessage } from '../../models/httpVariableResolveResult';
import { RequestVariableCacheKey } from '../../models/requestVariableCacheKey';
import { VariableType } from '../../models/variableType';
import { calculateMD5Hash } from '../misc';
import { RequestVariableCache } from '../requestVariableCache';
import { RequestVariableCacheValueProcessor } from '../requestVariableCacheValueProcessor';
import { HttpVariableProvider, HttpVariableValue } from './httpVariableProvider';

export class RequestVariableProvider implements HttpVariableProvider {
    private static _instance: RequestVariableProvider;

    public static get Instance(): RequestVariableProvider {
        if (!RequestVariableProvider._instance) {
            RequestVariableProvider._instance = new RequestVariableProvider();
        }

        return RequestVariableProvider._instance;
    }

    private readonly cache = new Map<string, string[]>();

    private readonly fileMD5Hash = new Map<string, string>();

    private constructor() {
    }

    public readonly type: VariableType = VariableType.Request;

    public async has(document: TextDocument, name: string): Promise<boolean> {
        const [variableName] = name.trim().split('.');
        const variables = this.getRequestVariables(document);
        return variables.includes(variableName);
    }

    public async get(document: TextDocument, name: string): Promise<HttpVariableValue> {
        const [variableName] = name.trim().split('.');
        const variables = this.getRequestVariables(document);
        if (!variables.includes(variableName)) {
            return { name: variableName, error: ResolveErrorMessage.RequestVariableNotExist };
        }
        const value = RequestVariableCache.get(new RequestVariableCacheKey(variableName, document.uri.toString()));
        if (value === undefined) {
            return { name: variableName , warning: ResolveWarningMessage.RequestVariableNotSent };
        }

        const resolveResult = RequestVariableCacheValueProcessor.resolveRequestVariable(value, name);
        return this.convertToHttpVariable(variableName, resolveResult);
    }

    public async getAll(document: TextDocument): Promise<HttpVariableValue[]> {
        const variables = this.getRequestVariables(document);
        return variables.map(v => ({ name: v, value: RequestVariableCache.get(new RequestVariableCacheKey(v, document.uri.toString())) }));
    }

    private getRequestVariables(document: TextDocument): string[] {
        const file = document.uri.toString();
        const fileContent = document.getText();
        const fileHash = calculateMD5Hash(fileContent);
        if (!this.cache.has(file) || fileHash !== this.fileMD5Hash.get(file)) {
            const requestVariableReferenceRegex = new RegExp(Constants.RequestVariableDefinitionWithNameRegexFactory('\\w+'), 'mg');

            const variableNames = new Set<string>();
            let match: RegExpExecArray;
            while (match = requestVariableReferenceRegex.exec(fileContent)) {
                const name = match[1];
                variableNames.add(name);
            }
            this.cache.set(file, [...variableNames]);
            this.fileMD5Hash.set(file, fileHash);
        }

        return this.cache.get(file);
    }

    private convertToHttpVariable(name: string, result: ResolveResult): HttpVariableValue {
        if (result.state === ResolveState.Success) {
            return { name, value: result.value };
        } else if (result.state === ResolveState.Warning) {
            return { name, value: result.value, warning: result.message };
        } else {
            return { name, error: result.message };
        }
    }
}
