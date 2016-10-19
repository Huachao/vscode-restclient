"use strict";

export class HttpResponse {
    elapsedMillionSeconds: number;
    headers: { [key: string]: string };
    body: string;
    httpVersion: string;
    statusCode: number;
    statusMessage: string;

    constructor(statusCode: number, statusMessage: string, httpVersion: string, headers: { [key: string]: string }, body: string, elapsedMillionSeconds: number) {
        this.statusCode = statusCode;
        this.statusMessage = statusMessage;
        this.httpVersion = httpVersion;
        this.headers = headers;
        this.body = body;
        this.elapsedMillionSeconds = elapsedMillionSeconds;
    }

    public getResponseHeaderValue(name: string) {
        for (var header in this.headers) {
            if (header.toLowerCase() === name.toLowerCase()) {
                return this.headers[header];
            }
        }

        return null;
    }
}