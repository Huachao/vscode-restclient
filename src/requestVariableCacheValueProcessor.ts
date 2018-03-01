"use strict";
import { RequestVariableCacheValue } from './models/requestVariableCacheValue';
import { HttpResponse } from './models/httpResponse';
import { HttpRequest } from "./models/httpRequest";
import { ResolveResult, ResolveState, ResolveErrorMessage, ResolveWarnMessage } from "./models/requestVariableResolveResult";
import { MimeUtility } from './mimeUtility';

const jp = require('jsonpath');

const requestVariablePathRegex: RegExp = /^(\w+)(?:\.(request|response)(?:\.(body|headers)(?:\.(.*))?)?)?$/;

type HttpPart = 'headers' | 'body';

export class RequestVariableCacheValueProcessor {
    public static resolveRequestVariable(value: RequestVariableCacheValue, path: string): ResolveResult {
        if (!value || !path) {
            return { state: ResolveState.Error, message: ResolveErrorMessage.NoRequestVariablePath }
        }

        const matches = path.match(requestVariablePathRegex);

        if (!matches) {
            return { state: ResolveState.Error, message: ResolveErrorMessage.InvalidRequestVariableReference };
        }

        const [, , type, httpPart, nameOrPath] = matches;

        if (!type) {
            return { state: ResolveState.Warn, value, message: ResolveWarnMessage.MissingRequestEntityName };
        }

        const httpEntity = value[type];

        if (!httpPart) {
            return { state: ResolveState.Warn, value: httpEntity, message: ResolveWarnMessage.MissingRequestEntityPart }
        }

        return RequestVariableCacheValueProcessor.resolveHttpPart(httpEntity, httpPart as HttpPart, nameOrPath);
    }

    private static resolveHttpPart(http: HttpRequest | HttpResponse, httpPart: HttpPart, nameOrPath?: string): ResolveResult {
        if (httpPart === "body") {
            const { body } = http;
            if (!body) {
                const message = http instanceof HttpRequest ? ResolveWarnMessage.RequestBodyNotExist : ResolveWarnMessage.ResponseBodyNotExist;
                return { state: ResolveState.Warn, message }
            }

            if (!nameOrPath) {
                return { state: ResolveState.Warn, value: body, message: ResolveWarnMessage.MissingBodyPath };
            }

            const contentType = RequestVariableCacheValueProcessor.getHeaderContentType(http);
            if (contentType === "application/json") {
                const parsedBody = JSON.parse(body as string);

                return RequestVariableCacheValueProcessor.resolveJsonHttpBody(parsedBody, nameOrPath);
            } else {
                return { state: ResolveState.Warn, value: body, message: ResolveWarnMessage.UnsupportedBodyContentType };
            }

        } else {
            const { headers } = http;
            if (!nameOrPath) {
                return { state: ResolveState.Warn, value: headers, message: ResolveWarnMessage.MissingHeaderName };
            }

            const value = RequestVariableCacheValueProcessor.getHeaderValue(http, nameOrPath);
            if (!value) {
                return { state: ResolveState.Warn, message: ResolveWarnMessage.IncorrectHeaderName };
            } else {
                return { state: ResolveState.Success, value }
            }
        }
    }

    private static getHeaderContentType(http: HttpRequest | HttpResponse) {
        let contentType = RequestVariableCacheValueProcessor.getHeaderValue(http, "content-type");
        if (!contentType) {
            return null;
        }
        let mime = MimeUtility.parse(contentType);
        return mime.type;
    }

    private static getHeaderValue(http: HttpRequest | HttpResponse, name: string) {
        if (http.headers) {
            for (let header in http.headers) {
                if (header.toLowerCase() === name.toLowerCase()) {
                    return http.headers[header];
                }
            }
        }

        return null;
    }

    private static resolveJsonHttpBody(body: any, path: string): ResolveResult {
        try {
            const result = jp.query(body, path);
            const value = typeof result[0] === 'string' ? result[0] : JSON.stringify(result[0]);
            if (!value) {
                return { state: ResolveState.Warn, message: ResolveWarnMessage.IncorrectJSONPath };
            } else {
                return { state: ResolveState.Success, value };
            }
        } catch {
            return { state: ResolveState.Warn, message: ResolveWarnMessage.InvalidJSONPath };
        }
    }
}