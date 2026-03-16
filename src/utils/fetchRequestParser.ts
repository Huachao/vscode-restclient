import { RequestHeaders } from '../models/base';
import { IRestClientSettings } from '../models/configurationSettings';
import { HttpRequest } from '../models/httpRequest';
import { RequestParser } from '../models/requestParser';
import { hasHeader } from './misc';

const DefaultContentType: string = 'application/json';

export class FetchRequestParser implements RequestParser {

    private readonly fetchRegex: RegExp = /^\s*fetch\s*\(\s*(?:'([^']+)'|"([^"]+)"|`([^`]+)`)\s*(?:,\s*(\{[\s\S]*\}))?\s*\)\s*;?\s*$/i;

    public constructor(private readonly requestRawText: string, private readonly settings: IRestClientSettings) {
    }

    public async parseHttpRequest(name?: string): Promise<HttpRequest> {
        const match = this.fetchRegex.exec(this.requestRawText);
        if (!match) {
            throw new Error('Invalid fetch request format.');
        }

        const url = match[1] || match[2] || match[3];
        const optionsStr = match[4];

        let options: any = {};
        if (optionsStr) {
            try {
                options = new Function(`return ${optionsStr}`)();
            } catch (error) {
                // Ignore parse error and keep options as empty
            }
        }

        const method = (options.method || 'GET').toUpperCase();

        const headers: RequestHeaders = { ...this.settings.defaultHeaders };
        if (options.headers) {
            for (const [key, value] of Object.entries(options.headers)) {
                headers[key] = value as string;
            }
        }

        let body = options.body;
        if (body === null || body === undefined) {
            body = undefined;
        } else if (typeof body !== 'string') {
            body = JSON.stringify(body);
        }

        if (body && !hasHeader(headers, 'content-type')) {
            headers['Content-Type'] = DefaultContentType;
        }

        return new HttpRequest(method, url, headers, body, body, name);
    }
}
