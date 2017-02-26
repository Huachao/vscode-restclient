"use strict";

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
        public bodyStream: Buffer) {
    }

    public getResponseHeaderValue(name: string) {
        if (this.headers) {
            for (var header in this.headers) {
                if (header.toLowerCase() === name.toLowerCase()) {
                    return this.headers[header];
                }
            }
        }

        return null;
    }
}