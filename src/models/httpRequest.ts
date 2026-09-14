import { CancelableRequest, Response } from 'got';
import { Stream } from 'stream';
import { getContentType } from '../utils/misc';
import { RequestHeaders } from './base';

export class HttpRequest {
    public isCancelled: boolean;
    private _underlyingRequest?: CancelableRequest<Response<Buffer>>;
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

    public setUnderlyingRequest(request: CancelableRequest<Response<Buffer>>): void {
        this._underlyingRequest = request;
    }

    public cancel(): void {
        if (!this.isCancelled) {
            this._underlyingRequest?.cancel();
            this.isCancelled = true;
        }
    }
}

function sanitizeHeaders(headers: RequestHeaders): RequestHeaders {
    if (!headers) {
        return headers;
    }
    const sanitized: RequestHeaders = {};
    const sensitivePattern = /auth|token|key|secret|password|credential|cookie|session/i;
    for (const header of Object.keys(headers)) {
        if (sensitivePattern.test(header)) {
            sanitized[header] = '***REDACTED***';
        } else {
            sanitized[header] = headers[header];
        }
    }
    return sanitized;
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
            sanitizeHeaders(httpRequest.headers),
            httpRequest.rawBody,
            startTime
        );
    }
}