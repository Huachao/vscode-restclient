"use strict";

import { Headers } from './models/base';
import { RequestVariableCacheValue } from './models/requestVariableCacheValue';
import { HttpResponse } from './models/httpResponse';
import { HttpRequest } from "./models/httpRequest";
import { ResolveResult, ResolveState, ResolveErrorMessage, ResolveWarningMessage } from "./models/requestVariableResolveResult";
import { MimeUtility } from './mimeUtility';
import { MIME } from './models/mime';
import { getHeader } from './misc';

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
            const { body, headers } = http;
            if (!body) {
                const message = http instanceof HttpRequest ? ResolveWarningMessage.RequestBodyNotExist : ResolveWarningMessage.ResponseBodyNotExist;
                return { state: ResolveState.Warning, message };
            }

            if (!nameOrPath) {
                return { state: ResolveState.Warning, value: body, message: ResolveWarningMessage.MissingBodyPath };
            }

            const contentTypeHeader = getHeader(headers, 'content-type');
            if (MimeUtility.isJSON(contentTypeHeader)) {
                const parsedBody = JSON.parse(body as string);

                return RequestVariableCacheValueProcessor.resolveJsonHttpBody(parsedBody, nameOrPath);
            } else if (MimeUtility.isXml(contentTypeHeader)) {
                return RequestVariableCacheValueProcessor.resolveXmlHttpBody(body, nameOrPath);
            } else {
                return { state: ResolveState.Warning, value: body, message: ResolveWarningMessage.UnsupportedBodyContentType };
            }

        } else {
            const { headers } = http;
            if (!nameOrPath) {
                return { state: ResolveState.Warning, value: headers, message: ResolveWarningMessage.MissingHeaderName };
            }

            const value = getHeader(headers, nameOrPath);
            if (!value) {
                return { state: ResolveState.Warning, message: ResolveWarningMessage.IncorrectHeaderName };
            } else {
                return { state: ResolveState.Success, value };
            }
        }
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
                    if (result.nodeType === NodeType.Document) {
                        // Document
                        return { state: ResolveState.Success, value: result.documentElement.toString() };
                    } else if (result.nodeType === NodeType.Element) {
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
    Attribute = 2,
    Document = 9,
}