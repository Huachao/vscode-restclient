"use strict";

export class HttpRequest {
    method: string;
    url: string;
    headers: { [key: string]: string };
    body: string;

    constructor(method: string, url: string, headers: { [key: string]: string }, body: string) {
        this.method = method;
        this.url = url;
        this.headers = headers;
        this.body = body;
    }
}