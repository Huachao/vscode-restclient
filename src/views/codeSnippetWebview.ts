import { ExtensionContext, ViewColumn, WebviewPanel, window } from 'vscode';
import { disposeAll } from '../utils/dispose';
import { BaseWebview } from './baseWebview';

const hljs = require('highlight.js');
const codeHighlightLinenums = require('code-highlight-linenums');

export class CodeSnippetWebview extends BaseWebview {

    protected get viewType(): string {
        return 'rest-code-snippet';
    }

    protected get previewActiveContextKey(): string {
        return 'codeSnippetPreviewFocus';
    }

    public constructor(context: ExtensionContext) {
        super(context);
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
                    this.setPrviewActiveContext(false);
                    this.panels.pop();
                    this._onDidCloseAllWebviewPanels.fire();
                });

                panel.onDidChangeViewState(({ webviewPanel }) => {
                    this.setPrviewActiveContext(webviewPanel.active);
                });

                this.panels.push(panel);
        } else {
            panel = this.panels[0];
            panel.title = title;
        }

        panel.webview.html = this.getHtmlForWebview(panel, convertResult, lang);

        this.setPrviewActiveContext(true);

        panel.reveal(ViewColumn.Two);
    }

    public dispose() {
        disposeAll(this.panels);
    }

    private getHtmlForWebview(panel: WebviewPanel, convertResult: string, lang: string): string {
        const csp = this.getCsp();
        return `
            <head>
                <link rel="stylesheet" href="${panel.webview.asWebviewUri(this.styleFilePath)}">
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
