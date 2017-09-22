"use strict";

import { HttpRequest } from "./httpRequest";
import { HttpResponseTimingPhases } from './httpResponseTimingPhases';

export class HttpResponse {
    public constructor(
        public statusCode: number,
        public statusMessage: string,
        public httpVersion: string,
        public headers: { [key: string]: string },
        public body: string,
        public elapsedMillionSeconds: number,
        public requestUrl: string,
        public bodySizeInBytes: number,
        public headersSizeInBytes: number,
        public bodyStream: Buffer,
        public timingPhases: HttpResponseTimingPhases,
        public request: HttpRequest) {
    }

    public getResponseHeaderValue(name: string) {
        if (this.headers) {
            for (let header in this.headers) {
                if (header.toLowerCase() === name.toLowerCase()) {
                    return this.headers[header];
                }
            }
        }

        return null;
    }
}