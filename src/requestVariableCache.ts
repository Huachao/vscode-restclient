"use strict";

import { Event, EventEmitter } from "vscode";
import { RequestVariableCacheKey } from "./models/requestVariableCacheKey";
import { RequestVariableCacheValue } from './models/requestVariableCacheValue';
import { RequestVariableEvent } from './models/requestVariableEvent';

export class RequestVariableCache {
    private static cache: Map<string, RequestVariableCacheValue> = new Map<string, RequestVariableCacheValue>();

    private static readonly eventEmitter = new EventEmitter<RequestVariableEvent>();

    public static get onDidCreateNewRequestVariable(): Event<RequestVariableEvent> {
        return RequestVariableCache.eventEmitter.event;
    }

    public static get size(): number {
        return RequestVariableCache.cache.size;
    }

    public static add(cacheKey: RequestVariableCacheKey, value: RequestVariableCacheValue) {
        RequestVariableCache.cache.set(cacheKey.getCacheKey(), value);
        RequestVariableCache.eventEmitter.fire({ cacheKey });
    }

    public static has(cacheKey: RequestVariableCacheKey): boolean {
        return RequestVariableCache.cache.has(cacheKey.getCacheKey());
    }

    public static get(cacheKey: RequestVariableCacheKey): RequestVariableCacheValue {
        return RequestVariableCache.cache.get(cacheKey.getCacheKey());
    }

    public static remove(cacheKey: RequestVariableCacheKey) {
        RequestVariableCache.cache.delete(cacheKey.getCacheKey());
    }
}