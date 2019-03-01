'use strict';

import { TextDocument } from "vscode";
import { RequestVariableCacheValue } from '../../models/requestVariableCacheValue';
import { VariableType } from "../../models/variableType";


export interface HttpVariableValue {
    name: string;
    value?: string | {} | RequestVariableCacheValue;
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
    get(document: TextDocument, name: string, context: HttpVariableContext): Promise<HttpVariableValue>;
    getAll(document: TextDocument, context: HttpVariableContext): Promise<HttpVariableValue[]>;
}
