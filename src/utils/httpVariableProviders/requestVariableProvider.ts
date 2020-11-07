import { TextDocument } from 'vscode';
import * as Constants from '../../common/constants';
import { RestClientSettings } from '../../models/configurationSettings';
import { DocumentCache } from '../../models/documentCache';
import { ResolveErrorMessage, ResolveResult, ResolveState, ResolveWarningMessage } from '../../models/httpVariableResolveResult';
import { VariableType } from '../../models/variableType';
import { RequestVariableCache } from '../requestVariableCache';
import { RequestVariableCacheValueProcessor } from '../requestVariableCacheValueProcessor';
import { HttpVariable, HttpVariableProvider } from './httpVariableProvider';

export class RequestVariableProvider implements HttpVariableProvider {
    private static _instance: RequestVariableProvider;

    private readonly _settings: RestClientSettings = RestClientSettings.Instance;

    public static get Instance(): RequestVariableProvider {
        if (!this._instance) {
            this._instance = new RequestVariableProvider();
        }

        return this._instance;
    }

    private readonly requestVariableCache = new DocumentCache<string[]>();

    private constructor() {
    }

    public readonly type: VariableType = VariableType.Request;

    public async has(name: string, document: TextDocument): Promise<boolean> {
        const [variableName] = name.trim().split('.');
        const variables = this.getRequestVariables(document);
        return variables.includes(variableName);
    }

    public async get(name: string, document: TextDocument): Promise<HttpVariable> {
        const [variableName] = name.trim().split('.');
        const variables = this.getRequestVariables(document);
        if (!variables.includes(variableName)) {
            return { name: variableName, error: ResolveErrorMessage.RequestVariableNotExist };
        }
        const value = RequestVariableCache.get(document, variableName);
        if (value === undefined) {
            return { name: variableName, warning: ResolveWarningMessage.RequestVariableNotSent };
        }

        const resolveResult = RequestVariableCacheValueProcessor.resolveRequestVariable(value, name);
        return this.convertToHttpVariable(variableName, resolveResult);
    }

    public async getAll(document: TextDocument): Promise<HttpVariable[]> {
        const variables = this.getRequestVariables(document);
        return variables.map(v => ({ name: v, value: RequestVariableCache.get(document, v) }));
    }

    private getRequestVariables(document: TextDocument): string[] {
        const requestVariableScope = this._settings.requestVariableScope;

        if (this.requestVariableCache.has(document)) {
            return this.requestVariableCache.get(
                requestVariableScope === 'global'
                    ? { uri: 'sharedRequestVariables', version: 1 } as any
                    : document)!;
        }

        const fileContent = document.getText();
        const requestVariableReferenceRegex = new RegExp(Constants.RequestVariableDefinitionWithNameRegexFactory('\\w+'), 'mg');

        const variableNames = new Set<string>();
        let match: RegExpExecArray | null;
        while (match = requestVariableReferenceRegex.exec(fileContent)) {
            const name = match[1];
            variableNames.add(name);
        }

        const values = [...variableNames];
        this.requestVariableCache.set(document, values);

        if (requestVariableScope === 'global') {
            const previousValues = this.requestVariableCache.get({ uri: 'sharedRequestVariables', version: 1 } as any) ?? [];
            const mergedValues = [...previousValues, ...values];
            this.requestVariableCache.set({ uri: 'sharedRequestVariables', version: 1 } as any, mergedValues);
            return mergedValues;
        }

        return values;
    }

    private convertToHttpVariable(name: string, result: ResolveResult): HttpVariable {
        if (result.state === ResolveState.Success) {
            return { name, value: result.value };
        } else if (result.state === ResolveState.Warning) {
            return { name, value: result.value, warning: result.message };
        } else {
            return { name, error: result.message };
        }
    }
}
