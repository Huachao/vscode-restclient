import { Range } from "vscode";

"use strict";

export class RequestLines {
    public constructor(
        public range: Range,
        public requestDocumentUri: string,
        public reponseVar?: string) {
    }
}