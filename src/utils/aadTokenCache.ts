import { AuthenticationResult } from '@azure/msal-node';

export class AadTokenCache {
    private static cache = new Map<string, AuthenticationResult>();

    public static get(key: string): AuthenticationResult | undefined {
        return this.cache.get(key);
    }

    public static set(key: string, value: AuthenticationResult) {
        this.cache.set(key, value);
    }

    public static clear(): void {
        this.cache.clear();
    }
}