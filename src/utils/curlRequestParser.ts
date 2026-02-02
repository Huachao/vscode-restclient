import * as fs from 'fs-extra';
import { RequestHeaders } from '../models/base';
import { IRestClientSettings } from '../models/configurationSettings';
import { HttpRequest } from '../models/httpRequest';
import { RequestParser } from '../models/requestParser';
import { base64, hasHeader } from './misc';
import { parseRequestHeaders, resolveRequestBodyPath } from './requestParserUtil';

const yargsParser = require('yargs-parser');

const DefaultContentType: string = 'application/x-www-form-urlencoded';

export class CurlRequestParser implements RequestParser {

    public constructor(private readonly requestRawText: string, private readonly settings: IRestClientSettings) {
    }

    public async parseHttpRequest(name?: string): Promise<HttpRequest> {
        let requestText = CurlRequestParser.mergeMultipleSpacesIntoSingle(
            CurlRequestParser.mergeIntoSingleLine(this.requestRawText.trim()));
        requestText = requestText
            .replace(/(-X)(GET|POST|PUT|DELETE|PATCH|HEAD|OPTIONS|CONNECT|TRACE|LOCK|UNLOCK|PROPFIND|PROPPATCH|COPY|MOVE|MKCOL|MKCALENDAR|ACL|SEARCH)/, '$1 $2')
            .replace(/(-I|--head)(?=\s+)/, '-X HEAD');
        const parsedArguments = yargsParser.default(requestText);

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
            headers = parseRequestHeaders(parsedHeaders, this.settings.defaultHeaders, url);
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
        const dataKeys = ['d', 'data', 'data-ascii', 'data-binary', 'data-raw', 'data-urlencode'];
        const datakey = dataKeys.find(key => !!parsedArguments[key])
        let body;
        if (datakey) {
            body = parsedArguments[datakey];
            if (Array.isArray(body)) {
                body = body.join('&');
            } else  {
                if (!!parsedArguments['data-urlencode']) {
                    body = encodeURI(body.toString());
                } else {
                    body = body.toString();
                }
            }
        }

        if (typeof body === 'string' && body[0] === '@') {
            const fileAbsolutePath = await resolveRequestBodyPath(body.substring(1));
            if (fileAbsolutePath) {
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

        return new HttpRequest(method, url, headers, body, body, name);
    }

    private static mergeIntoSingleLine(text: string): string {
        return text.replace(/\\\r|\\\n/g, '');
    }

    private static mergeMultipleSpacesIntoSingle(text: string): string {
        return text.replace(/\s{2,}/g, ' ');
    }
}