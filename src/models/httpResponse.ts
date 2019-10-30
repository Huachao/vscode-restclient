"use strict";

import { getContentType } from '../utils/misc';
import { ResponseHeaders } from './base';
import { HttpRequest } from "./httpRequest";
import { HttpResponseTimingPhases } from './httpResponseTimingPhases';

export class HttpResponse {
    public constructor(
        public statusCode: number,
        public statusMessage: string,
        public httpVersion: string,
        public headers: ResponseHeaders,
        public body: string,
        public bodySizeInBytes: number,
        public headersSizeInBytes: number,
        public bodyBuffer: Buffer,
        public timingPhases: HttpResponseTimingPhases,
        public request: HttpRequest) {
    }

    public get contentType(): string | undefined {
        return getContentType(this.headers);
    }
}