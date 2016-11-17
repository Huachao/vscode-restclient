"use strict";

import { HttpRequest } from './models/httpRequest'
import { IRequestParser } from './models/IRequestParser'
import { RequestParserUtil } from './requestParserUtil'

var yargs = require('yargs');

export class CurlRequestParser implements IRequestParser {
    parseHttpRequest(requestRawText: string, requestAbsoluteFilePath: string): HttpRequest {
        let yargObject = yargs(CurlRequestParser.mergeIntoSingleLine(requestRawText.trim()));
        let parsedArguments = yargObject.argv;

        // parse url
        let url = parsedArguments._[1];
        if (!url) {
            url = parsedArguments.L || parsedArguments.location || parsedArguments.compressed;
        }

        // parse header
        let headers: { [key: string]: string } = {};
        if (parsedArguments.H) {
            if (!Array.isArray(parsedArguments.H)) {
                parsedArguments.H = [parsedArguments.H];
            }
            headers = RequestParserUtil.parseRequestHeaders(parsedArguments.H);
        }

        let user = parsedArguments.u || parsedArguments.user;
        if (user) {
            headers['Authorization'] = `Basic ${new Buffer(user).toString('base64')}`;
        }

        // parse body
        let body = parsedArguments.d || parsedArguments.data || parsedArguments['data-binary'];

        // parse method
        let method: string = <string>(parsedArguments.X || parsedArguments.request);
        if (!method) {
            method = body ? "POST" : "GET";
        }

        return new HttpRequest(method, url, headers, body);
    }

    private static mergeIntoSingleLine(text: string): string {
        return text.replace(/\\\r|\\\n/g, '');
    }
}