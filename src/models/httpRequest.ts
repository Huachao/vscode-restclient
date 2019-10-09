"use strict";

import { Stream } from 'stream';
import { getHeader } from '../utils/misc';
import { Headers } from './base';
import { RequestVariableCacheKey } from './requestVariableCacheKey';

export class HttpRequest {
    public constructor(
        public method: string,
        public url: string,
        public headers: Headers,
        public body: string | Stream,
        public rawBody: string,
        public requestVariableCacheKey?: RequestVariableCacheKey) {
            this.method = method.toLocaleUpperCase();
    }

    public getHeader(name: string) {
        return getHeader(this.headers, name);
    }
}

export class SerializedHttpRequest {
    public constructor(
        public method: string,
        public url: string,
        public headers: Headers,
        public body: string,
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