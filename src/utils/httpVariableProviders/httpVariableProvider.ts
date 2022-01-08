import { TextDocument } from "vscode";
import { HttpResponse } from '../../models/httpResponse';
import { VariableType } from "../../models/variableType";

export type HttpVariableValue = string | {} | HttpResponse;

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
    readonly type: VariableType
    _environmentName: string
    has(name: string, document?: TextDocument, context?: HttpVariableContext): Promise<boolean>;
    get(name: string, document?: TextDocument, context?: HttpVariableContext): Promise<HttpVariable>;
    getAll(document?: TextDocument, context?: HttpVariableContext): Promise<HttpVariable[]>;
}
