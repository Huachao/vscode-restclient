export interface DocumentWrapper {
    fileName: string;
    getText(): string;
    version: number;
    getPath(): string;
    documentWrapperType: string;
}
