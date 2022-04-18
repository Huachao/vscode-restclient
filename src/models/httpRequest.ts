import { Stream } from 'stream';
import { getContentType } from '../utils/misc';
import { RequestHeaders } from './base';

import got = require('got');

export class HttpRequest {
    public isCancelled: boolean;
    private _underlyingRequest: got.GotPromise<Buffer>;
    public constructor(
        public method: string,
        public url: string,
        public headers: RequestHeaders,
        public body?: string | Stream,
        public rawBody?: string,
        public name?: string) {
            this.method = method.toLocaleUpperCase();
            this.isCancelled = false;
    }

    public get contentType(): string | undefined {
        return getContentType(this.headers);
    }

    public setUnderlyingRequest(request: got.GotPromise<Buffer>): void {
        this._underlyingRequest = request;
    }

    public cancel(): void {
        if (!this.isCancelled) {
            this._underlyingRequest?.cancel();
            this.isCancelled = true;
        }
    }
}

export class HistoricalHttpRequest {
    public constructor(
        public method: string,
        public url: string,
        public headers: RequestHeaders,
        public body: string | undefined,
        public startTime: number) {
    }

    public static convertFromHttpRequest(httpRequest: HttpRequest, startTime: number = Date.now()): HistoricalHttpRequest {
        return new HistoricalHttpRequest(
            httpRequest.method,
            httpRequest.url,
            httpRequest.headers,
            httpRequest.rawBody,
            startTime
        );
    }
}