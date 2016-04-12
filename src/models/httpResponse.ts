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
}