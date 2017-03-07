"use strict";

import { Stream } from 'stream';

export class HttpRequest {
    public constructor(public method: string, public url: string, public headers: { [key: string]: string }, public body: string | Stream, public rawBody: string) {
    }
}

export class SerializedHttpRequest {
    public constructor(public method: string, public url: string, public headers: { [key: string]: string }, public body: string, public startTime: number) {
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