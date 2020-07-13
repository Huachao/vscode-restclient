import { TextDocument } from 'vscode';

type Container<T> = {
    value: T;
    version: number;
};

export class DocumentCache<T> {
    private readonly _cache: Map<string, Container<T>>;

    public constructor(private readonly ignoreVersion: boolean = false) {
        this._cache = new Map<string, Container<T>>();
    }

    public get(document: TextDocument): T | undefined {
        const result = this._cache.get(this.getKey(document));
        if (result === undefined) {
            return undefined;
        }

        const { value, version } = result;

        return this.ignoreVersion ? value : (version === document.version ? value : undefined);
    }

    public set(document: TextDocument, value: T): this {
        this._cache.set(this.getKey(document), { value, version: document.version });
        return this;
    }

    public delete(document: TextDocument): boolean {
        return this._cache.delete(this.getKey(document));
    }

    public clear(): void {
        this._cache.clear();
    }

    public has(document: TextDocument): boolean {
        if (!this._cache.has(this.getKey(document))) {
            return false;
        }

        if (this.ignoreVersion) {
            return true;
        }

        return this._cache.get(this.getKey(document))!.version === document.version;
    }

    private getKey(document: TextDocument): string {
        return `${document.uri.toString()}`;
    }
}