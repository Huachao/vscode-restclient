'use strict';

import { TextDocument } from "vscode";
import { RequestVariableCacheValue } from '../../models/requestVariableCacheValue';
import { VariableType } from "../../models/variableType";


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
    has(document: TextDocument, name: string, context: HttpVariableContext): Promise<boolean>;
    get(document: TextDocument, name: string, context: HttpVariableContext): Promise<HttpVariable>;
    getAll(document: TextDocument, context: HttpVariableContext): Promise<HttpVariable[]>;
}
