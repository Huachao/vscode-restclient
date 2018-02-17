"use strict";
import { RequestVariableCacheValue } from './models/requestVariableCacheValue';
import { HttpResponse } from './models/httpResponse';
import { HttpRequest } from "./models/httpRequest";

const jp = require('jsonpath');

const requestVariablePathRegex: RegExp = /(\w+)(?:\.)?(response|request)?(?:\.)?(body|headers)?(?:\.)?(.*)?/;

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

            const parsedBody = JSON.parse(body as string);

            if (!rest) {
                return parsedBody;
            }

            return parsedBody ? RequestVariableCacheValueProcessor.resolveHttpBody(parsedBody, rest) : undefined;
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

    public static resolveHttpBody(body: any, path: string) {
        try {
            const result = jp.query(body, path);
            return result ? result[0] : null;
        } catch (err) {
            console.warn(`The JSONPath query failed, is ${path} correctly formatted?`);
        }
    }
}