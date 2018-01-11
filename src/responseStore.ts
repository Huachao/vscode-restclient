"use strict";

import { HttpResponse } from './models/httpResponse';

export class ResponseStore {
    private static cache: Map<string, HttpResponse> = new Map<string, HttpResponse>();
    private static lastResponseUri: string = null;

    public static get size(): number {
        return ResponseStore.cache.size;
    }

    public static add(uri: string, response: HttpResponse) {
        ResponseStore.cache.set(uri, response);
        ResponseStore.lastResponseUri = uri;
    }

    public static get(uri: string): HttpResponse {
        return ResponseStore.cache.get(uri);
    }

    public static remove(uri: string) {
        ResponseStore.cache.delete(uri);
    }

    public static getLatestResponse(): HttpResponse {
        return ResponseStore.get(ResponseStore.lastResponseUri);
    }
}