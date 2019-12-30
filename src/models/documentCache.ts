import { TextDocument } from 'vscode';

export class DocumentCache<T> {
    private _cache: Map<string, T>;

    public constructor() {
        this._cache = new Map<string, T>();
    }

    public get(document: TextDocument): T | undefined {
        return this._cache.get(this.getKey(document));
    }

    public set(document: TextDocument, value: T): this {
        this._cache.set(this.getKey(document), value);
        return this;
    }

    public delete(document: TextDocument): boolean {
        return this._cache.delete(this.getKey(document));
    }

    public clear(): void {
        this._cache.clear();
    }

    public has(document: TextDocument): boolean {
        return this._cache.has(this.getKey(document));
    }

    private getKey(document: TextDocument): string {
        return `${document.uri.toString()}@${document.version}`;
    }
}