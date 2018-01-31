"use strict";

import { RequestVariableCacheKey } from "./models/requestVariableCacheKey"
import { RequestVariableCacheValue } from './models/requestVariableCacheValue';
import { fireEvent } from "./events/requestVariableEvent";

export class RequestVariableCache {
    private static cache: Map<string, RequestVariableCacheValue> = new Map<string, RequestVariableCacheValue>();

    public static get size(): number {
        return RequestVariableCache.cache.size;
    }

    public static add(cacheKey: RequestVariableCacheKey, value: RequestVariableCacheValue) {
        RequestVariableCache.cache.set(cacheKey.getCacheKey(), value);
        fireEvent({ cacheKey });
    }

    public static get(cacheKey: RequestVariableCacheKey): RequestVariableCacheValue {
        return RequestVariableCache.cache.get(cacheKey.getCacheKey());
    }

    public static remove(cacheKey: RequestVariableCacheKey) {
        if (RequestVariableCache.cache.has(cacheKey.getCacheKey())) {
            RequestVariableCache.cache.delete(cacheKey.getCacheKey());
        }
    }
}