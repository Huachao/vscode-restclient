"use strict";

import { Uri, extensions } from 'vscode';
import { BaseTextDocumentContentProvider } from './baseTextDocumentContentProvider';
import * as Constants from '../constants';
import * as path from 'path';

const hljs = require('highlight.js');
const codeHighlightLinenums = require('code-highlight-linenums');

export class CodeSnippetTextDocumentContentProvider extends BaseTextDocumentContentProvider {
    private static cssFilePath: string = path.join(extensions.getExtension(Constants.ExtensionId).extensionPath, Constants.CSSFolderName, Constants.CSSFileName);

    public constructor(public convertResult: string, public lang: string) {
        super();
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
                    <a id="scroll-to-top" role="button" aria-label="scroll to top" onclick="scroll(0,0)"><span class="icon"></span></a>
                </div>
            </body>`;
        }
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