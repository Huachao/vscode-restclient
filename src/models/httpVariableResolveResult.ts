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
    InvalidRequestVariableReference = 'Incorrect request variable reference syntax, it should be "variableName.(response|request).(headers|body).(headerName|JSONPath|XPath|*)"',
    SystemVariableNotExist = 'System variable does not exist',
    EnvironmentVariableNotExist = 'Environment variable does not exist',
    FileVariableNotExist = 'File variable does not exist',
    RequestVariableNotExist =  'Request variable does not exist',
}

export const enum ResolveWarningMessage {
    RequestVariableNotSent = 'Request variable has not been sent',
    MissingRequestEntityName = 'Http entity name "response" or "request" should be provided right after the request variable name',
    MissingRequestEntityPart = 'Http entity part "headers" or "body" should be provided right after the http entity name',
    MissingHeaderName = 'Header name should be provided right after "headers"',
    MissingBodyPath = 'Body path should be provided right after "body"',
    RequestBodyNotExist = "Request body of given request doesn't exist",
    ResponseBodyNotExist = "Response body of given request doesn't exist",
    IncorrectDateTimeVariableFormat = 'Datetime system variable should follow format "{{$datetime rfc1123|iso8601 [integer y|Q|M|w|d|h|m|s|ms]}}"',
    IncorrectHeaderName = 'No value is resolved for given header name',
    IncorrectJSONPath = 'No value is resolved for given JSONPath',
    IncorrectRandomIntegerVariableFormat = 'RandomInt system variable should follow format "{{$randomInt minInteger maxInteger}}"',
    IncorrectTimestampVariableFormat = 'Timestamp system variable should follow format "{{$timestamp [integer y|Q|M|w|d|h|m|s|ms]}}"',
    IncorrectXPath = 'No value is resolved for given XPath',
    UnsupportedBodyContentType = 'Only JSON response/request body is supported to query the result',
    InvalidJSONPath = 'Invalid JSONPath query',
    InvalidXPath = 'Invalid XPath query',
    IncorrectEnvIfVariableFormat = 'EnvIf system variable should follow format "{{$envIf envName value1 value2}}"',

}