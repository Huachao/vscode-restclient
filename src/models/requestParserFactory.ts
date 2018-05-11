"use strict";

import { IRequestParser } from '../models/IRequestParser';
import { CurlRequestParser } from '../utils/curlRequestParser';
import { HttpRequestParser } from '../utils/httpRequestParser';

export interface IRequestParserFactory {
    createRequestParser(rawHttpRequest: string);
}

export class RequestParserFactory implements IRequestParserFactory {
    public createRequestParser(rawHttpRequest: string): IRequestParser {
        if (rawHttpRequest.trim().toLowerCase().startsWith('curl'.toLowerCase())) {
            return new CurlRequestParser();
        } else {
            return new HttpRequestParser();
        }
    }
}