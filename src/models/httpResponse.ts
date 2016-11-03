"use strict";

export class HttpResponse {
    elapsedMillionSeconds: number;
    headers: { [key: string]: string };
    body: string;
    httpVersion: string;
    statusCode: number;
    statusMessage: string;
    requestUrl: string;

    constructor(statusCode: number, statusMessage: string, httpVersion: string, headers: { [key: string]: string }, body: string, elapsedMillionSeconds: number, requestUrl: string) {
        this.statusCode = statusCode;
        this.statusMessage = statusMessage;
        this.httpVersion = httpVersion;
        this.headers = headers;
        this.body = body;
        this.elapsedMillionSeconds = elapsedMillionSeconds;
        this.requestUrl = requestUrl;
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