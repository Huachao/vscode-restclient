'use strict';

import { commands, ViewColumn, WebviewPanel, window } from 'vscode';
import { disposeAll } from '../utils/dispose';
import { BaseWebview } from './baseWebview';

const hljs = require('highlight.js');
const codeHighlightLinenums = require('code-highlight-linenums');

export class CodeSnippetWebview extends BaseWebview {

    private readonly codeSnippetPreviewActiveContextKey = 'codeSnippetPreviewFocus';

    protected get viewType(): string {
        return 'rest-code-snippet';
    }

    public constructor() {
        super();
    }

    public async render(convertResult: string, title: string, lang: string) {
        let panel: WebviewPanel;
        if (this.panels.length === 0) {
            panel = window.createWebviewPanel(
                this.viewType,
                title,
                ViewColumn.Two,
                {
                    enableFindWidget: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [ this.styleFolderPath ]
                });

                panel.onDidDispose(() => {
                    commands.executeCommand('setContext', this.codeSnippetPreviewActiveContextKey, false);
                    this.panels.pop();
                    this._onDidCloseAllWebviewPanels.fire();
                });

                panel.onDidChangeViewState(({ webviewPanel }) => {
                    commands.executeCommand('setContext', this.codeSnippetPreviewActiveContextKey, webviewPanel.visible);
                });

                this.panels.push(panel);
        } else {
            panel = this.panels[0];
            panel.title = title;
        }

        panel.webview.html = this.getHtmlForWebview(convertResult, lang);

        commands.executeCommand('setContext', this.codeSnippetPreviewActiveContextKey, true);

        panel.reveal(ViewColumn.Two);
    }

    public dispose() {
        disposeAll(this.panels);
    }

    private getHtmlForWebview(convertResult: string, lang: string): string {
        const csp = this.getCsp();
        return `
            <head>
                <link rel="stylesheet" href="${this.styleFilePath}">
                ${csp}
            </head>
            <body>
                <div>
                    <pre><code>${codeHighlightLinenums(convertResult, { hljs, lang: this.getHighlightJsLanguageAlias(lang), start: 1 })}</code></pre>
                    <a id="scroll-to-top" role="button" aria-label="scroll to top" onclick="window.scroll(0,0)"><span class="icon"></span></a>
                </div>
            </body>`;
    }

    private getHighlightJsLanguageAlias(lang: string) {
        if (!lang || lang === 'shell') {
            return 'bash';
        }

        if (lang === 'node') {
            return 'javascript';
        }

        return lang;
    }

    private getCsp(): string {
        return `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' http: https: data: vscode-resource:; style-src 'self' 'unsafe-inline' http: https: data: vscode-resource:;">`;
    }
}
