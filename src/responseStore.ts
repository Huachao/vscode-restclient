"use strict";

import { HttpResponse } from './models/httpResponse';

export class ResponseStore {
    private static cache: Map<string, HttpResponse> = new Map<string, HttpResponse>();
    private static lastResponseUri: string = null;

    static add(uri: string, response: HttpResponse) {
        ResponseStore.cache.set(uri, response);
        ResponseStore.lastResponseUri = uri;
    }

    static get(uri: string): HttpResponse {
        return ResponseStore.cache.get(uri);
    }

    static getLatestResponse(): HttpResponse {
        return ResponseStore.lastResponseUri !== null
                ? ResponseStore.get(ResponseStore.lastResponseUri)
                : null;
    }
}