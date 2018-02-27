"use strict";
import { RequestVariableCacheValue } from './models/requestVariableCacheValue';
import { HttpResponse } from './models/httpResponse';
import { HttpRequest } from "./models/httpRequest";
import { MimeUtility } from './mimeUtility';

const jp = require('jsonpath');

const requestVariablePathRegex: RegExp = /(\w+)(?:\.(request|response)(?:\.(body|headers)(?:\.(.*))?)?)?/;

export class RequestVariableCacheValueProcessor {
    public static getValueAtPath(value: RequestVariableCacheValue, path: string): any {
        if (!value
            || !path) {
            return undefined;
        }

        const matches = path.match(requestVariablePathRegex);

        if (!matches) {
            return undefined;
        }

        const [, , type, httpPart, rest] = matches;

        if (!type) {
            return value;
        }

        switch (type) {
            case "request":
            case "response":
                const http = value[type];

                if (!http) {
                    return undefined;
                }

                if (!httpPart) {
                    return http;
                }

                return RequestVariableCacheValueProcessor.resolveHttpPart(http, httpPart, rest);
            default:
                return undefined;
        }
    }

    public static resolveHttpPart(http: HttpRequest | HttpResponse, httpPart: string, rest?: string): any {
        if (httpPart === "body") {
            const { body } = http;

            if (!body) {
                return undefined;
            }

            const contentType = RequestVariableCacheValueProcessor.getHeaderContentType(http);

            if (contentType === "application/json") {
                const parsedBody = JSON.parse(body as string);

                if (!rest) {
                    return parsedBody;
                }

                return parsedBody
                    ? RequestVariableCacheValueProcessor.resolveJsonHttpBody(parsedBody, rest)
                    : undefined;
            } else {
                if (rest) {
                    console.warn(`Parsing Content-Type "${contentType}" is currently unsupported. Path "${rest}" was ignored.`);
                }

                return body;
            }

        } else if (httpPart === "headers") {
            const { headers } = http;
            if (!rest) {
                return headers;
            }

            return headers ? headers[rest] : undefined;
        } else {
            return undefined;
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

    public static resolveJsonHttpBody(body: any, path: string) {
        try {
            const result = jp.query(body, path);
            return result ? result[0] : null;
        } catch (err) {
            console.warn(`The JSONPath query failed, is ${path} correctly formatted?`);
        }
    }
}