"use strict";

import { HttpRequest } from './models/httpRequest'
import { EOL } from 'os';

export class RequestParser {
    private static defaultMethod = 'GET';

    static parseHttpRequest(requestRawText: string): HttpRequest {
        // parse follows http://www.w3.org/Protocols/rfc2616/rfc2616-sec5.html
        // split the request raw text into lines
        let lines: string[] = requestRawText.split(EOL);

        // skip leading empty lines
        lines = RequestParser.skipWhile(lines, value => value.trim() === '')

        if (lines.length == 0) {
            return null;
        }

        // parse request line
        let requestLine = RequestParser.parseRequestLine(lines[0]);

        // get headers range
        let headers: {[key: string]: string};
        let body: string;
        let headerStartLine = RequestParser.firstIndexOf(lines, value => value.trim() !== '', 1);
        if (headerStartLine !== -1) {
            // parse request headers
            let firstEmptyLine = RequestParser.firstIndexOf(lines, value => value.trim() === '', headerStartLine);
            let headerEndLine = firstEmptyLine == -1 ? lines.length : firstEmptyLine;
            headers = RequestParser.parseRequestHeaders(lines.slice(headerStartLine, headerEndLine));
            
            // get body range
            let bodyStartLine = RequestParser.firstIndexOf(lines, value => value.trim() !== '', headerEndLine);
            if (bodyStartLine !== -1) {
                firstEmptyLine = RequestParser.firstIndexOf(lines, value => value.trim() === '', bodyStartLine);
                let bodyEndLine = firstEmptyLine == -1 ? lines.length : firstEmptyLine;
                body = lines.slice(bodyStartLine, bodyEndLine).join(EOL);
            }
        }

        return new HttpRequest(requestLine.method, requestLine.url, headers, body);
    }

    private static parseRequestLine(line: string): any {
        // Request-Line = Method SP Request-URI SP HTTP-Version CRLF
        let words = line.split(' ').filter(Boolean);

        let method: string;
        let url: string;
        if (words.length === 1) {
            // Only provides request url
            method = RequestParser.defaultMethod;
            url = words[0];
        } else {
            // Provides both request method and url
            method = words[0];
            url = words[1];
        }

        return {
            "method": method,
            "url": url
        };
    }
    
    private static parseRequestHeaders(headerLines: string[]): {[key: string]: string} {
        // message-header = field-name ":" [ field-value ]
        let headers: {[key: string]: string} = {};
        headerLines.forEach(headerLine => {
            let headerParts = headerLine.split(':', 2).filter(Boolean);
            let fieldName: string;
            let fieldValue: string;
            if (headerParts.length === 2) {
                fieldName = headerParts[0];
                fieldValue = headerParts[1];
            } else if (headerParts.length == 1) {
                fieldName = headerParts[0];
                fieldValue = '';
            }

            let normalizedfieldName = fieldName.trim().toLowerCase();
            let normalizedfieldValue = fieldValue.trim();
            if (!headers[normalizedfieldName]) {
                headers[normalizedfieldName] = normalizedfieldValue;
            } else {
                headers[normalizedfieldName] += `,${normalizedfieldValue}`;
            }
        });

        return headers;
    }

    private static skipWhile<T>(items: T[], callbackfn: (value: T, index: number, array: T[]) => boolean): T[] {
         let result: T[];
         let index = 0;
         for (; index < items.length; index++) {
             if (!callbackfn(items[index], index, items)) {
                 break;
             }
         }

         return items.slice(index);
    };
    
    private static firstIndexOf<T>(items: T[], callbackfn: (value: T, index: number, array: T[]) => boolean, start?: number): number {
        if (!start) {
            start = 0;
        }

        let index = start;
        for (; index < items.length; index++) {
             if (callbackfn(items[index], index, items)) {
                 break;
             }
         }

        return index >= items.length ? -1 : index;
    }
}