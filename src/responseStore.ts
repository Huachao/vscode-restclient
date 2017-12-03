"use strict";

import { HttpResponse } from './models/httpResponse';

export class ResponseStore {
    public static VariableCache: Map<string, HttpResponse> = new Map<string, HttpResponse>();    
    private static cache: Map<string, HttpResponse> = new Map<string, HttpResponse>();
    private static lastResponseUri: string = null;

    public static get size(): number {
        return ResponseStore.cache.size;
    }

    public static add(uri: string, response: HttpResponse, responseVar?: string) {
        ResponseStore.cache.set(uri, response);
        if (responseVar) {
            ResponseStore.VariableCache.set(responseVar, response);            
        }
        ResponseStore.lastResponseUri = uri;
    }

    public static get(uri: string): HttpResponse {
        return ResponseStore.cache.get(uri);
    }

    public static remove(uri: string) {
        if (ResponseStore.cache.has(uri)) {
            ResponseStore.cache.delete(uri);
        }
    }

    public static getLatestResponse(): HttpResponse {
        return ResponseStore.lastResponseUri !== null
            ? ResponseStore.get(ResponseStore.lastResponseUri)
            : null;
    }
}