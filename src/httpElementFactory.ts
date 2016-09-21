"use strict";

import { HttpElement, ElementType } from './models/httpElement';
import * as Constants from './constants'

export class HttpElementFactory {
    static getHttpElements(line: string): HttpElement[] {
        let originalElements: HttpElement[] = [];

        // add http methods
        originalElements.push(new HttpElement('GET', ElementType.Method));
        originalElements.push(new HttpElement('POST', ElementType.Method));
        originalElements.push(new HttpElement('PUT', ElementType.Method));
        originalElements.push(new HttpElement('DELETE', ElementType.Method));
        originalElements.push(new HttpElement('PATCH', ElementType.Method));
        originalElements.push(new HttpElement('HEAD', ElementType.Method));
        originalElements.push(new HttpElement('OPTIONS', ElementType.Method));
        originalElements.push(new HttpElement('TRACE', ElementType.Method));
        originalElements.push(new HttpElement('CONNECT', ElementType.Method));

        // add http headers
        originalElements.push(new HttpElement('Accept', ElementType.Header));
        originalElements.push(new HttpElement('Accept-Charset', ElementType.Header));
        originalElements.push(new HttpElement('Accept-Encoding', ElementType.Header));
        originalElements.push(new HttpElement('Accept-Language', ElementType.Header));
        originalElements.push(new HttpElement('Accept-Datetime', ElementType.Header));
        originalElements.push(new HttpElement('Authorization', ElementType.Header));
        originalElements.push(new HttpElement('Cache-Control', ElementType.Header));
        originalElements.push(new HttpElement('Connection', ElementType.Header));
        originalElements.push(new HttpElement('Content-Length', ElementType.Header));
        originalElements.push(new HttpElement('Content-MD5', ElementType.Header));
        originalElements.push(new HttpElement('Content-Type', ElementType.Header));
        originalElements.push(new HttpElement('Cookie', ElementType.Header));
        originalElements.push(new HttpElement('Date', ElementType.Header));
        originalElements.push(new HttpElement('Expect', ElementType.Header));
        originalElements.push(new HttpElement('Forwarded', ElementType.Header));
        originalElements.push(new HttpElement('From', ElementType.Header));
        originalElements.push(new HttpElement('Host', ElementType.Header));
        originalElements.push(new HttpElement('If-Match', ElementType.Header));
        originalElements.push(new HttpElement('If-Modified-Since', ElementType.Header));
        originalElements.push(new HttpElement('If-None-Match', ElementType.Header));
        originalElements.push(new HttpElement('If-Range', ElementType.Header));
        originalElements.push(new HttpElement('If-Unmodified-Since', ElementType.Header));
        originalElements.push(new HttpElement('Max-Forwards', ElementType.Header));
        originalElements.push(new HttpElement('Origin', ElementType.Header));
        originalElements.push(new HttpElement('Pragma', ElementType.Header));
        originalElements.push(new HttpElement('Proxy-Authorization', ElementType.Header));
        originalElements.push(new HttpElement('Range', ElementType.Header));
        originalElements.push(new HttpElement('Referer', ElementType.Header));
        originalElements.push(new HttpElement('TE', ElementType.Header));
        originalElements.push(new HttpElement('User-Agent', ElementType.Header));
        originalElements.push(new HttpElement('Upgrade', ElementType.Header));
        originalElements.push(new HttpElement('Via', ElementType.Header));
        originalElements.push(new HttpElement('Warning', ElementType.Header));
        originalElements.push(new HttpElement('X-Http-Method-Override', ElementType.Header));

        // add value for specific header like Accept and Content-Type
        originalElements.push(new HttpElement("application/json", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("application/xml", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("application/javascript", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("application/xhtml+xml", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("application/zip", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("application/gzip", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("image/gif", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("image/jpeg", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("image/png", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("message/http", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("multipart/form-data", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("text/css", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("text/csv", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("text/html", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("text/plain", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));
        originalElements.push(new HttpElement("text/xml", ElementType.MIME, '^\\s*(Content-Type|Accept)\\s*\\:\\s*'));

        originalElements.push(new HttpElement(Constants.GuidVariableName, ElementType.GlobalVariable, null, Constants.GuidVariableDescription));
        originalElements.push(new HttpElement(Constants.TimeStampVariableName, ElementType.GlobalVariable, null, Constants.TimeStampVariableDescription));

        let elements: HttpElement[] = [];
        if (line) {
            originalElements.forEach(element => {
                if (element.prefix) {
                    if (line.match(new RegExp(element.prefix, 'i'))) {
                        elements.push(element);
                    }
                }
            });
        }

        if (elements.length === 0) {
            elements = originalElements.filter(e => e.type !== ElementType.MIME);
        }

        return elements;
    }
}