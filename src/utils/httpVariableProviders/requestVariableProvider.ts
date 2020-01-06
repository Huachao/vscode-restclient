import * as Constants from '../../common/constants';
import { DocumentCache } from '../../models/documentCache';
import { ResolveErrorMessage, ResolveResult, ResolveState, ResolveWarningMessage } from '../../models/httpVariableResolveResult';
import { RequestVariableCacheKey } from '../../models/requestVariableCacheKey';
import { VariableType } from '../../models/variableType';
import { DocumentWrapper } from "../DocumentWrapper";
import { RequestVariableCache } from '../requestVariableCache';
import { RequestVariableCacheValueProcessor } from '../requestVariableCacheValueProcessor';
import { HttpVariable, HttpVariableProvider } from './httpVariableProvider';

export class RequestVariableProvider implements HttpVariableProvider {
    private static _instance: RequestVariableProvider;

    public static get Instance(): RequestVariableProvider {
        if (!RequestVariableProvider._instance) {
            RequestVariableProvider._instance = new RequestVariableProvider();
        }

        return RequestVariableProvider._instance;
    }

    private readonly requestVariableCache = new DocumentCache<string[]>();

    private constructor() {
    }

    public readonly type: VariableType = VariableType.Request;

    public async has(name: string, document: DocumentWrapper): Promise<boolean> {
        const [variableName] = name.trim().split('.');
        const variables = this.getRequestVariables(document);
        return variables.includes(variableName);
    }

    public async get(name: string, document: DocumentWrapper): Promise<HttpVariable> {
        const [variableName] = name.trim().split('.');
        const variables = this.getRequestVariables(document);
        if (!variables.includes(variableName)) {
            return { name: variableName, error: ResolveErrorMessage.RequestVariableNotExist };
        }
        const value = RequestVariableCache.get(new RequestVariableCacheKey(variableName, document));
        if (value === undefined) {
            return { name: variableName, warning: ResolveWarningMessage.RequestVariableNotSent };
        }

        const resolveResult = RequestVariableCacheValueProcessor.resolveRequestVariable(value, name);
        return this.convertToHttpVariable(variableName, resolveResult);
    }

    public async getAll(document: DocumentWrapper): Promise<HttpVariable[]> {
        const variables = this.getRequestVariables(document);
        return variables.map(v => ({ name: v, value: RequestVariableCache.get(new RequestVariableCacheKey(v, document)) }));
    }

    private getRequestVariables(document: DocumentWrapper): string[] {
        if (this.requestVariableCache.has(document)) {
            return this.requestVariableCache.get(document)!;
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
