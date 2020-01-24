import * as fs from 'fs-extra';
import { EOL } from 'os';
import * as path from 'path';
import { Stream } from 'stream';
import { Uri } from 'vscode';
import { ArrayUtility } from '../common/arrayUtility';
import { RequestHeaders } from '../models/base';
import { RestClientSettings } from '../models/configurationSettings';
import { FormParamEncodingStrategy } from '../models/formParamEncodingStrategy';
import { HttpRequest } from '../models/httpRequest';
import { IRequestParser } from '../models/IRequestParser';
import { MimeUtility } from './mimeUtility';
import { getContentType, getHeader, removeHeader } from './misc';
import { RequestParserUtil } from './requestParserUtil';
import { getWorkspaceRootPath } from './workspaceUtility';

const CombinedStream = require('combined-stream');
const encodeurl = require('encodeurl');

export class HttpRequestParser implements IRequestParser {
    private readonly _restClientSettings: RestClientSettings = RestClientSettings.Instance;
    private static readonly defaultMethod = 'GET';
    private static readonly uploadFromFileSyntax = /^<\s+(.+)\s*$/;

    public constructor(public requestRawText: string) {
    }

    public parseHttpRequest(requestAbsoluteFilePath: string): HttpRequest {
        // parse follows http://www.w3.org/Protocols/rfc2616/rfc2616-sec5.html
        // split the request raw text into lines
        const lines: string[] = this.requestRawText.split(EOL);

        // parse request line
        const requestLine = HttpRequestParser.parseRequestLine(lines[0]);

        // get headers range
        let headers: RequestHeaders = {};
        let body: string | Stream | undefined;
        let variables: string | Stream | undefined;
        let bodyLines: string[] = [];
        let variableLines: string[] = [];
        let isGraphQlRequest: boolean = false;
        const headerStartLine = ArrayUtility.firstIndexOf(lines, value => value.trim() !== '', 1);
        if (headerStartLine !== -1) {
            if (headerStartLine === 1) {
                // parse request headers
                let firstEmptyLine = ArrayUtility.firstIndexOf(lines, value => value.trim() === '', headerStartLine);
                const headerEndLine = firstEmptyLine === -1 ? lines.length : firstEmptyLine;
                const headerLines = lines.slice(headerStartLine, headerEndLine);
                let index = 0;
                let queryString = '';
                for (; index < headerLines.length; ) {
                    const headerLine = (headerLines[index]).trim();
                    if (['?', '&'].includes(headerLine[0])) {
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

                // let underlying node.js module recalculate the content length
                removeHeader(headers, 'content-length');

                // get body range
                const bodyStartLine = ArrayUtility.firstIndexOf(lines, value => value.trim() !== '', headerEndLine);
                if (bodyStartLine !== -1) {
                    const requestTypeHeader = getHeader(headers, 'x-request-type');
                    const contentTypeHeader = getContentType(headers) || getContentType(this._restClientSettings.defaultHeaders);
                    firstEmptyLine = ArrayUtility.firstIndexOf(lines, value => value.trim() === '', bodyStartLine);
                    const bodyEndLine = MimeUtility.isMultiPart(contentTypeHeader) || firstEmptyLine === -1 ? lines.length : firstEmptyLine;
                    bodyLines = lines.slice(bodyStartLine, bodyEndLine);
                    if (requestTypeHeader === 'GraphQL') {
                        const variableStartLine = ArrayUtility.firstIndexOf(lines, value => value.trim() !== '', bodyEndLine);
                        if (variableStartLine !== -1) {
                            firstEmptyLine = ArrayUtility.firstIndexOf(lines, value => value.trim() === '', variableStartLine);
                            variableLines = lines.slice(variableStartLine, firstEmptyLine === -1 ? lines.length : firstEmptyLine);
                        }
                        // a request don't necessarily need variables
                        // to be considered a GraphQL request
                        isGraphQlRequest = true;
                        removeHeader(headers, 'x-request-type');
                    }
                }
            } else {
                // parse body, since no headers provided
                const firstEmptyLine = ArrayUtility.firstIndexOf(lines, value => value.trim() === '', headerStartLine);
                const bodyEndLine = firstEmptyLine === -1 ? lines.length : firstEmptyLine;
                bodyLines = lines.slice(headerStartLine, bodyEndLine);
            }
        }

        // if Host header provided and url is relative path, change to absolute url
        const host = getHeader(headers, 'Host') || getHeader(this._restClientSettings.defaultHeaders, 'host');
        if (host && requestLine.url[0] === '/') {
            const [, port] = host.toString().split(':');
            const scheme = port === '443' || port === '8443' ? 'https' : 'http';
            requestLine.url = `${scheme}://${host}${requestLine.url}`;
        }

        // shorthand syntax for localhost
        if (requestLine.url[0] === ':') {
            if (requestLine.url[1] === '/') {
                requestLine.url = `http://localhost:80${requestLine.url.slice(1)}`;
            } else {
                const [port] = requestLine.url.slice(1).split("/", 1);
                const scheme = port === '443' || port === '8443' ? 'https' : 'http';
                requestLine.url = `${scheme}://localhost${requestLine.url}`;
            }
        }

        // parse body
        const contentTypeHeader = getContentType(headers) || getContentType(this._restClientSettings.defaultHeaders);
        body = HttpRequestParser.parseRequestBody(bodyLines, requestAbsoluteFilePath, contentTypeHeader);
        if (isGraphQlRequest) {
            variables = HttpRequestParser.parseRequestBody(variableLines, requestAbsoluteFilePath, contentTypeHeader);

            const graphQlPayload = {
                query: body,
                variables: variables ? JSON.parse(variables.toString()) : {}
            };
            body = JSON.stringify(graphQlPayload);
        } else if (this._restClientSettings.formParamEncodingStrategy !== FormParamEncodingStrategy.Never && body && typeof body === 'string' && MimeUtility.isFormUrlEncoded(contentTypeHeader)) {
            if (this._restClientSettings.formParamEncodingStrategy === FormParamEncodingStrategy.Always) {
                const stringPairs = body.split('&');
                const encodedStringPairs: string[] = [];
                for (const stringPair of stringPairs) {
                    const [name, ...values] = stringPair.split('=');
                    const value = values.join('=');
                    encodedStringPairs.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
                }
                body = encodedStringPairs.join('&');
            } else {
                body = encodeurl(body);
            }
        }

        return new HttpRequest(requestLine.method, requestLine.url, headers, body, bodyLines.join(EOL));
    }

    private static parseRequestLine(line: string): { method: string, url: string } {
        // Request-Line = Method SP Request-URI SP HTTP-Version CRLF
        const words = line.split(' ').filter(Boolean);

        let method: string;
        let url: string;
        if (words.length === 1) {
            // Only provides request url
            method = HttpRequestParser.defaultMethod;
            url = words[0];
        } else {
            // Provides both request method and url
            method = words.shift()!;
            url = line.trim().substring(method.length).trim();
            const match = words[words.length - 1].match(/HTTP\/.*/gi);
            if (match) {
                url = url.substring(0, url.lastIndexOf(words[words.length - 1])).trim();
            }
        }

        return {
            method: method,
            url: url
        };
    }

    private static parseRequestBody(lines: string[], requestFileAbsolutePath: string, contentTypeHeader: string | undefined): string | Stream | undefined {
        if (lines.length === 0) {
            return undefined;
        }

        // Check if needed to upload file
        if (lines.every(line => !HttpRequestParser.uploadFromFileSyntax.test(line))) {
            if (MimeUtility.isFormUrlEncoded(contentTypeHeader)) {
                return lines.reduce((p, c, i) => {
                    p += `${(i === 0 || c.startsWith('&') ? '' : EOL)}${c}`;
                    return p;
                }, '');
            } else {
                const lineEnding = HttpRequestParser.getLineEnding(contentTypeHeader);
                let result = lines.join(lineEnding);
                if (MimeUtility.isNewlineDelimitedJSON(contentTypeHeader)) {
                    result += lineEnding;
                }
                return result;
            }
        } else {
            const combinedStream = CombinedStream.create({ maxDataSize: 10 * 1024 * 1024 });
            for (const [index, line] of lines.entries()) {
                if (HttpRequestParser.uploadFromFileSyntax.test(line)) {
                    const groups = HttpRequestParser.uploadFromFileSyntax.exec(line);
                    if (groups?.length === 2) {
                        const fileUploadPath = groups[1];
                        const fileAbsolutePath = HttpRequestParser.resolveFilePath(fileUploadPath, requestFileAbsolutePath);
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

    private static getLineEnding(contentTypeHeader: string | undefined) {
        return MimeUtility.isMultiPartFormData(contentTypeHeader) ? '\r\n' : EOL;
    }

    private static resolveFilePath(refPath: string, httpFilePath: string): string | null {
        if (path.isAbsolute(refPath)) {
            return fs.existsSync(refPath) ? refPath : null;
        }

        let absolutePath;
        const rootPath = getWorkspaceRootPath();
        if (rootPath) {
            absolutePath = path.join(Uri.parse(rootPath).fsPath, refPath);
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
}