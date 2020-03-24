import { Stream } from 'stream';
import { getContentType } from '../utils/misc';
import { RequestHeaders } from './base';

export class HttpRequest {
    public isCancelled: boolean;
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

    public cancel(): void {
        this.isCancelled = true;
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