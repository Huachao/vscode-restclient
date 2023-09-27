import { HttpRequest } from "../models/httpRequest";
import { HttpResponse } from '../models/httpResponse';
import { ResolveErrorMessage, ResolveResult, ResolveState, ResolveWarningMessage } from "../models/httpVariableResolveResult";
import { MimeUtility } from './mimeUtility';
import { getContentType, getHeader, isJSONString } from './misc';

const xpath = require('xpath');
const { DOMParser } = require('xmldom');
const { JSONPath } = require('jsonpath-plus');

const requestVariablePathRegex: RegExp = /^(\w+)(?:\.(request|response)(?:\.(body|headers)(?:\.(.*))?)?)?$/;

type HttpEntity = 'request' | 'response';
type HttpPart = 'headers' | 'body';

export class RequestVariableCacheValueProcessor {
    public static resolveRequestVariable(value: HttpResponse | undefined, path: string): ResolveResult {
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

        const httpEntity = (type as HttpEntity) === 'request' ? value.request : value;

        if (!httpPart) {
            return { state: ResolveState.Warning, value: httpEntity, message: ResolveWarningMessage.MissingRequestEntityPart };
        }

        return this.resolveHttpPart(httpEntity, httpPart as HttpPart, nameOrPath);
    }

    private static resolveHttpPart(http: HttpRequest | HttpResponse, httpPart: HttpPart, nameOrPath?: string): ResolveResult {
        if (httpPart === "body") {
            const forceJsonExtension = 'asJson.';
            const forceXmlExtension = 'asXml.';
            const { body, headers } = http;
            if (!body) {
                const message = http instanceof HttpRequest ? ResolveWarningMessage.RequestBodyNotExist : ResolveWarningMessage.ResponseBodyNotExist;
                return { state: ResolveState.Warning, message };
            }

            if (!nameOrPath) {
                return { state: ResolveState.Warning, value: body, message: ResolveWarningMessage.MissingBodyPath };
            }

            // Make '*' as the wildcard to fetch the whole body regardless of the content-type
            if (nameOrPath === '*') {
                return { state: ResolveState.Success, value: body };
            }

            let forceJson = false;
            let forceXml = false;
            if (nameOrPath.startsWith(forceJsonExtension)) {
                nameOrPath = nameOrPath.substring(forceJsonExtension.length);
                forceJson = true;
            } else if (nameOrPath.startsWith(forceXmlExtension)) {
                nameOrPath = nameOrPath.substring(forceXmlExtension.length);
                forceXml = true;
            }

            const contentTypeHeader = getContentType(headers);
            if (MimeUtility.isJSON(contentTypeHeader) ||
                (forceJson || MimeUtility.isJavaScript(contentTypeHeader)) && isJSONString(body as string)) {
                const parsedBody = JSON.parse(body as string);

                return this.resolveJsonHttpBody(parsedBody, nameOrPath);
            } else if (forceXml || MimeUtility.isXml(contentTypeHeader)) {
                return this.resolveXmlHttpBody(body, nameOrPath);
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
            const result = JSONPath({ path, json: body });
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