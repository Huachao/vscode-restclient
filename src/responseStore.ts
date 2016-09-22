"use strict";

import { HttpResponse } from './models/httpResponse'

export class ResponseStore {
    private static cache: { [key: string]: HttpResponse } = {};

    static add(uri: string, response: HttpResponse) {
        ResponseStore.cache[uri] = response;
    }

    static get(uri: string): HttpResponse {
        return ResponseStore.cache[uri];
    }
}