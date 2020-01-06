import { TextDocument } from "vscode";
import { DocumentWrapper } from "./DocumentWrapper";

export class DocumentWrapperVS implements DocumentWrapper {
    public documentWrapperType: string;

    get version(): number {
        return this.document.version;
    }

    get fileName(): string {
        return this.document.fileName;
    }

    getPath(): string {
        return this.document.uri.toString();
    }

    getText(): string {
        return this.document.getText();
    }

    public constructor(public document: TextDocument) {
        this.documentWrapperType = "vscode";
    }

    public static unwrap(document: DocumentWrapper): TextDocument {
        return (document as DocumentWrapperVS)?.document;
    }
}
