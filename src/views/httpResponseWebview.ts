'use strict';

import * as path from 'path';
import { commands, ExtensionContext, Uri, ViewColumn, WebviewPanel, window } from 'vscode';
import * as Constants from '../common/constants';
import { RequestHeaders, ResponseHeaders } from '../models/base';
import { HttpRequest } from '../models/httpRequest';
import { HttpResponse } from '../models/httpResponse';
import { PreviewOption } from '../models/previewOption';
import { trace } from '../utils/decorator';
import { disposeAll } from '../utils/dispose';
import { MimeUtility } from '../utils/mimeUtility';
import { isJSONString } from '../utils/misc';
import { ResponseFormatUtility } from '../utils/responseFormatUtility';
import { BaseWebview } from './baseWebview';

const hljs = require('highlight.js');

export class HttpResponseWebview extends BaseWebview {

    private readonly urlRegex = /(https?:\/\/[^\s"'<>\]\)]+)/gi;

    private readonly httpResponsePreviewActiveContextKey = 'httpResponsePreviewFocus';

    private readonly panelResponses: Map<WebviewPanel, HttpResponse>;

    private readonly iconFilePath: Uri;

    protected get viewType(): string {
        return 'rest-response';
    }

    private activePanel: WebviewPanel | undefined;

    public static activePreviewResponse: HttpResponse | undefined;

    public constructor(private readonly context: ExtensionContext) {
        super();

        // Init response webview map
        this.panelResponses = new Map<WebviewPanel, HttpResponse>();
        this.iconFilePath = Uri.file(path.join(this.extensionPath, Constants.ImagesFolderName, Constants.IconFileName));

        this.context.subscriptions.push(commands.registerCommand('rest-client.fold-response', () => this.foldResponseBody()));
        this.context.subscriptions.push(commands.registerCommand('rest-client.unfold-response', () => this.unfoldResponseBody()));
    }

    public async render(response: HttpResponse, column: ViewColumn) {
        const tabTitle = this.settings.requestNameAsResponseTabTitle && response.request.requestVariableCacheKey && response.request.requestVariableCacheKey.key || 'Response';
        let panel: WebviewPanel;
        if (this.settings.showResponseInDifferentTab || this.panels.length === 0) {
            panel = window.createWebviewPanel(
                this.viewType,
                `${tabTitle}(${response.elapsedMillionSeconds}ms)`,
                { viewColumn: column, preserveFocus: !this.settings.previewResponsePanelTakeFocus },
                {
                    enableFindWidget: true,
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [ this.styleFolderPath, this.scriptFolderPath ]
                });

                panel.onDidDispose(() => {
                    const response = this.panelResponses.get(panel);
                    if (response === HttpResponseWebview.activePreviewResponse) {
                        commands.executeCommand('setContext', this.httpResponsePreviewActiveContextKey, false);
                        this.activePanel = undefined;
                        HttpResponseWebview.activePreviewResponse = undefined;
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
                    commands.executeCommand('setContext', this.httpResponsePreviewActiveContextKey, webviewPanel.active);
                    this.activePanel = webviewPanel.active ? webviewPanel : undefined;
                    HttpResponseWebview.activePreviewResponse = webviewPanel.active ? this.panelResponses.get(webviewPanel) : undefined;
                });

                this.panels.push(panel);
        } else {
            panel = this.panels[this.panels.length - 1];
            panel.title = `${tabTitle}(${response.elapsedMillionSeconds}ms)`;
        }

        panel.webview.html = this.getHtmlForWebview(panel, response);

        commands.executeCommand('setContext', this.httpResponsePreviewActiveContextKey, this.settings.previewResponsePanelTakeFocus);

        panel.reveal(column, !this.settings.previewResponsePanelTakeFocus);

        this.panelResponses.set(panel, response);
        this.activePanel = panel;
        HttpResponseWebview.activePreviewResponse = response;
    }

    public dispose() {
        disposeAll(this.panels);
    }

    @trace('Fold Response')
    private foldResponseBody() {
        if (this.activePanel) {
            this.activePanel.webview.postMessage({ 'command': 'foldAll' });
        }
    }

    @trace('Unfold Response')
    private unfoldResponseBody() {
        if (this.activePanel) {
            this.activePanel.webview.postMessage({ 'command': 'unfoldAll' });
        }
    }

    private getHtmlForWebview(panel: WebviewPanel, response: HttpResponse): string {
        let innerHtml: string;
        let width = 2;
        let contentType = response.contentType;
        if (contentType) {
            contentType = contentType.trim();
        }
        if (contentType && MimeUtility.isBrowserSupportedImageFormat(contentType) && !HttpResponseWebview.isHeadRequest(response)) {
            innerHtml = `<img src="data:${contentType};base64,${response.bodyBuffer.toString('base64')}">`;
        } else {
            const code = this.highlightResponse(response);
            width = (code.split(/\r\n|\r|\n/).length + 1).toString().length;
            innerHtml = `<pre><code>${this.addLineNums(code)}</code></pre>`;
        }

        // Content Security Policy
        const nonce = new Date().getTime() + '' + new Date().getMilliseconds();
        const csp = this.getCsp(nonce);
        return `
    <head>
        <link rel="stylesheet" type="text/css" href="${panel.webview.asWebviewUri(this.styleFilePath)}">
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
            ${this.settings.disableAddingHrefLinkForLargeResponse && response.bodySizeInBytes > this.settings.largeResponseBodySizeLimitInMB * 1024 * 1024
                ? innerHtml
                : this.addUrlLinks(innerHtml)}
            <a id="scroll-to-top" role="button" aria-label="scroll to top" title="Scroll To Top"><span class="icon"></span></a>
        </div>
        <script type="text/javascript" src="${panel.webview.asWebviewUri(this.scriptFilePath)}" nonce="${nonce}" charset="UTF-8"></script>
    </body>`;
    }

    private highlightResponse(response: HttpResponse): string {
        let code = '';
        const previewOption = this.settings.previewOption;
        if (previewOption === PreviewOption.Exchange) {
            // for add request details
            const request = response.request;
            const requestNonBodyPart = `${request.method} ${request.url} HTTP/1.1
${HttpResponseWebview.formatHeaders(request.headers)}`;
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
${HttpResponseWebview.formatHeaders(response.headers)}`;
            code += hljs.highlight('http', responseNonBodyPart + (previewOption !== PreviewOption.Headers ? '\r\n' : '')).value;
        }

        if (previewOption !== PreviewOption.Headers) {
            const responseBodyPart = `${ResponseFormatUtility.formatBody(response.body, response.contentType, this.settings.suppressResponseBodyContentTypeValidationWarning)}`;
            if (this.settings.disableHighlightResonseBodyForLargeResponse &&
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
                    ? ` range-start="${foldingRanges.get(lineNum)!.start}" range-end="${foldingRanges.get(lineNum)!.end}"`
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
        return innerHtml.replace(this.urlRegex, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
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
                    result.set(prev[0] + 1, new FoldingRange(prev[0] + 1, lineIndex));
                }
            }
        }
        return result;
    }

    private static formatHeaders(headers: RequestHeaders | ResponseHeaders): string {
        let headerString = '';
        for (const header in headers) {
            if (headers.hasOwnProperty(header)) {
                let value = headers[header];
                if (typeof headers[header] !== 'string') {
                    value = <string>headers[header];
                }
                headerString += `${header}: ${value}\n`;
            }
        }
        return headerString;
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
            if (content) {
                if (isJSONString(content)) {
                    return 'json';
                }
            }
            return null;
        }
    }

    private static isHeadRequest({ request: { method } }: { request: HttpRequest }): boolean {
        return !!(method && method.toLowerCase() === 'head');
    }
}

class FoldingRange {
    public constructor(public start: number, public end: number) {
    }
}