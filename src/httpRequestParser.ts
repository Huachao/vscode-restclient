"use strict";

import { ArrayUtility } from './common/arrayUtility';
import { HttpRequest } from './models/httpRequest';
import { IRequestParser } from './models/IRequestParser';
import { RequestParserUtil } from './requestParserUtil';
import { HttpClient } from './httpClient';
import { MimeUtility } from './mimeUtility';
import { getWorkspaceRootPath } from './workspaceUtility';
import { EOL } from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { Stream } from 'stream';

const CombinedStream = require('combined-stream');
const encodeurl = require('encodeurl');

export class HttpRequestParser implements IRequestParser {
    private static readonly defaultMethod = 'GET';
    private static readonly uploadFromFileSyntax = /^<\s+([\S]*)\s*$/;

    public parseHttpRequest(requestRawText: string, requestAbsoluteFilePath: string): HttpRequest {
        // parse follows http://www.w3.org/Protocols/rfc2616/rfc2616-sec5.html
        // split the request raw text into lines
        let lines: string[] = requestRawText.split(EOL);

        // skip leading empty lines
        lines = ArrayUtility.skipWhile(lines, value => value.trim() === '');

        // skip trailing empty lines
        lines = ArrayUtility.skipWhile(lines.reverse(), value => value.trim() === '').reverse();

        if (lines.length === 0) {
            return null;
        }

        // parse request line
        let requestLine = HttpRequestParser.parseRequestLine(lines[0]);

        // get headers range
        let headers: { [key: string]: string };
        let body: string | Stream;
        let bodyLines: string[] = [];
        let headerStartLine = ArrayUtility.firstIndexOf(lines, value => value.trim() !== '', 1);
        if (headerStartLine !== -1) {
            if (headerStartLine === 1) {
                // parse request headers
                let firstEmptyLine = ArrayUtility.firstIndexOf(lines, value => value.trim() === '', headerStartLine);
                let headerEndLine = firstEmptyLine === -1 ? lines.length : firstEmptyLine;
                let headerLines = lines.slice(headerStartLine, headerEndLine);
                let index = 0;
                let queryString = '';
                for (; index < headerLines.length; ) {
                    let headerLine = (headerLines[index]).trim();
                    if (~['?', '&'].indexOf(headerLine[0])) {
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
                let bodyStartLine = ArrayUtility.firstIndexOf(lines, value => value.trim() !== '', headerEndLine);
                if (bodyStartLine !== -1) {
                    let contentTypeHeader = HttpRequestParser.getContentTypeHeader(headers);
                    firstEmptyLine = ArrayUtility.firstIndexOf(lines, value => value.trim() === '', bodyStartLine);
                    let bodyEndLine = MimeUtility.isMultiPartFormData(contentTypeHeader) || firstEmptyLine === -1 ? lines.length : firstEmptyLine;
                    bodyLines = lines.slice(bodyStartLine, bodyEndLine);
                }
            } else {
                // parse body, since no headers provided
                let firstEmptyLine = ArrayUtility.firstIndexOf(lines, value => value.trim() === '', headerStartLine);
                let bodyEndLine = firstEmptyLine === -1 ? lines.length : firstEmptyLine;
                bodyLines = lines.slice(headerStartLine, bodyEndLine);
            }
        }

        // if Host header provided and url is relative path, change to absolute url
        if (HttpClient.getHeaderValue(headers, 'Host') && requestLine.url[0] === '/') {
            let host = HttpClient.getHeaderValue(headers, 'Host');
            let [, port] = host.split(':');
            let scheme = port === '443' ? 'https' : 'http';
            requestLine.url = `${scheme}://${host}${requestLine.url}`;
        }

        // parse body
        let contentTypeHeader = HttpRequestParser.getContentTypeHeader(headers);
        body = HttpRequestParser.parseRequestBody(bodyLines, requestAbsoluteFilePath, contentTypeHeader);
        if (body && typeof body === 'string' && MimeUtility.isFormUrlEncoded(HttpRequestParser.getContentTypeHeader(headers))) {
            body = encodeurl(body);
        }

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
            url = line.trim().substring(method.length).trim();
            let match = words[words.length - 1].match(/HTTP\/.*/gi);
            if (match) {
                url = url.substring(0, url.lastIndexOf(words[words.length - 1])).trim();
            }
        }

        return {
            method: method,
            url: url
        };
    }

    private static parseRequestBody(lines: string[], requestFileAbsolutePath: string, contentTypeHeader: string): string | Stream {
        if (!lines || lines.length === 0) {
            return <string>null;
        }

        // Check if needed to upload file
        if (lines.every(line => !HttpRequestParser.uploadFromFileSyntax.test(line))) {
            return lines.join(EOL);
        } else {
            let combinedStream = CombinedStream.create({ maxDataSize: 10 * 1024 * 1024 });
            for (const [index, line] of lines.entries()) {
                if (HttpRequestParser.uploadFromFileSyntax.test(line)) {
                    let groups = HttpRequestParser.uploadFromFileSyntax.exec(line);
                    if (groups !== null && groups.length === 2) {
                        let fileUploadPath = groups[1];
                        let fileAbsolutePath = HttpRequestParser.resolveFilePath(fileUploadPath, requestFileAbsolutePath);
                        if (fileAbsolutePath && fs.existsSync(fileAbsolutePath)) {
                            combinedStream.append(fs.createReadStream(fileAbsolutePath));
                        } else {
                            combinedStream.append(line);
                        }
                    }
                } else {
                    combinedStream.append(line);
                }

                if (index !== lines.length - 1) {
                    combinedStream.append(HttpRequestParser.getLineEnding(contentTypeHeader));
                }
            }

            return combinedStream;
        }
    }

    private static getLineEnding(contentTypeHeader: string) {
        return MimeUtility.isMultiPartFormData(contentTypeHeader) ? '\r\n' : EOL;
    }

    private static resolveFilePath(refPath: string, httpFilePath: string): string {
        if (path.isAbsolute(refPath)) {
            return fs.existsSync(refPath) ? refPath : null;
        }

        let absolutePath;
        let rootPath = getWorkspaceRootPath();
        if (rootPath) {
            absolutePath = path.join(rootPath, refPath);
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
            for (let header in headers) {
                if (header.toLowerCase() === 'content-type') {
                    return headers[header];
                }
            }
        }

        return null;
    }
}