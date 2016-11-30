"use strict";

import { HttpRequest } from './models/httpRequest';

export class RequestStore {
    private static cache: Map<string, HttpRequest> = new Map<string, HttpRequest>();
    private static cancelledRequestIds: Set<string> = new Set<string>();
    private static currentRequestId: string;

    static add(requestId: string, request: HttpRequest) {
        if (request && requestId) {
            RequestStore.cache[requestId] = request;
            RequestStore.currentRequestId = requestId;
        }
    }

    static getLatest(): HttpRequest {
        if (RequestStore.cache.has(RequestStore.currentRequestId)) {
            return RequestStore.cache.get(RequestStore.currentRequestId);
        } else {
            return null;
        }
    }

    static cancel(requestId: string = null) {
        if (!requestId) {
            requestId = RequestStore.currentRequestId;
        } 
        if (!RequestStore.cancelledRequestIds.has(requestId)) {
            RequestStore.cancelledRequestIds.add(requestId);
        }
    }

    static isCancelled(requestId: string) {
        return requestId && RequestStore.cancelledRequestIds.has(requestId);
    }
}