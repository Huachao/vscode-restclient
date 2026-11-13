import { HttpResponse } from './httpResponse';

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
