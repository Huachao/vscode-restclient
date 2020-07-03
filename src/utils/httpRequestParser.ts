import * as fs from 'fs-extra';
import { EOL } from 'os';
import { Stream } from 'stream';
import { RestClientSettings } from '../models/configurationSettings';
import { FormParamEncodingStrategy } from '../models/formParamEncodingStrategy';
import { HttpRequest } from '../models/httpRequest';
import { RequestParser } from '../models/requestParser';
import { MimeUtility } from './mimeUtility';
import { getContentType, getHeader, removeHeader } from './misc';
import { parseRequestHeaders, resolveRequestBodyPath } from './requestParserUtil';
import { VariableProcessor } from "./variableProcessor";

const CombinedStream = require('combined-stream');
const encodeurl = require('encodeurl');

enum ParseState {
    URL,
    Header,
    Body,
}

export class HttpRequestParser implements RequestParser {
    private readonly defaultMethod = 'GET';
    private readonly queryStringLinePrefix = /^\s*[&\?]/;
    private readonly inputFileSyntax = /^<\s+(.+?)\s*$/;

    public constructor(private readonly requestRawText: string, private readonly settings: RestClientSettings) {
    }

    public async parseHttpRequest(name?: string): Promise<HttpRequest> {
        // parse follows http://www.w3.org/Protocols/rfc2616/rfc2616-sec5.html
        // split the request raw text into lines
        const lines: string[] = this.requestRawText.split(EOL);
        const requestLines: string[] = [];
        const headersLines: string[] = [];
        const bodyLines: string[] = [];
        const variableLines: string[] = [];

        let state = ParseState.URL;
        let currentLine: string | undefined;
        while ((currentLine = lines.shift()) !== undefined) {
            const nextLine = lines[0];
            switch (state) {
                case ParseState.URL:
                    requestLines.push(currentLine.trim());
                    if (nextLine === undefined
                        || this.queryStringLinePrefix.test(nextLine)) {
                        // request with request line only
                    } else if (nextLine.trim()) {
                        state = ParseState.Header;
                    } else {
                        // request with no headers but has body
                        // remove the blank line before the body
                        lines.shift();
                        state = ParseState.Body;
                    }
                    break;
                case ParseState.Header:
                    headersLines.push(currentLine.trim());
                    if (nextLine?.trim() === '') {
                        // request with no headers but has body
                        // remove the blank line before the body
                        lines.shift();
                        state = ParseState.Body;
                    }
                    break;
                case ParseState.Body:
                    bodyLines.push(currentLine);
                    break;
            }
        }

        // parse request line
        const requestLine = this.parseRequestLine(requestLines.map(l => l.trim()).join(''));

        // parse headers lines
        const headers = parseRequestHeaders(headersLines, this.settings.defaultHeaders, requestLine.url);

        // let underlying node.js library recalculate the content length
        removeHeader(headers, 'content-length');

        // check request type
        const isGraphQlRequest = getHeader(headers, 'X-Request-Type') === 'GraphQL';
        if (isGraphQlRequest) {
            removeHeader(headers, 'X-Request-Type');

            // a request doesn't necessarily need variables to be considered a GraphQL request
            const firstEmptyLine = bodyLines.findIndex(value => value.trim() === '');
            if (firstEmptyLine !== -1) {
                variableLines.push(...bodyLines.splice(firstEmptyLine + 1));
                bodyLines.pop();    // remove the empty line between body and variables
            }
        }

        // parse body lines
        const contentTypeHeader = getContentType(headers);
        let body = await this.parseBody(bodyLines, contentTypeHeader);
        if (isGraphQlRequest) {
            const variables = await this.parseBody(variableLines, contentTypeHeader);

            const graphQlPayload = {
                query: body,
                variables: variables ? JSON.parse(variables.toString()) : {}
            };
            body = JSON.stringify(graphQlPayload);
        } else if (this.settings.formParamEncodingStrategy !== FormParamEncodingStrategy.Never && typeof body === 'string' && MimeUtility.isFormUrlEncoded(contentTypeHeader)) {
            if (this.settings.formParamEncodingStrategy === FormParamEncodingStrategy.Always) {
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

        // if Host header provided and url is relative path, change to absolute url
        const host = getHeader(headers, 'Host');
        if (host && requestLine.url[0] === '/') {
            const [, port] = host.toString().split(':');
            const scheme = port === '443' || port === '8443' ? 'https' : 'http';
            requestLine.url = `${scheme}://${host}${requestLine.url}`;
        }

        return new HttpRequest(requestLine.method, requestLine.url, headers, body, bodyLines.join(EOL), name);
    }

    private parseRequestLine(line: string): { method: string, url: string } {
        // Request-Line = Method SP Request-URI SP HTTP-Version CRLF
        const words = line.split(' ').filter(Boolean);

        let method: string;
        let url: string;
        if (words.length === 1) {
            // Only provides request url
            method = this.defaultMethod;
            url = words[0];
        } else {
            // Provides both request method and url
            method = words.shift()!;
            url = line.trim().substring(method.length).trim();
            if (/^HTTP\/.*$/i.test(words[words.length - 1])) {
                url = url.substring(0, url.lastIndexOf(words[words.length - 1])).trim();
            }
        }

        return { method, url };
    }

    private async parseBody(lines: string[], contentTypeHeader: string | undefined): Promise<string | Stream | undefined> {
        if (lines.length === 0) {
            return undefined;
        }

        // Check if needed to upload file
        if (lines.every(line => !this.inputFileSyntax.test(line))) {
            if (MimeUtility.isFormUrlEncoded(contentTypeHeader)) {
                return lines.reduce((p, c, i) => {
                    p += `${(i === 0 || c.startsWith('&') ? '' : EOL)}${c}`;
                    return p;
                }, '');
            } else {
                const lineEnding = this.getLineEnding(contentTypeHeader);
                let result = lines.join(lineEnding);
                if (MimeUtility.isNewlineDelimitedJSON(contentTypeHeader)) {
                    result += lineEnding;
                }
                return result;
            }
        } else {
            const combinedStream = CombinedStream.create({ maxDataSize: 10 * 1024 * 1024 });
            for (const [index, line] of lines.entries()) {
                if (this.inputFileSyntax.test(line)) {
                    const groups = this.inputFileSyntax.exec(line);
                    if (groups?.length === 2) {
                        const inputFilePath = groups[1];
                        const fileAbsolutePath = await resolveRequestBodyPath(inputFilePath);
                        if (fileAbsolutePath) {
                            const buffer = await fs.readFile(fileAbsolutePath);
                            const fileContent = buffer.toString('utf8');
                            const resolvedContent = await VariableProcessor.processRawRequest(fileContent);
                            combinedStream.append(resolvedContent);
                        } else {
                            combinedStream.append(line);
                        }
                    }
                } else {
                    combinedStream.append(line);
                }

                if (index !== lines.length - 1) {
                    combinedStream.append(this.getLineEnding(contentTypeHeader));
                }
            }

            return combinedStream;
        }
    }

    private getLineEnding(contentTypeHeader: string | undefined) {
        return MimeUtility.isMultiPartFormData(contentTypeHeader) ? '\r\n' : EOL;
    }
}