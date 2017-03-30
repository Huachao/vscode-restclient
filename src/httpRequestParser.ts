"use strict";

import { workspace } from 'vscode';
import { HttpRequest } from './models/httpRequest';
import { IRequestParser } from './models/IRequestParser';
import { RequestParserUtil } from './requestParserUtil';
import { HttpClient } from './httpClient';
import { MimeUtility } from './mimeUtility';
import { EOL } from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { Stream } from 'stream';

var CombinedStream = require('combined-stream');

export class HttpRequestParser implements IRequestParser {
    private static readonly defaultMethod = 'GET';
    private static readonly uploadFromFileSyntax: RegExp = new RegExp('^\<[ \t]+([^ \t]*)[ \t]*$');

    public parseHttpRequest(requestRawText: string, requestAbsoluteFilePath: string, parseFileContentAsStream: boolean): HttpRequest {
        // parse follows http://www.w3.org/Protocols/rfc2616/rfc2616-sec5.html
        // split the request raw text into lines
        let lines: string[] = requestRawText.split(EOL);

        // skip leading empty lines
        lines = HttpRequestParser.skipWhile(lines, value => value.trim() === '');

        // skip trailing empty lines
        lines = HttpRequestParser.skipWhile(lines.reverse(), value => value.trim() === '').reverse();

        if (lines.length === 0) {
            return null;
        }

        // parse request line
        let requestLine = HttpRequestParser.parseRequestLine(lines[0]);

        // get headers range
        let headers: { [key: string]: string };
        let body: string | Stream;
        let bodyLines: string[] = [];
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
                    if (headerLine[0] in { '?': '', '&': '' } && headerLine.split('=').length === 2) {
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
                    let contentTypeHeader = HttpRequestParser.getContentTypeHeader(headers);
                    firstEmptyLine = HttpRequestParser.firstIndexOf(lines, value => value.trim() === '', bodyStartLine);
                    let bodyEndLine = MimeUtility.isMultiPartFormData(contentTypeHeader) || firstEmptyLine === -1 ? lines.length : firstEmptyLine;
                    bodyLines = lines.slice(bodyStartLine, bodyEndLine);
                }
            } else {
                // parse body, since no headers provided
                let firstEmptyLine = HttpRequestParser.firstIndexOf(lines, value => value.trim() === '', headerStartLine);
                let bodyEndLine = firstEmptyLine === -1 ? lines.length : firstEmptyLine;
                bodyLines = lines.slice(headerStartLine, bodyEndLine);
            }
        }

        // if Host header provided and url is relative path, change to absolute url
        if (HttpClient.getHeaderValue(headers, 'Host') && requestLine.url[0] === '/') {
            requestLine.url = `http://${HttpClient.getHeaderValue(headers, 'Host')}${requestLine.url}`;
        }

        // parse body
        let contentTypeHeader = HttpRequestParser.getContentTypeHeader(headers);
        body = HttpRequestParser.parseRequestBody(bodyLines, requestAbsoluteFilePath, contentTypeHeader, parseFileContentAsStream);

        return new HttpRequest(requestLine.method, requestLine.url, headers, body, bodyLines.join(EOL));
    }

    private static parseRequestLine(line: string): { method: string, url: string } {
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
            method = words.shift();
            if (words[words.length - 1].match(/HTTP\/.*/gi)) {
                words.pop();
            }

            url = words.join(' ');
        }

        return {
            method: method,
            url: url
        };
    }

    private static parseRequestBody(lines: string[], requestFileAbsolutePath: string, contentTypeHeader: string, parseFileContentAsStream: boolean): string | Stream {
        if (!lines || lines.length === 0) {
            return <string>null;
        }

        // Check if needed to upload file
        if (lines.every(line => !HttpRequestParser.uploadFromFileSyntax.test(line))) {
            return lines.join(EOL);
        } else {
            if (parseFileContentAsStream) {
                var combinedStream = CombinedStream.create({ maxDataSize: 10 * 1024 * 1024 });
                lines.forEach(line => {
                    if (HttpRequestParser.uploadFromFileSyntax.test(line)) {
                        let groups = HttpRequestParser.uploadFromFileSyntax.exec(line);
                        if (groups !== null && groups.length === 2) {
                            let fileUploadPath = groups[1];
                            var fileAbsolutePath = HttpRequestParser.resolveFilePath(fileUploadPath, requestFileAbsolutePath);
                            if (fileAbsolutePath && fs.existsSync(fileAbsolutePath)) {
                                combinedStream.append(fs.createReadStream(fileAbsolutePath));
                            } else {
                                combinedStream.append(line);
                            }
                        }
                    } else {
                        combinedStream.append(line);
                    }

                    combinedStream.append(HttpRequestParser.getLineEnding(contentTypeHeader));
                });

                return combinedStream;
            } else {
                let contents = [];
                lines.forEach(line => {
                    if (HttpRequestParser.uploadFromFileSyntax.test(line)) {
                        let groups = HttpRequestParser.uploadFromFileSyntax.exec(line);
                        if (groups !== null && groups.length === 2) {
                            let fileUploadPath = groups[1];
                            var fileAbsolutePath = HttpRequestParser.resolveFilePath(fileUploadPath, requestFileAbsolutePath);
                            if (fileAbsolutePath && fs.existsSync(fileAbsolutePath)) {
                                contents.push(fs.readFileSync(fileAbsolutePath));
                            } else {
                                contents.push(line);
                            }
                        }
                    } else {
                        contents.push(line);
                    }
                });

                return contents.join(EOL);
            }
        }
    }

    private static getLineEnding(contentTypeHeader: string) {
        return MimeUtility.isMultiPartFormData(contentTypeHeader) ? '\r\n' : EOL;
    }

    private static resolveFilePath(refPath: string, httpFilePath: string): string {
        if (path.isAbsolute(refPath)) {
            return fs.existsSync(refPath) ? refPath : null;
        }

        var rootPath = workspace.rootPath;
        if (rootPath) {
            var absolutePath = path.join(rootPath, refPath);
            if (fs.existsSync(absolutePath)) {
                return absolutePath;
            }
        }

        absolutePath = path.join(path.dirname(httpFilePath), refPath);
        if (fs.existsSync(absolutePath)) {
            return absolutePath;
        }

        return null;
    }

    private static getContentTypeHeader(headers: { [key: string]: string }) {
        if (headers) {
            for (var header in headers) {
                if (header.toLowerCase() === 'content-type') {
                    return headers[header];
                }
            }
        }

        return null;
    }

    private static skipWhile<T>(items: T[], callbackfn: (value: T, index: number, array: T[]) => boolean): T[] {
        for (var index = 0; index < items.length; index++) {
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