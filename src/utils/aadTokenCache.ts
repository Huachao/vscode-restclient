import * as adal from 'adal-node';

export class AadTokenCache {
    private static cache = new Map<string, adal.TokenResponse>();

    public static get(key: string): adal.TokenResponse | undefined {
        return this.cache.get(key);
    }

    public static set(key: string, value: adal.TokenResponse) {
        this.cache.set(key, value);
    }

    public static clear(): void {
        this.cache.clear();
    }
}