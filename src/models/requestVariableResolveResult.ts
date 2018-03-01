"use strict";

export type ResolveResult = { state: ResolveState.Success, value: any }
                          | { state: ResolveState.Warning, value?: any, message: ResolveWarningMessage }
                          | { state: ResolveState.Error, message: ResolveErrorMessage };

export const enum ResolveState {
    Success,
    Warning,
    Error
}

export const enum ResolveErrorMessage {
    NoRequestVariablePath = 'Request variable path is not provided',
    InvalidRequestVariableReference = 'Incorrect request variable reference syntax, it should be "variableName.(response|request).(headers|body).(headerName|JSONPath)"',
}

export const enum ResolveWarningMessage {
    MissingRequestEntityName = 'Http entity name "response" or "request" should be provided right after the request variable name',
    MissingRequestEntityPart = 'Http entity part "headers" or "body" should be provided right after the http entity name',
    MissingHeaderName = 'Header name should be provided right after "headers"',
    MissingBodyPath = 'Body path should be provided right after "body"',
    RequestBodyNotExist = "Request body of given request doesn't exist",
    ResponseBodyNotExist = "Response body of given request doesn't exist",
    IncorrectHeaderName = 'No value is resolved for given header name',
    IncorrectJSONPath = 'No value is resolved for given JSONPath',
    UnsupportedBodyContentType = 'Only JSON response/request body is supported to query the result',
    InvalidJSONPath = 'Invalid JSONPath query'
}