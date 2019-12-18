import { TextDocument } from 'vscode';

export class RequestVariableCacheKey {
    public constructor(
        public key: string,
        public document: TextDocument) {
    }

    public getCacheKey() {
        return `${this.key}@${this.document.uri.toString()}`;
    }
}