import * as crypto from 'crypto';
import { RequestHeaders, RequestHeaderValue, ResponseHeaders, ResponseHeaderValue } from '../models/base';


function findHeaderName(headers: RequestHeaders | ResponseHeaders, name: string): string | undefined {
    if (!headers || !name) {
        return undefined;
    }
    return Object.keys(headers).find(h => h.toLowerCase() === name.toLowerCase());
}

export function getHeader(headers: ResponseHeaders, name: string): ResponseHeaderValue;
export function getHeader(headers: RequestHeaders, name: string): RequestHeaderValue;
export function getHeader(headers: RequestHeaders | ResponseHeaders, name: string): RequestHeaderValue | ResponseHeaderValue {
    const headerName = findHeaderName(headers, name);
    return headerName && headers[headerName];
}

export function getContentType(headers: RequestHeaders | ResponseHeaders): string | undefined {
    const value = getHeader(headers, 'content-type');
    return value?.toString();
}

export function hasHeader(headers: RequestHeaders | ResponseHeaders, name: string): boolean {
    return !!findHeaderName(headers, name);
}

export function removeHeader(headers: RequestHeaders | ResponseHeaders, name: string) {
    const headerName = findHeaderName(headers, name);
    if (headerName) {
        delete headers[headerName];
    }
}

export function formatHeaders(headers: RequestHeaders | ResponseHeaders): string {
    let headerString = '';
    for (const header in headers) {
        if (headers.hasOwnProperty(header)) {
            let value = headers[header];
            // Handle set-cookie as a special case since multiple entries
            // should appear as their own header. For example:
            //     set-cookie: a=b
            //     set-cookie: c=d
            // Not:
            //     set-cookie: a=b,c=d
            if (header.toLowerCase() === 'set-cookie') {
                if (typeof value === 'string') {
                    value = [value];
                }
                for (const cookie of <Array<string>>value) {
                    headerString += `${header}: ${cookie}\n`;
                }
            } else {
                headerString += `${header}: ${value}\n`;
            }
        }
    }
    return headerString;
}

export function md5(text: string | Buffer): string {
    return crypto.createHash('md5').update(text).digest('hex');
}

export function base64(text: string | Buffer): string {
    const buffer = Buffer.isBuffer(text) ? text : Buffer.from(text);
    return buffer.toString('base64');
}

export function isJSONString(text: string): boolean {
    try {
        JSON.parse(text);
        return true;
    } catch {
        return false;
    }
}
