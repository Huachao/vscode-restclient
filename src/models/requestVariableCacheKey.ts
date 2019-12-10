export class RequestVariableCacheKey {
    public constructor(
        public key: string,
        public documentUri: string) {
    }

    public getCacheKey() {
        return `${this.key}@${this.documentUri}`;
    }
}