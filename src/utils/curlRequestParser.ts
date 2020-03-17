import * as fs from 'fs-extra';
import * as path from 'path';
import { Uri } from 'vscode';
import { RequestHeaders } from '../models/base';
import { HttpRequest } from '../models/httpRequest';
import { RequestParser } from '../models/requestParser';
import { base64, hasHeader } from './misc';
import { RequestParserUtil } from './requestParserUtil';
import { getWorkspaceRootPath } from './workspaceUtility';

const yargsParser = require('yargs-parser');

const DefaultContentType: string = 'application/x-www-form-urlencoded';

export class CurlRequestParser implements RequestParser {

    public constructor(public requestRawText: string) {
    }

    public parseHttpRequest(requestAbsoluteFilePath: string): HttpRequest {
        let requestText = this.requestRawText.trim();
        requestText = CurlRequestParser.mergeMultipleSpacesIntoSingle(
            CurlRequestParser.mergeIntoSingleLine(requestText));
        requestText = requestText
            .replace(/(-X)(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE)/, '$1 $2')
            .replace(/(-I|--head)(?=\s+)/, '-X HEAD');
        const parsedArguments = yargsParser(requestText);

        // parse url
        let url = parsedArguments._[1];
        if (!url) {
            url = parsedArguments.L || parsedArguments.location || parsedArguments.compressed || parsedArguments.url;
        }

        // parse header
        let headers: RequestHeaders = {};
        let parsedHeaders = parsedArguments.H || parsedArguments.header;
        if (parsedHeaders) {
            if (!Array.isArray(parsedHeaders)) {
                parsedHeaders = [parsedHeaders];
            }
            headers = RequestParserUtil.parseRequestHeaders(parsedHeaders);
        }

        // parse cookie
        const cookieString: string = parsedArguments.b || parsedArguments.cookie;
        if (cookieString?.includes('=')) {
            // Doesn't support cookie jar
            headers['Cookie'] = cookieString;
        }

        const user = parsedArguments.u || parsedArguments.user;
        if (user) {
            headers['Authorization'] = `Basic ${base64(user)}`;
        }

        // parse body
        let body = parsedArguments.d || parsedArguments.data || parsedArguments['data-ascii'] || parsedArguments['data-binary'];
        if (Array.isArray(body)) {
            body = body.join('&');
        }

        if (typeof body === 'string' && body[0] === '@') {
            const fileAbsolutePath = CurlRequestParser.resolveFilePath(body.substring(1), requestAbsoluteFilePath);
            if (fileAbsolutePath && fs.existsSync(fileAbsolutePath)) {
                body = fs.createReadStream(fileAbsolutePath);
            } else {
                body = body.substring(1);
            }
        }

        // Set Content-Type header to application/x-www-form-urlencoded if has body and missing this header
        if (body && !hasHeader(headers, 'content-type')) {
            headers['Content-Type'] = DefaultContentType;
        }

        // parse method
        let method: string = (parsedArguments.X || parsedArguments.request) as string;
        if (!method) {
            method = body ? "POST" : "GET";
        }

        return new HttpRequest(method, url, headers, body, body, undefined);
    }

    private static resolveFilePath(refPath: string, httpFilePath: string): string | undefined {
        if (path.isAbsolute(refPath)) {
            return fs.existsSync(refPath) ? refPath : undefined;
        }

        const rootPath = getWorkspaceRootPath();
        let absolutePath: string;
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

        return undefined;
    }

    private static mergeIntoSingleLine(text: string): string {
        return text.replace(/\\\r|\\\n/g, '');
    }

    private static mergeMultipleSpacesIntoSingle(text: string): string {
        return text.replace(/\s{2,}/g, ' ');
    }
}