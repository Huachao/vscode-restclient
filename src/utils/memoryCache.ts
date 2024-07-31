export class OidcPayload {
    public access_token: string;
    public refresh_token: string;
}

export class MemoryCache<T> {
    private cache = new Map<string, T>();
    private static caches = new Map<string, MemoryCache<any>>();

    public static createOrGet<T>(name: string): MemoryCache<T> {
        if (!this.caches.has(name)) {
            const cache = new MemoryCache<T>();
            this.caches.set(name, cache);
            return cache;
        }
        return this.caches.get(name) as MemoryCache<T>;
    }

    public get(key: string): T | undefined {
        return this.cache.get(key);
    }

    public set(key: string, value: T) {
        this.cache.set(key, value);
    }

    public clear(): void {
        this.cache.clear();
    }
}