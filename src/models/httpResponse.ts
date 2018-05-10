"use strict";

import { getHeader } from '../utils/misc';
import { Headers } from "./base";
import { HttpRequest } from "./httpRequest";
import { HttpResponseTimingPhases } from './httpResponseTimingPhases';

export class HttpResponse {
    public constructor(
        public statusCode: number,
        public statusMessage: string,
        public httpVersion: string,
        public headers: Headers,
        public body: string,
        public elapsedMillionSeconds: number,
        public requestUrl: string,
        public bodySizeInBytes: number,
        public headersSizeInBytes: number,
        public bodyStream: Buffer,
        public timingPhases: HttpResponseTimingPhases,
        public request: HttpRequest) {
    }

    public getHeader(name: string) {
        return getHeader(this.headers, name);
    }
}