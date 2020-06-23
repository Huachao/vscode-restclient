import { Clipboard, commands, env, ExtensionContext, ViewColumn, WebviewPanel, window } from 'vscode';
import { trace } from '../utils/decorator';
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

    private readonly clipboard: Clipboard = env.clipboard;

    private activeCodeSnippet: string | undefined;

    public constructor(context: ExtensionContext) {
        super(context);

        this.context.subscriptions.push(commands.registerCommand('rest-client.copy-codesnippet', this.copy, this));
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
                    retainContextWhenHidden: true
                });

            panel.onDidDispose(() => {
                this.setPreviewActiveContext(false);
                this.panels.pop();
                this._onDidCloseAllWebviewPanels.fire();
            });

            panel.onDidChangeViewState(({ webviewPanel }) => {
                this.setPreviewActiveContext(webviewPanel.active);
            });

            panel.iconPath = this.iconFilePath;

            this.panels.push(panel);
        } else {
            panel = this.panels[0];
            panel.title = title;
        }

        panel.webview.html = this.getHtmlForWebview(panel, convertResult, lang);

        this.setPreviewActiveContext(true);
        this.activeCodeSnippet = convertResult;

        panel.reveal(ViewColumn.Two);
    }

    public dispose() {
        disposeAll(this.panels);
    }

    @trace('Copy Code Snippet')
    private async copy() {
        if (this.activeCodeSnippet) {
            await this.clipboard.writeText(this.activeCodeSnippet);
        }
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
