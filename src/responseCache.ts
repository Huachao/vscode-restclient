"use strict";

import { HttpResponseCacheKey } from "./models/httpResponseCacheKey"
import { HttpResponse } from './models/httpResponse';

export class ResponseCache {
    private static cache: Map<string, HttpResponse> = new Map<string, HttpResponse>();

    public static get size(): number {
        return ResponseCache.cache.size;
    }

    public static add(cacheKey: HttpResponseCacheKey, response: HttpResponse) {
        ResponseCache.cache.set(cacheKey.getCacheKey(), response);
    }

    public static get(cacheKey: HttpResponseCacheKey): HttpResponse {
        return ResponseCache.cache.get(cacheKey.getCacheKey());
    }

    public static remove(cacheKey: HttpResponseCacheKey) {
        if (ResponseCache.cache.has(cacheKey.getCacheKey())) {
            ResponseCache.cache.delete(cacheKey.getCacheKey());
        }
    }
}