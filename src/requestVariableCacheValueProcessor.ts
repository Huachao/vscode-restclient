"use strict";
import { RequestVariableCacheValue } from './models/requestVariableCacheValue';
import { HttpResponse } from './models/httpResponse';
import { HttpRequest } from "./models/httpRequest";
import { ResolveResult, ResolveState, ResolveErrorMessage, ResolveWarningMessage } from "./models/requestVariableResolveResult";
import { MimeUtility } from './mimeUtility';
import { MIME } from './models/mime';

const jp = require('jsonpath');
const xpath = require('xpath');
const { DOMParser } = require('xmldom');

const requestVariablePathRegex: RegExp = /^(\w+)(?:\.(request|response)(?:\.(body|headers)(?:\.(.*))?)?)?$/;

type HttpPart = 'headers' | 'body';

export class RequestVariableCacheValueProcessor {
    public static resolveRequestVariable(value: RequestVariableCacheValue, path: string): ResolveResult {
        if (!value || !path) {
            return { state: ResolveState.Error, message: ResolveErrorMessage.NoRequestVariablePath };
        }

        const matches = path.match(requestVariablePathRegex);

        if (!matches) {
            return { state: ResolveState.Error, message: ResolveErrorMessage.InvalidRequestVariableReference };
        }

        const [, , type, httpPart, nameOrPath] = matches;

        if (!type) {
            return { state: ResolveState.Warning, value, message: ResolveWarningMessage.MissingRequestEntityName };
        }

        const httpEntity = value[type];

        if (!httpPart) {
            return { state: ResolveState.Warning, value: httpEntity, message: ResolveWarningMessage.MissingRequestEntityPart };
        }

        return RequestVariableCacheValueProcessor.resolveHttpPart(httpEntity, httpPart as HttpPart, nameOrPath);
    }

    private static resolveHttpPart(http: HttpRequest | HttpResponse, httpPart: HttpPart, nameOrPath?: string): ResolveResult {
        if (httpPart === "body") {
            const { body } = http;
            if (!body) {
                const message = http instanceof HttpRequest ? ResolveWarningMessage.RequestBodyNotExist : ResolveWarningMessage.ResponseBodyNotExist;
                return { state: ResolveState.Warning, message };
            }

            if (!nameOrPath) {
                return { state: ResolveState.Warning, value: body, message: ResolveWarningMessage.MissingBodyPath };
            }

            const {type, suffix} = RequestVariableCacheValueProcessor.getHeaderMIME(http);
            if (type === "application/json" || suffix === '+json') {
                const parsedBody = JSON.parse(body as string);

                return RequestVariableCacheValueProcessor.resolveJsonHttpBody(parsedBody, nameOrPath);
            } else if (type === 'application/xml' || type === 'text/xml' || suffix === '+xml') {
                return RequestVariableCacheValueProcessor.resolveXmlHttpBody(body, nameOrPath);
            } else {
                return { state: ResolveState.Warning, value: body, message: ResolveWarningMessage.UnsupportedBodyContentType };
            }

        } else {
            const { headers } = http;
            if (!nameOrPath) {
                return { state: ResolveState.Warning, value: headers, message: ResolveWarningMessage.MissingHeaderName };
            }

            const value = RequestVariableCacheValueProcessor.getHeaderValue(http, nameOrPath);
            if (!value) {
                return { state: ResolveState.Warning, message: ResolveWarningMessage.IncorrectHeaderName };
            } else {
                return { state: ResolveState.Success, value };
            }
        }
    }

    private static getHeaderMIME(http: HttpRequest | HttpResponse): MIME {
        let contentType = RequestVariableCacheValueProcessor.getHeaderValue(http, "content-type");
        if (!contentType) {
            return null;
        }
        return MimeUtility.parse(contentType);
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
                return { state: ResolveState.Warning, message: ResolveWarningMessage.IncorrectJSONPath };
            } else {
                return { state: ResolveState.Success, value };
            }
        } catch {
            return { state: ResolveState.Warning, message: ResolveWarningMessage.InvalidJSONPath };
        }
    }

    private static resolveXmlHttpBody(body: any, path: string): ResolveResult {
        try {
            const doc = new DOMParser().parseFromString(body);
            const results = xpath.select(path, doc);
            if (typeof results === 'string') {
                return { state: ResolveState.Success, value: results };
            } else {
                if (results.length === 0) {
                    return { state: ResolveState.Warning, message: ResolveWarningMessage.IncorrectXPath };
                } else {
                    const result = results[0];
                    if (result.nodeType === NodeType.Element) {
                        // Element
                        return { state: ResolveState.Success, value: result.childNodes.toString() };
                    } else {
                        // Attribute
                        return { state: ResolveState.Success, value: result.nodeValue };
                    }
                }
            }
        } catch {
            return { state: ResolveState.Warning, message: ResolveWarningMessage.InvalidXPath };
        }
    }
}

const enum NodeType {
    Element = 1,
    Attribute,
}