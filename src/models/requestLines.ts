"use strict";

import { Range } from "vscode";

export class RequestLines {
    public constructor(
        public range: Range,
        public requestDocumentUri: string,
        public requestVariable?: string) {
    }
}