"use strict";

import { getContentType, getHeader } from '../utils/misc';
import { ResponseHeaders, ResponseHeaderValue } from './base';
import { HttpRequest } from "./httpRequest";
import { HttpResponseTimingPhases } from './httpResponseTimingPhases';

export class HttpResponse {
    public constructor(
        public statusCode: number,
        public statusMessage: string,
        public httpVersion: string,
        public headers: ResponseHeaders,
        public body: string,
        public elapsedMillionSeconds: number,
        public bodySizeInBytes: number,
        public headersSizeInBytes: number,
        public bodyBuffer: Buffer,
        public timingPhases: HttpResponseTimingPhases,
        public request: HttpRequest) {
    }

    public getHeader(name: string): ResponseHeaderValue {
        return getHeader(this.headers, name);
    }

    public get contentType(): string | undefined {
        return getContentType(this.headers);
    }
}