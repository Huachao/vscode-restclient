"use strict";

import { Stream } from 'stream';
import { getContentType, getHeader } from '../utils/misc';
import { RequestHeaders, RequestHeaderValue } from './base';
import { RequestVariableCacheKey } from './requestVariableCacheKey';

export class HttpRequest {
    public constructor(
        public method: string,
        public url: string,
        public headers: RequestHeaders,
        public body: string | Stream | undefined,
        public rawBody: string | undefined,
        public requestVariableCacheKey?: RequestVariableCacheKey) {
            this.method = method.toLocaleUpperCase();
    }

    public getHeader(name: string): RequestHeaderValue {
        return getHeader(this.headers, name);
    }

    public get contentType(): string | undefined {
        return getContentType(this.headers);
    }
}

export class SerializedHttpRequest {
    public constructor(
        public method: string,
        public url: string,
        public headers: RequestHeaders,
        public body: string | undefined,
        public startTime: number) {
    }

    public static convertFromHttpRequest(httpRequest: HttpRequest, startTime: number = Date.now()): SerializedHttpRequest {
        return new SerializedHttpRequest(
            httpRequest.method,
            httpRequest.url,
            httpRequest.headers,
            httpRequest.rawBody,
            startTime
        );
    }
}