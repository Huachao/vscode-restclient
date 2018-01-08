"use strict";

import { HttpRequest } from './models/httpRequest';
import { IRequestParser } from './models/IRequestParser';
import { RequestParserUtil } from './requestParserUtil';
import { getWorkspaceRootPath } from './workspaceUtility';
import * as fs from 'fs';
import * as path from 'path';

const yargs = require('yargs');

const DefaultContentType: string = 'application/x-www-form-urlencoded';

export class CurlRequestParser implements IRequestParser {

    public parseHttpRequest(requestRawText: string, requestAbsoluteFilePath: string, parseFileContentAsStream: boolean): HttpRequest {
        let requestText = CurlRequestParser.mergeMultipleSpacesIntoSingle(
            CurlRequestParser.mergeIntoSingleLine(requestRawText.trim()));
        requestText = requestText
            .replace(/(-X)(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE)/, '$1 $2')
            .replace(/(-I|--head)/, '-X HEAD');
        let yargObject = yargs(requestText);
        let parsedArguments = yargObject.argv;

        // parse url
        let url = parsedArguments._[1];
        if (!url) {
            url = parsedArguments.L || parsedArguments.location || parsedArguments.compressed || parsedArguments.url;
        }

        // parse header
        let headers: { [key: string]: string } = {};
        let parsedHeaders = parsedArguments.H || parsedArguments.header;
        if (parsedHeaders) {
            if (!Array.isArray(parsedHeaders)) {
                parsedHeaders = [parsedHeaders];
            }
            headers = RequestParserUtil.parseRequestHeaders(parsedHeaders);
        }

        // parse cookie
        let cookieString: string = parsedArguments.b || parsedArguments.cookie;
        if (cookieString && cookieString.includes('=')) {
            // Doesn't support cookie jar
            headers['Cookie'] = cookieString;
        }

        let user = parsedArguments.u || parsedArguments.user;
        if (user) {
            headers['Authorization'] = `Basic ${new Buffer(user).toString('base64')}`;
        }

        // parse body
        let body = parsedArguments.d || parsedArguments.data || parsedArguments['data-ascii'] || parsedArguments['data-binary'];
        if (Array.isArray(body)) {
            body = body.join('&');
        }

        if (typeof body === 'string' && body[0] === '@') {
            let fileAbsolutePath = CurlRequestParser.resolveFilePath(body.substring(1), requestAbsoluteFilePath);
            if (fileAbsolutePath && fs.existsSync(fileAbsolutePath)) {
                if (parseFileContentAsStream) {
                    body = fs.createReadStream(fileAbsolutePath);
                } else {
                    body = fs.readFileSync(fileAbsolutePath).toString();
                }
            } else {
                body = body.substring(1);
            }
        }

        // Set Content-Type header to application/x-www-form-urlencoded if has body and missing this header
        if (body && !CurlRequestParser.hasContentTypeHeader(headers)) {
            headers['Content-Type'] = DefaultContentType;
        }

        // parse method
        let method: string = <string>(parsedArguments.X || parsedArguments.request);
        if (!method) {
            method = body ? "POST" : "GET";
        }

        return new HttpRequest(method, url, headers, body, body);
    }

    private static resolveFilePath(refPath: string, httpFilePath: string): string {
        if (path.isAbsolute(refPath)) {
            return fs.existsSync(refPath) ? refPath : null;
        }

        let rootPath = getWorkspaceRootPath();
        let absolutePath;
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

    private static mergeIntoSingleLine(text: string): string {
        return text.replace(/\\\r|\\\n/g, '');
    }

    private static mergeMultipleSpacesIntoSingle(text: string): string {
        return text.replace(/\s{2,}/g, ' ');
    }

    private static hasContentTypeHeader(headers: { [key: string]: string }): boolean {
        for (let header in headers) {
            if (header.toLowerCase() === 'content-type') {
                return true;
            }
        }

        return false;
    }
}