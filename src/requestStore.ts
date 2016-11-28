"use strict";

import { HttpRequest } from './models/httpRequest'

export class RequestStore {
    private static cache: HttpRequest[] = [];

    static add(request: HttpRequest) {
        if (request) {
             RequestStore.cache.push(request);
        }
    }

    static getLatest(): HttpRequest {
        let length = RequestStore.cache.length;
        if (length < 1) {
            return null;
        }
        return RequestStore.cache[length - 1];
    }
}