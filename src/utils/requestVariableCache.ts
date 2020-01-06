import { RestClientSettings } from "../models/configurationSettings";
import { RequestVariableCacheKey } from "../models/requestVariableCacheKey";
import { RequestVariableCacheValue } from '../models/requestVariableCacheValue';
import { RequestVariableEvent } from '../models/requestVariableEvent';
import { MyEvent, MyEventEmitter } from "./myEventEmitter";

export class RequestVariableCache {
    private static cache: Map<string, RequestVariableCacheValue> = new Map<string, RequestVariableCacheValue>();

    private static readonly eventEmitter: MyEventEmitter<RequestVariableEvent> = RestClientSettings.Instance.getEmitter<RequestVariableEvent>();

    public static get onDidCreateNewRequestVariable(): MyEvent<RequestVariableEvent> {
        return RequestVariableCache.eventEmitter.event;
    }

    public static add(cacheKey: RequestVariableCacheKey, value: RequestVariableCacheValue) {
        RequestVariableCache.cache.set(cacheKey.getCacheKey(), value);
        const { key: name, document } = cacheKey;
        RequestVariableCache.eventEmitter.fire({ name, document });
    }

    public static has(cacheKey: RequestVariableCacheKey): boolean {
        return RequestVariableCache.cache.has(cacheKey.getCacheKey());
    }

    public static get(cacheKey: RequestVariableCacheKey): RequestVariableCacheValue | undefined {
        return RequestVariableCache.cache.get(cacheKey.getCacheKey());
    }

    public static remove(cacheKey: RequestVariableCacheKey) {
        RequestVariableCache.cache.delete(cacheKey.getCacheKey());
    }
}