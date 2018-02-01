"use strict";

import { MimeUtility } from "./mimeUtility";
import { RequestVariableCacheValue } from './models/requestVariableCacheValue';
import { HttpResponse } from './models/httpResponse';
import { window } from "vscode";

const validPathRegex = new RegExp(/(\w+)(\.\w+|\[\d+\])*/);
const partRegex = new RegExp(/(\w+)(\[\d+\])*/);
const arrayIndexRegex = new RegExp(/\[(\d+)\]/);

export class RequestVariableCacheValueProcessor {
    public static getValueAtPath(value: RequestVariableCacheValue, path: string): any {
        if (!value
            || !path
            || !RequestVariableCacheValueProcessor.isValidPath(path)) {
            return undefined;
        }

        const parts = path.split(".");

        // Expect first part to be variable name
        if (parts.length === 1) {
            return value;
        }

        switch (parts[1]) {
            case "request":
                return RequestVariableCacheValueProcessor.resolveParts(
                    value.request,
                    parts.slice(2, parts.length)
                );
            case "response":
                const { response } = value;
                return RequestVariableCacheValueProcessor.resolveResponse(response, parts);
            default:
                return undefined;
        }
    }

    private static resolveResponse(response: HttpResponse, parts: string[]) {
        if (parts.length >= 3) {
            const matches = parts[2].match(partRegex);
            // Must parse body specifically
            if (matches[1] === "body") {
                let bodyValue = RequestVariableCacheValueProcessor.parseResponseBody(response);
                // If array indeces:
                for (let j = 2; j < matches.length; j++) {
                    if (matches[j]) {
                        bodyValue = bodyValue[matches[j].match(arrayIndexRegex)[1]];
                    }
                }
                return RequestVariableCacheValueProcessor.resolveParts(
                    bodyValue,
                    parts.slice(3, parts.length)
                );
            } else {
                return RequestVariableCacheValueProcessor.resolveParts(
                    response,
                    parts.slice(2, parts.length)
                );
            }
        } else {
            return response;
        }
    }

    private static resolveParts(value: any, parts: string[]): any {
        for (let i = 0; i < parts.length; i++) {
            let part = parts[i];
            let matches = part.match(partRegex);
            const partName = matches[1];
            value = value[partName];
            // If array indices:
            for (let j = 2; j < matches.length; j++) {
                if (matches[j]) {
                    value = value[matches[j].match(arrayIndexRegex)[1]];
                }
            }
        }

        return value;
    }

    public static isValidPath(path: string): boolean {
        return validPathRegex.test(path);
    }

    public static parseResponseBody(response: HttpResponse) {
        const {body} = response;
        const contentType = response.getResponseHeaderValue("content-type");
        if (contentType) {
            let mime = MimeUtility.parse(contentType);
            let type = mime.type;
            let suffix = mime.suffix;
            if (type === 'application/json' || suffix === '+json') {
                try {
                    return JSON.parse(body);
                } catch {
                    window.showWarningMessage('The content type of response is application/json, while response body is not a valid json string');
                }
            } else {
                window.showWarningMessage('Only JSON response is supported.');
            }
        }

        return body;
    }
}