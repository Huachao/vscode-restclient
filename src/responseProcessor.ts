"use strict";

import { MimeUtility } from "./mimeUtility"
import { HttpResponse } from './models/httpResponse';
import { window } from "vscode";

const validPath = new RegExp(/(\w+)(\.\w+|\[\d+\])*/)
const arrayPart = new RegExp(/(\w+)(\[\d+\])*/)

export class ResponseProcessor {
    public static getValueAtPath(response: HttpResponse, path: string): any {
        if (!response 
            || !path 
            || !ResponseProcessor.isValidPath(path)) {
            return undefined;            
        }

        const parts = path.split(".");
        
        // Expect first part to be response name
        if (parts.length === 1) return response;

        let value: any = response;

        for (let i = 1; i < parts.length; i++) {
            let part = parts[i];
            // Retrieval from response object
            let matches = part.match(arrayPart);
            const partName = matches[1];
            const isBodyPart = i === 1 && partName === "body";
            value = 
                isBodyPart     
                ? ResponseProcessor.parseResponseBody(value[partName], response.getResponseHeaderValue("content-type"))
                : value[partName];
            for (let j = 2; j < matches.length; j++) {
                if (matches[j]) {
                    value = value[matches[j].replace("[", "").replace("]", "")];
                }
            }
        }

        return value;
    }

    public static isValidPath(path: string): boolean {
        return validPath.test(path);
    }

    public static parseResponseBody(body: string, contentType: string) {
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