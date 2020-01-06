import { RequestVariableCacheValue } from '../../models/requestVariableCacheValue';
import { VariableType } from "../../models/variableType";
import { DocumentWrapper } from '../DocumentWrapper';

export type HttpVariableValue = string | {} | RequestVariableCacheValue;

export interface HttpVariable {
    name: string;
    value?: HttpVariableValue;
    error?: any;
    warning?: any;
}

export interface HttpVariableContext {
    rawRequest: string;
    parsedRequest: string;
}

export interface HttpVariableProvider {
    readonly type: VariableType;
    has(name: string, document?: DocumentWrapper, context?: HttpVariableContext): Promise<boolean>;
    get(name: string, document?: DocumentWrapper, context?: HttpVariableContext): Promise<HttpVariable>;
    getAll(document?: DocumentWrapper, context?: HttpVariableContext): Promise<HttpVariable[]>;
}
