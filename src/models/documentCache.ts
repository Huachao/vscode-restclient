import { DocumentWrapper } from "../utils/DocumentWrapper";

interface CacheValue<T> {
    version: number;
    value: T;
}

export class DocumentCache<T> {
    private _cache: Map<string, CacheValue<T>>;

    public constructor() {
        this._cache = new Map<string, CacheValue<T>>();
    }

    public get(document: DocumentWrapper): T | undefined {
        const result = this._cache.get(this.getKey(document));
        return result?.version === document.version ? result.value : undefined;
    }

    public set(document: DocumentWrapper, value: T): this {
        this._cache.set(this.getKey(document), { version: document.version, value });
        return this;
    }

    public delete(document: DocumentWrapper): boolean {
        return this.has(document) && this._cache.delete(this.getKey(document));
    }

    public clear(): void {
        this._cache.clear();
    }

    public has(document: DocumentWrapper): boolean {
        const key = this.getKey(document);
        return this._cache.has(key)
            && this._cache.get(key)!.version === document.version;
    }

    private getKey(document: DocumentWrapper): string {
        return `${document.getPath()}`;
    }
}