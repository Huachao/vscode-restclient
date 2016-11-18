"use strict";

import { HttpRequest } from './models/httpRequest'
import { IRequestParser } from './models/IRequestParser'
import { RequestParserUtil } from './requestParserUtil'
import { HttpClient } from './httpClient'
import { EOL } from 'os';
import * as fs from 'fs';
import * as path from 'path';

export class HttpRequestParser implements IRequestParser {
    private static readonly defaultMethod = 'GET';
    private static readonly uploadFromFildSyntax: RegExp = new RegExp('^\<[ \t]+([^ \t]*)[ \t]*$');

    parseHttpRequest(requestRawText: string, requestAbsoluteFilePath: string): HttpRequest {
        // parse follows http://www.w3.org/Protocols/rfc2616/rfc2616-sec5.html
        // split the request raw text into lines
        let lines: string[] = requestRawText.split(EOL);

        // skip leading empty lines
        lines = HttpRequestParser.skipWhile(lines, value => value.trim() === '')

        if (lines.length === 0) {
            return null;
        }

        // parse request line
        let requestLine = HttpRequestParser.parseRequestLine(lines[0]);

        // get headers range
        let headers: { [key: string]: string };
        let body: string;
        let bodyLineCount: number = 0;
        let headerStartLine = HttpRequestParser.firstIndexOf(lines, value => value.trim() !== '', 1);
        if (headerStartLine !== -1) {
            if (headerStartLine === 1) {
                // parse request headers
                let firstEmptyLine = HttpRequestParser.firstIndexOf(lines, value => value.trim() === '', headerStartLine);
                let headerEndLine = firstEmptyLine === -1 ? lines.length : firstEmptyLine;
                let headerLines = lines.slice(headerStartLine, headerEndLine);
                let index = 0;
                let queryString = '';
                for (; index < headerLines.length;) {
                    let headerLine = (headerLines[index]).trim();
                    if (headerLine[0] in {'?': '', '&': ''} && headerLine.split('=').length === 2) {
                        queryString += headerLine;
                        index++;
                        continue;
                    }
                    break;
                }

                if (queryString !== '') {
                    requestLine.url += queryString;
                }
                headers = RequestParserUtil.parseRequestHeaders(headerLines.slice(index));

                // get body range
                let bodyStartLine = HttpRequestParser.firstIndexOf(lines, value => value.trim() !== '', headerEndLine);
                if (bodyStartLine !== -1) {
                    firstEmptyLine = HttpRequestParser.firstIndexOf(lines, value => value.trim() === '', bodyStartLine);
                    let bodyEndLine = firstEmptyLine === -1 ? lines.length : firstEmptyLine;
                    bodyLineCount = bodyEndLine - bodyStartLine;
                    body = lines.slice(bodyStartLine, bodyEndLine).join(EOL);
                }
            } else {
                // parse body, since no headers provided
                let firstEmptyLine = HttpRequestParser.firstIndexOf(lines, value => value.trim() === '', headerStartLine);
                let bodyEndLine = firstEmptyLine === -1 ? lines.length : firstEmptyLine;
                bodyLineCount = bodyEndLine - headerStartLine;
                body = lines.slice(headerStartLine, bodyEndLine).join(EOL);
            }
        }

        // if Host header provided and url is relative path, change to absolute url
        if (HttpClient.getHeaderValue(headers, 'Host') && requestLine.url[0] === '/') {
            requestLine.url = `http://${HttpClient.getHeaderValue(headers, 'Host')}${requestLine.url}`;
        }

        // parse body
        if (bodyLineCount === 1 && HttpRequestParser.uploadFromFildSyntax.test(body)) {
            let groups = HttpRequestParser.uploadFromFildSyntax.exec(body);
            if (groups !== null && groups.length === 2) {
                let fileUploadPath = groups[1];
                if (!path.isAbsolute(fileUploadPath) && requestAbsoluteFilePath) {
                    // get path relative to this http file
                    fileUploadPath = path.join(path.dirname(requestAbsoluteFilePath), fileUploadPath);
                }
                if (fs.existsSync(fileUploadPath)) {
                    body = fs.readFileSync(fileUploadPath).toString();
                }
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
            method = HttpRequestParser.defaultMethod;
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

    private static skipWhile<T>(items: T[], callbackfn: (value: T, index: number, array: T[]) => boolean): T[] {
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