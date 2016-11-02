"use strict";

import { TextDocumentContentProvider, EventEmitter, Event, Uri, window, extensions } from 'vscode';
import * as Constants from '../constants';
import * as path from 'path';

const hljs = require('highlight.js');
const codeHighlightLinenums = require('code-highlight-linenums');

export class CodeSnippetTextDocumentContentProvider implements TextDocumentContentProvider {
    private static cssFilePath: string = path.join(extensions.getExtension(Constants.ExtensionId).extensionPath, Constants.CSSFolderName, Constants.CSSFileName);

    private _onDidChange = new EventEmitter<Uri>();
    convertResult: string;
    lang: string;

    constructor(convertResult: string, lang: string) {
        this.convertResult = convertResult;
        this.lang = lang;
    }

    public provideTextDocumentContent(uri: Uri): string {
        if (this.convertResult) {
            return `
            <head>
                <link rel="stylesheet" href="${CodeSnippetTextDocumentContentProvider.cssFilePath}">
            </head>
            <body>
                <div>
                    <pre><code>${codeHighlightLinenums(this.convertResult, { hljs: hljs, lang: this.getHighlightJsLanguageAlias(), start: 1 })}</code></pre>
                </div>
            </body>`;
        }
    }

    get onDidChange(): Event<Uri> {
        return this._onDidChange.event;
    }

    public update(uri: Uri) {
        this._onDidChange.fire(uri);
    }

    private getHighlightJsLanguageAlias() {
        if (!this.lang || this.lang === 'bash') {
            return 'bash';
        }

        if (this.lang === 'node') {
            return 'javascript';
        }

        return this.lang;
    }
}