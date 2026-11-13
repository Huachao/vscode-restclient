import * as fs from 'fs-extra';
import * as os from 'os';
import { Clipboard, commands, env, ExtensionContext, l10n, Uri, ViewColumn, WebviewPanel, window, workspace } from 'vscode';
import { registerCommandSafely } from '../utils/safeCommands';
import { SystemSettings } from '../models/configurationSettings';
import { HttpRequest } from '../models/httpRequest';
import { summarize } from '../utils/assertionReport';
import { HttpResponse } from '../models/httpResponse';
import { PreviewOption } from '../models/previewOption';
import { disposeAll } from '../utils/dispose';
import { MimeUtility } from '../utils/mimeUtility';
import { base64, formatHeaders, getHeader, isJSONString } from '../utils/misc';
import { ResponseMeta } from '../utils/httpClient';
import { ResponseFormatUtility } from '../utils/responseFormatUtility';
import { UserDataManager } from '../utils/userDataManager';
import { BaseWebview } from './baseWebview';

const hljs = require('highlight.js');
const contentDisposition = require('content-disposition');

const OPEN = l10n.t('Open');
const COPYPATH = l10n.t('Copy Path');

type FoldingRange = [number, number];

const escapeHtml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export class HttpResponseWebview extends BaseWebview {

    private readonly urlRegex = /(https?:\/\/[^\s"'<>\]\)\\]+)/gi;

    private readonly panelResponses: Map<WebviewPanel, HttpResponse>;

    private readonly clipboard: Clipboard = env.clipboard;

    protected get viewType(): string {
        return 'rest-response';
    }

    protected get previewActiveContextKey(): string {
        return 'httpResponsePreviewFocus';
    }

    protected get isHTMLResponse(): string {
        return 'isHTMLResponse';
    }

    private get activeResponse(): HttpResponse | undefined {
        return this.activePanel ? this.panelResponses.get(this.activePanel) : undefined;
    }

    private setIsHTMLResponse(response: HttpResponse | undefined) {
        if (response?.headers['Content-Type']?.includes('text/html')) {
            commands.executeCommand('setContext', this.isHTMLResponse, true);
        } else {
            commands.executeCommand('setContext', this.isHTMLResponse, false);
        }
    }

    public constructor(context: ExtensionContext) {
        super(context);

        // Init response webview map
        this.panelResponses = new Map<WebviewPanel, HttpResponse>();

        this.context.subscriptions.push(registerCommandSafely('rest-client.fold-response', this.foldResponseBody, this));
        this.context.subscriptions.push(registerCommandSafely('rest-client.unfold-response', this.unfoldResponseBody, this));
        this.context.subscriptions.push(registerCommandSafely('rest-client.preview-html-response-body', this.previewResponseBody, this));
        this.context.subscriptions.push(registerCommandSafely('rest-client.show-raw-response', this.showRawResponse, this));

        this.context.subscriptions.push(registerCommandSafely('rest-client.copy-response-body', this.copyBody, this));
        this.context.subscriptions.push(registerCommandSafely('rest-client.save-response', this.save, this));
        this.context.subscriptions.push(registerCommandSafely('rest-client.save-response-body', this.saveBody, this));
    }

    public async render(response: HttpResponse, column: ViewColumn) {
        const panel = this.getPanel(column, this.getTitle(response));
        this.streamingPanel = undefined;

        panel.webview.html = this.getHtmlForWebview(panel, response);

        this.setPreviewActiveContext(this.settings.previewResponsePanelTakeFocus);

        panel.reveal(column, !this.settings.previewResponsePanelTakeFocus);

        this.panelResponses.set(panel, response);
        this.activePanel = panel;

        this.setIsHTMLResponse(this.activeResponse);
    }

    private streamingPanel: WebviewPanel | undefined;

    /** Opens (or reuses) the panel with the status line and the headers; the body arrives in chunks. */
    public startStreaming(request: HttpRequest, meta: ResponseMeta, column: ViewColumn) {
        const prefix = (this.settings.requestNameAsResponseTabTitle && request.name) || 'Response';
        const panel = this.getPanel(column, `${prefix} (streaming…)`);
        const header = hljs.highlight('http', `HTTP/${meta.version} ${meta.status} ${meta.message}\n${formatHeaders(meta.headers)}`).value;
        const nonce = new Date().getTime() + '' + new Date().getMilliseconds();
        panel.webview.html = `
    <head>
        <link rel="stylesheet" type="text/css" href="${panel.webview.asWebviewUri(this.baseFilePath)}">
        <link rel="stylesheet" type="text/css" href="${panel.webview.asWebviewUri(this.vscodeStyleFilePath)}">
        <link rel="stylesheet" type="text/css" href="${panel.webview.asWebviewUri(this.customStyleFilePath)}">
        ${this.getSettingsOverrideStyles(2)}
        ${this.getCsp(nonce)}
    </head>
    <body>
        <div>
            <pre><code>${header}</code></pre>
            <pre id="stream" class="stream"></pre>
        </div>
        <script type="text/javascript" src="${panel.webview.asWebviewUri(this.scriptFilePath)}" nonce="${nonce}" charset="UTF-8"></script>
    </body>`;
        panel.reveal(column, !this.settings.previewResponsePanelTakeFocus);
        this.streamingPanel = panel;
        this.activePanel = panel;
    }

    // The keys below are a contract with webview/main.js, which is plain
    // JavaScript outside the TypeScript program: nothing type-checks it. They
    // are spelled out rather than written as shorthand so that renaming a
    // variable here cannot silently rename a message key there.
    public appendChunk(text: string) {
        this.streamingPanel?.webview.postMessage({ command: 'chunk', text: text });
    }

    public finishStreaming(note: string) {
        this.streamingPanel?.webview.postMessage({ command: 'end', note: note });
        this.streamingPanel = undefined;
    }

    private getPanel(column: ViewColumn, title: string): WebviewPanel {
        let panel: WebviewPanel;
        if (this.settings.showResponseInDifferentTab || this.panels.length === 0) {
            panel = window.createWebviewPanel(
                this.viewType,
                title,
                { viewColumn: column, preserveFocus: !this.settings.previewResponsePanelTakeFocus },
                {
                    enableFindWidget: true,
                    enableScripts: true,
                    retainContextWhenHidden: true
                });

            panel.onDidDispose(() => {
                if (panel === this.activePanel) {
                    this.setPreviewActiveContext(false);
                    this.activePanel = undefined;
                    this.setIsHTMLResponse(undefined);
                }

                const index = this.panels.findIndex(v => v === panel);
                if (index !== -1) {
                    this.panels.splice(index, 1);
                    this.panelResponses.delete(panel);
                }
                if (this.panels.length === 0) {
                    this._onDidCloseAllWebviewPanels.fire();
                }
            });

            panel.iconPath = this.iconFilePath;

            panel.onDidChangeViewState(({ webviewPanel }) => {
                const active = this.panels.some(p => p.active);
                this.setPreviewActiveContext(active);
                this.activePanel = webviewPanel.active ? webviewPanel : undefined;
                this.setIsHTMLResponse(this.activeResponse);
            });

            this.panels.push(panel);
        } else {
            panel = this.panels[this.panels.length - 1];
            panel.title = title;
        }
        return panel;
    }

    public dispose() {
        disposeAll(this.panels);
    }

    private foldResponseBody() {
        this.activePanel?.webview.postMessage({ 'command': 'foldAll' });
    }

    private unfoldResponseBody() {
        this.activePanel?.webview.postMessage({ 'command': 'unfoldAll' });
    }

    private previewResponseBody() {
        if (this.activeResponse && this.activePanel) {
            this.activePanel.webview.html = this.activeResponse.body;
        }
    }

    private showRawResponse() {
        if (this.activeResponse && this.activePanel) {
            this.activePanel.webview.html = this.getHtmlForWebview(this.activePanel, this.activeResponse);
        }
    }

    private async copyBody() {
        if (this.activeResponse) {
            await this.clipboard.writeText(this.activeResponse.body);
        }
    }

    private async save() {
        if (this.activeResponse) {
            const fullResponse = this.getFullResponseString(this.activeResponse);
            const defaultFilePath = UserDataManager.getResponseSaveFilePath(`Response-${Date.now()}.http`);
            try {
                await this.openSaveDialog(defaultFilePath, fullResponse);
            } catch {
                window.showErrorMessage(l10n.t('Failed to save latest response to disk.'));
            }
        }
    }

    private async saveBody() {
        if (this.activeResponse) {
            const fileName = HttpResponseWebview.getResponseBodyOuptutFilename(this.activeResponse, this.settings);
            const defaultFilePath = UserDataManager.getResponseBodySaveFilePath(fileName);

            try {
                await this.openSaveDialog(defaultFilePath, this.activeResponse.bodyBuffer);
            } catch {
                window.showErrorMessage(l10n.t('Failed to save latest response body to disk'));
            }
        }
    }

    private static getResponseBodyOuptutFilename(activeResponse: HttpResponse, settings: SystemSettings) {
        if (settings.useContentDispositionFilename) {
            const cdHeader = getHeader(activeResponse.headers, 'content-disposition');
            if (cdHeader) {
                const disposition = contentDisposition.parse(cdHeader);
                if ((disposition?.type === "attachment" || disposition?.type === "inline") && disposition?.parameters?.hasOwnProperty("filename")) {
                    const serverProvidedFilename = disposition.parameters.filename;
                    return serverProvidedFilename;
                }
            }
        }

        const extension = MimeUtility.getExtension(activeResponse.contentType, settings.mimeAndFileExtensionMapping);
        const defaultFileName = !extension ? `Response-${Date.now()}` : `Response-${Date.now()}.${extension}`;
        return defaultFileName;
    }

    private getTitle(response: HttpResponse): string {
        const prefix = (this.settings.requestNameAsResponseTabTitle && response.request.name) || 'Response';
        return `${prefix}(${response.timingPhases.total ?? 0}ms)`;
    }

    private getFullResponseString(response: HttpResponse): string {
        const statusLine = `HTTP/${response.httpVersion} ${response.statusCode} ${response.statusMessage}${os.EOL}`;
        const headerString = formatHeaders(response.headers);
        const body = response.body ? `${os.EOL}${response.body}` : '';
        return `${statusLine}${headerString}${body}`;
    }

    private async openSaveDialog(path: string, content: string | Buffer) {
        const uri = await window.showSaveDialog({ defaultUri: Uri.file(path) });
        if (!uri) {
            return;
        }

        const filePath = uri.fsPath;
        await fs.writeFile(filePath, content, { flag: 'w' });
        const btn = await window.showInformationMessage(l10n.t('Saved to {0}', filePath), { title: OPEN }, { title: COPYPATH });
        if (btn?.title === OPEN) {
            workspace.openTextDocument(filePath).then(window.showTextDocument);
        } else if (btn?.title === COPYPATH) {
            await this.clipboard.writeText(filePath);
        }
    }

    private getHtmlForWebview(panel: WebviewPanel, response: HttpResponse): string {
        let innerHtml: string;
        let width = 2;
        let contentType = response.contentType;
        if (contentType) {
            contentType = contentType.trim();
        }
        if (MimeUtility.isBrowserSupportedImageFormat(contentType) && !HttpResponseWebview.isHeadRequest(response)) {
            innerHtml = `<img src="data:${contentType};base64,${base64(response.bodyBuffer)}">`;
        } else {
            const code = this.highlightResponse(response);
            width = (code.split(/\r\n|\r|\n/).length + 1).toString().length;
            innerHtml = `<pre><code>${this.addLineNums(code)}</code></pre>`;
        }

        const assertionsHtml = this.getAssertionsHtml(response);

        // Content Security Policy
        const nonce = new Date().getTime() + '' + new Date().getMilliseconds();
        const csp = this.getCsp(nonce);
        return `
    <head>
        <link rel="stylesheet" type="text/css" href="${panel.webview.asWebviewUri(this.baseFilePath)}">
        <link rel="stylesheet" type="text/css" href="${panel.webview.asWebviewUri(this.vscodeStyleFilePath)}">
        <link rel="stylesheet" type="text/css" href="${panel.webview.asWebviewUri(this.customStyleFilePath)}">
        ${this.getSettingsOverrideStyles(width)}
        ${csp}
        <script nonce="${nonce}">
            document.addEventListener('DOMContentLoaded', function () {
                document.getElementById('scroll-to-top')
                        .addEventListener('click', function () { window.scrollTo(0,0); });
            });
        </script>
    </head>
    <body>
        <div>
            ${assertionsHtml}
            ${this.settings.disableAddingHrefLinkForLargeResponse && response.bodySizeInBytes > this.settings.largeResponseBodySizeLimitInMB * 1024 * 1024
                ? innerHtml
                : this.addUrlLinks(innerHtml)}
            <a id="scroll-to-top" role="button" aria-label="scroll to top" title="Scroll To Top"><span class="icon"></span></a>
        </div>
        <script type="text/javascript" src="${panel.webview.asWebviewUri(this.scriptFilePath)}" nonce="${nonce}" charset="UTF-8"></script>
    </body>`;
    }

    /**
     * The verdict of the request's `# @assert` lines, above the response: the
     * summary and one line per assertion, with the actual value for a failure.
     * Everything is the user's own text, so it is escaped.
     */
    private getAssertionsHtml(response: HttpResponse): string {
        if (!response.assertions?.length) {
            return '';
        }
        const { passed, failed, total } = summarize(response.assertions);
        const items = response.assertions.map(r =>
            `<li class="${r.passed ? 'passed' : 'failed'}"><span class="mark">${r.passed ? 'OK' : 'FAIL'}</span> ${escapeHtml(r.assertion.raw)}${r.passed ? '' : `<span class="actual"> -&gt; ${escapeHtml(r.actual)}</span>`}</li>`);
        return `<div class="assertions ${failed ? 'has-failures' : 'all-passed'}">
            <div class="summary">${escapeHtml(l10n.t('{0} of {1} assertions passed', passed, total))}</div>
            <ul>${items.join('')}</ul>
        </div>`;
    }

    private highlightResponse(response: HttpResponse): string {
        let code = '';
        const previewOption = this.settings.previewOption;
        if (previewOption === PreviewOption.Exchange) {
            // for add request details
            const request = response.request;
            const requestNonBodyPart = `${request.method} ${request.url} HTTP/1.1
${formatHeaders(request.headers)}`;
            code += hljs.highlight('http', requestNonBodyPart + '\r\n').value;
            if (request.body) {
                if (typeof request.body !== 'string') {
                    request.body = 'NOTE: Request Body From File Is Not Shown';
                }
                const requestBodyPart = `${ResponseFormatUtility.formatBody(request.body, request.contentType, true)}`;
                const bodyLanguageAlias = HttpResponseWebview.getHighlightLanguageAlias(request.contentType, request.body);
                if (bodyLanguageAlias) {
                    code += hljs.highlight(bodyLanguageAlias, requestBodyPart).value;
                } else {
                    code += hljs.highlightAuto(requestBodyPart).value;
                }
                code += '\r\n';
            }

            code += '\r\n'.repeat(2);
        }

        if (previewOption !== PreviewOption.Body) {
            const responseNonBodyPart = `HTTP/${response.httpVersion} ${response.statusCode} ${response.statusMessage}
${formatHeaders(response.headers)}`;
            code += hljs.highlight('http', responseNonBodyPart + (previewOption !== PreviewOption.Headers ? '\r\n' : '')).value;
        }

        if (previewOption !== PreviewOption.Headers) {
            const responseBodyPart = `${ResponseFormatUtility.formatBody(response.body, response.contentType, this.settings.suppressResponseBodyContentTypeValidationWarning)}`;
            if (this.settings.disableHighlightResponseBodyForLargeResponse &&
                response.bodySizeInBytes > this.settings.largeResponseBodySizeLimitInMB * 1024 * 1024) {
                code += responseBodyPart;
            } else {
                const bodyLanguageAlias = HttpResponseWebview.getHighlightLanguageAlias(response.contentType, responseBodyPart);
                if (bodyLanguageAlias) {
                    code += hljs.highlight(bodyLanguageAlias, responseBodyPart).value;
                } else {
                    code += hljs.highlightAuto(responseBodyPart).value;
                }
            }
        }

        return code;
    }

    private getSettingsOverrideStyles(width: number): string {
        return [
            '<style>',
            (this.settings.fontFamily || this.settings.fontSize || this.settings.fontWeight ? [
                'code {',
                this.settings.fontFamily ? `font-family: ${this.settings.fontFamily};` : '',
                this.settings.fontSize ? `font-size: ${this.settings.fontSize}px;` : '',
                this.settings.fontWeight ? `font-weight: ${this.settings.fontWeight};` : '',
                '}',
            ] : []).join('\n'),
            'code .line {',
            `padding-left: calc(${width}ch + 20px );`,
            '}',
            'code .line:before {',
            `width: ${width}ch;`,
            `margin-left: calc(-${width}ch + -30px );`,
            '}',
            '.line .icon {',
            `left: calc(${width}ch + 3px)`,
            '}',
            '.line.collapsed .icon {',
            `left: calc(${width}ch + 3px)`,
            '}',
            '</style>'].join('\n');
    }

    private getCsp(nonce: string): string {
        return `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src 'self' http: https: data: vscode-resource:; script-src 'nonce-${nonce}'; style-src 'self' 'unsafe-inline' http: https: data: vscode-resource:;">`;
    }

    private addLineNums(code): string {
        code = code.replace(/([\r\n]\s*)(<\/span>)/ig, '$2$1');

        code = this.cleanLineBreaks(code);

        code = code.split(/\r\n|\r|\n/);
        const max = (1 + code.length).toString().length;

        const foldingRanges = this.getFoldingRange(code);

        code = code
            .map(function (line, i) {
                const lineNum = i + 1;
                const range = foldingRanges.has(lineNum)
                    ? ` range-start="${foldingRanges.get(lineNum)![0]}" range-end="${foldingRanges.get(lineNum)![1]}"`
                    : '';
                const folding = foldingRanges.has(lineNum) ? '<span class="icon"></span>' : '';
                return `<span class="line width-${max}" start="${lineNum}"${range}>${line}${folding}</span>`;
            })
            .join('\n');
        return code;
    }

    private cleanLineBreaks(code: string): string {
        const openSpans: string[] = [],
            matcher = /<\/?span[^>]*>|\r\n|\r|\n/ig,
            newline = /\r\n|\r|\n/,
            closingTag = /^<\//;

        return code.replace(matcher, function (match: string) {
            if (newline.test(match)) {
                if (openSpans.length) {
                    return openSpans.map(() => '</span>').join('') + match + openSpans.join('');
                } else {
                    return match;
                }
            } else if (closingTag.test(match)) {
                openSpans.pop();
                return match;
            } else {
                openSpans.push(match);
                return match;
            }
        });
    }

    private addUrlLinks(innerHtml: string) {
        return innerHtml.replace(this.urlRegex, (match: string): string => {
            const encodedEndCharacters = ["&lt;", "&gt;", "&quot;", "&apos;"];
            let urlEndPosition = match.length;

            encodedEndCharacters.forEach((char) => {
                const index = match.indexOf(char);
                if (index > -1 && index < urlEndPosition) {
                    urlEndPosition = index;
                }
            });

            const url = match.substr(0, urlEndPosition);
            const extraCharacters = match.substr(urlEndPosition);

            return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url + '</a>' + extraCharacters;
        });
    }

    private getFoldingRange(lines: string[]): Map<number, FoldingRange> {
        const result = new Map<number, FoldingRange>();
        const stack: [number, number][] = [];

        const leadingSpaceCount = lines
            .map((line, index) => [index, line.search(/\S/)])
            .filter(([, num]) => num !== -1);
        for (const [index, [lineIndex, count]] of leadingSpaceCount.entries()) {
            if (index === 0) {
                continue;
            }

            const [prevLineIndex, prevCount] = leadingSpaceCount[index - 1];
            if (prevCount < count) {
                stack.push([prevLineIndex, prevCount]);
            } else if (prevCount > count) {
                let prev;
                while ((prev = stack.slice(-1)[0]) && (prev[1] >= count)) {
                    stack.pop();
                    result.set(prev[0] + 1, [prev[0] + 1, lineIndex]);
                }
            }
        }
        return result;
    }

    private static getHighlightLanguageAlias(contentType: string | undefined, content: string | null = null): string | null {
        if (MimeUtility.isJSON(contentType)) {
            return 'json';
        } else if (MimeUtility.isJavaScript(contentType)) {
            return 'javascript';
        } else if (MimeUtility.isXml(contentType)) {
            return 'xml';
        } else if (MimeUtility.isHtml(contentType)) {
            return 'html';
        } else if (MimeUtility.isCSS(contentType)) {
            return 'css';
        } else {
            // If content is provided, guess from content if not content type is matched
            if (content && isJSONString(content)) {
                return 'json';
            }
            return null;
        }
    }

    private static isHeadRequest({ request: { method } }: { request: HttpRequest }): boolean {
        return method.toLowerCase() === 'head';
    }
}
