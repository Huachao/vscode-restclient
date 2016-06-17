"use strict";

import { HttpElement, ElementType } from './models/httpElement';

export class HttpElementFactory {
    static getHttpElements() : HttpElement[] {
        var elements = [];

        // TODO: move these names to json files
        // add http methods
        elements.push(new HttpElement('GET', ElementType.Method));
        elements.push(new HttpElement('POST', ElementType.Method));
        elements.push(new HttpElement('PUT', ElementType.Method));
        elements.push(new HttpElement('DELETE', ElementType.Method));
        elements.push(new HttpElement('PATCH', ElementType.Method));
        elements.push(new HttpElement('HEAD', ElementType.Method));
        elements.push(new HttpElement('OPTIONS', ElementType.Method));
        elements.push(new HttpElement('TRACE', ElementType.Method));
        elements.push(new HttpElement('CONNECT', ElementType.Method));

        // add http headers
        elements.push(new HttpElement('Accept', ElementType.Header));
        elements.push(new HttpElement('Accept-Charset', ElementType.Header));
        elements.push(new HttpElement('Accept-Encoding', ElementType.Header));
        elements.push(new HttpElement('Accept-Language', ElementType.Header));
        elements.push(new HttpElement('Accept-Datetime', ElementType.Header));
        elements.push(new HttpElement('Authorization', ElementType.Header));
        elements.push(new HttpElement('Cache-Control', ElementType.Header));
        elements.push(new HttpElement('Connection', ElementType.Header));
        elements.push(new HttpElement('Content-Length', ElementType.Header));
        elements.push(new HttpElement('Content-MD5', ElementType.Header));
        elements.push(new HttpElement('Content-Type', ElementType.Header));
        elements.push(new HttpElement('Cookie', ElementType.Header));
        elements.push(new HttpElement('Date', ElementType.Header));
        elements.push(new HttpElement('Expect', ElementType.Header));
        elements.push(new HttpElement('Forwarded', ElementType.Header));
        elements.push(new HttpElement('From', ElementType.Header));
        elements.push(new HttpElement('Host', ElementType.Header));
        elements.push(new HttpElement('If-Match', ElementType.Header));
        elements.push(new HttpElement('If-Modified-Since', ElementType.Header));
        elements.push(new HttpElement('If-None-Match', ElementType.Header));
        elements.push(new HttpElement('If-Range', ElementType.Header));
        elements.push(new HttpElement('If-Unmodified-Since', ElementType.Header));
        elements.push(new HttpElement('Max-Forwards', ElementType.Header));
        elements.push(new HttpElement('Origin', ElementType.Header));
        elements.push(new HttpElement('Pragma', ElementType.Header));
        elements.push(new HttpElement('Proxy-Authorization', ElementType.Header));
        elements.push(new HttpElement('Range', ElementType.Header));
        elements.push(new HttpElement('Referer', ElementType.Header));
        elements.push(new HttpElement('TE', ElementType.Header));
        elements.push(new HttpElement('User-Agent', ElementType.Header));
        elements.push(new HttpElement('Upgrade', ElementType.Header));
        elements.push(new HttpElement('Via', ElementType.Header));
        elements.push(new HttpElement('Warning', ElementType.Header));
        elements.push(new HttpElement('X-Http-Method-Override', ElementType.Header));
        return elements;
    }
}