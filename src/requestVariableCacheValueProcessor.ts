"use strict";
import { RequestVariableCacheValue } from './models/requestVariableCacheValue';
import { HttpResponse } from './models/httpResponse';
import { HttpRequest } from "./models/httpRequest";
import { MimeUtility } from './mimeUtility';

const jp = require('jsonpath');

const requestVariablePathRegex: RegExp = /^(\w+)(?:\.(request|response)(?:\.(body|headers)(?:\.(.*))?)?)?$/;

type HttpPart = 'headers' | 'body';

export class RequestVariableCacheValueProcessor {
    public static getValueAtPath(value: RequestVariableCacheValue, path: string): any {
        if (!value || !path) {
            return;
        }

        const matches = path.match(requestVariablePathRegex);

        if (!matches) {
            return;
        }

        const [, , type, httpPart, nameOrPath] = matches;

        if (!type) {
            return value;
        }

        const httpEntity = value[type];

        if (!httpPart) {
            return httpEntity;
        }

        return RequestVariableCacheValueProcessor.resolveHttpPart(httpEntity, httpPart as HttpPart, nameOrPath);
    }

    private static resolveHttpPart(http: HttpRequest | HttpResponse, httpPart: HttpPart, nameOrPath?: string): any {
        if (httpPart === "body") {
            const { body } = http;
            if (!body || !nameOrPath) {
                return body;
            }

            const contentType = RequestVariableCacheValueProcessor.getHeaderContentType(http);
            if (contentType === "application/json") {
                const parsedBody = JSON.parse(body as string);

                return RequestVariableCacheValueProcessor.resolveJsonHttpBody(parsedBody, nameOrPath);
            } else {
                if (nameOrPath) {
                    console.warn(`Parsing Content-Type "${contentType}" is currently unsupported. Path "${nameOrPath}" was ignored.`);
                }

                return body;
            }

        } else {
            const { headers } = http;
            return !nameOrPath || !headers ? headers : headers[nameOrPath];
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

    private static resolveJsonHttpBody(body: any, path: string): string {
        try {
            const result = jp.query(body, path);
            return typeof result[0] === 'string' ? result[0] : JSON.stringify(result[0]);
        } catch (err) {
            console.warn(`The JSONPath query failed, is ${path} correctly formatted?`);
        }
    }
}