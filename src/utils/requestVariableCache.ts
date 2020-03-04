import { Event, EventEmitter } from "vscode";
import { RequestVariableCacheKey } from "../models/requestVariableCacheKey";
import { RequestVariableCacheValue } from '../models/requestVariableCacheValue';
import { RequestVariableEvent } from '../models/requestVariableEvent';

export class RequestVariableCache {
    private static cache: Map<string, RequestVariableCacheValue> = new Map<string, RequestVariableCacheValue>();

    private static readonly eventEmitter = new EventEmitter<RequestVariableEvent>();

    public static get onDidCreateNewRequestVariable(): Event<RequestVariableEvent> {
        return this.eventEmitter.event;
    }

    public static add(cacheKey: RequestVariableCacheKey, value: RequestVariableCacheValue) {
        this.cache.set(cacheKey.getCacheKey(), value);
        const { key: name, document } = cacheKey;
        this.eventEmitter.fire({ name, document });
    }

    public static has(cacheKey: RequestVariableCacheKey): boolean {
        return this.cache.has(cacheKey.getCacheKey());
    }

    public static get(cacheKey: RequestVariableCacheKey): RequestVariableCacheValue | undefined {
        return this.cache.get(cacheKey.getCacheKey());
    }

    public static remove(cacheKey: RequestVariableCacheKey) {
        this.cache.delete(cacheKey.getCacheKey());
    }
}