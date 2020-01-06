import { DocumentWrapper } from "../utils/DocumentWrapper";

export class RequestVariableCacheKey {
    public constructor(
        public key: string,
        public document: DocumentWrapper) {
    }

    public getCacheKey() {
        return `${this.key}@${this.document.getPath()}`;
    }
}