'use strict';

import * as adal from 'adal-node';

export class AadTokenCache {
    private static cache = new Map<string, adal.TokenResponse>();

    public static get(key: string): adal.TokenResponse {
        return AadTokenCache.cache.get(key);
    }

    public static set(key: string, value: adal.TokenResponse) {
        AadTokenCache.cache.set(key, value);
    }

    public static clear(): void {
        AadTokenCache.cache.clear();
    }
}