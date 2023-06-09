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
    IncorrectDateTimeVariableFormat = 'Datetime system variable should follow format "{{$datetime rfc1123|iso8601 [integer y|M|w|d|h|m|s|ms]}}"',
    IncorrectLocalDateTimeVariableFormat = 'Local datetime system variable should follow format "{{$localDatetime rfc1123|iso8601 [integer y|M|w|d|h|m|s|ms]}}"',
    DotenvFileNotFound = '.env file is not found in the directory where current .http file exists',
    DotenvVariableNotFound = 'Given variable name is not found in .env file',
    IncorrectHeaderName = 'No value is resolved for given header name',
    IncorrectJSONPath = 'No value is resolved for given JSONPath',
    IncorrectRandomIntegerVariableFormat = 'RandomInt system variable should follow format "{{$randomInt minInteger maxInteger}}"',
    IncorrectFakerVariableFormat = 'Faker expression should follow format "$faker <subject>.<method>}}"',
    IncorrectProcessEnvVariableFormat = 'ProcessEnv system variable should follow format "{{$processEnv envVarName}}"',
    IncorrectTimestampVariableFormat = 'Timestamp system variable should follow format "{{$timestamp [integer y|M|w|d|h|m|s|ms]}}"',
    IncorrectDotenvVariableFormat = 'Dotenv variable should follow format "{{$dotenv variableName}}"',
    IncorrectXPath = 'No value is resolved for given XPath',
    UnsupportedBodyContentType = 'Only JSON and XML response/request body is supported to query the result',
    InvalidJSONPath = 'Invalid JSONPath query',
    InvalidXPath = 'Invalid XPath query',
}