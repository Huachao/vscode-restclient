import { CurlRequestParser } from '../utils/curlRequestParser';
import { HttpRequestParser } from '../utils/httpRequestParser';
import { IRequestParser } from './IRequestParser';

export interface IRequestParserFactory {
    createRequestParser(rawHttpRequest: string): IRequestParser;
}

export class RequestParserFactory implements IRequestParserFactory {

    private static readonly curlRegex: RegExp = /^\s*curl/i;

    public createRequestParser(rawHttpRequest: string): IRequestParser {
        if (RequestParserFactory.curlRegex.test(rawHttpRequest)) {
            return new CurlRequestParser();
        } else {
            return new HttpRequestParser();
        }
    }
}