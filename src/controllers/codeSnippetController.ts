import { EOL } from 'os';
import * as url from 'url';
import { Clipboard, env, ExtensionContext, QuickInputButtons, window } from 'vscode';
import Logger from '../logger';
import { HARCookie, HARHeader, HARHttpRequest, HARPostData } from '../models/harHttpRequest';
import { HttpRequest } from '../models/httpRequest';
import { RequestParserFactory } from '../models/requestParserFactory';
import { trace } from "../utils/decorator";
import { base64 } from '../utils/misc';
import { Selector } from '../utils/selector';
import { Telemetry } from '../utils/telemetry';
import { getCurrentTextDocument } from '../utils/workspaceUtility';
import { CodeSnippetWebview } from '../views/codeSnippetWebview';

const encodeUrl = require('encodeurl');
const HTTPSnippet = require('httpsnippet');

type CodeSnippetClient = {
    key: string;
    title: string;
    link: string;
    description: string;
};

type CodeSnippetTarget = {
    key: string;
    title: string;
    clients: CodeSnippetClient[];
};

export class CodeSnippetController {
    private readonly _availableTargets: CodeSnippetTarget[] = HTTPSnippet.availableTargets();
    private readonly clipboard: Clipboard;
    private _webview: CodeSnippetWebview;

    constructor(context: ExtensionContext) {
        this._webview = new CodeSnippetWebview(context);
        this.clipboard = env.clipboard;
    }

    public async run() {
        const editor = window.activeTextEditor;
        const document = getCurrentTextDocument();
        if (!editor || !document) {
            return;
        }

        const selectedRequest = await Selector.getRequest(editor);
        if (!selectedRequest) {
            return;
        }

        const { text } = selectedRequest;

        // parse http request
        const snippets = await this.extrSnippet(text);

        let target: Pick<CodeSnippetTarget, 'key' | 'title'> | undefined = undefined;

        const quickPick = window.createQuickPick();
        const targetQuickPickItems = this._availableTargets.map(target => ({ label: target.title, ...target }));
        quickPick.title = 'Generate Code Snippet';
        quickPick.step = 1;
        quickPick.totalSteps = 2;
        quickPick.items = targetQuickPickItems;
        quickPick.matchOnDescription = true;
        quickPick.matchOnDetail = true;
        quickPick.onDidHide(() => quickPick.dispose());
        quickPick.onDidTriggerButton(() => {
            quickPick.step!--;
            quickPick.buttons = [];
            quickPick.items = targetQuickPickItems;
            target = undefined;
        });
        quickPick.onDidAccept(() => {
            const selectedItem = quickPick.selectedItems[0];
            if (quickPick.step === 1) {
                quickPick.step++;
                quickPick.buttons = [QuickInputButtons.Back];
                target = selectedItem as any as CodeSnippetTarget;
                quickPick.items = (target as CodeSnippetTarget).clients.map(
                    client => ({
                        label: client.title,
                        detail: client.link,
                        ...client
                    })
                );
            } else if (quickPick.step === 2) {
                const { key: ck, title: ct } = selectedItem as any as CodeSnippetClient;
                const { key: tk, title: tt } = target!;
                Telemetry.sendEvent('Generate Code Snippet', { 'target': target!.key, 'client': ck });
                const result = snippets.map(s => s.convert(tk, ck)).join('\r\n');
                quickPick.hide();
                try {
                    this._webview.render(result, `${tt}-${ct}`, tk);
                } catch (reason) {
                    Logger.error('Unable to preview generated code snippet:', reason);
                    window.showErrorMessage(reason);
                }
            }
        });
        quickPick.show();
    }

    private async extrSnippet(text: string): Promise<any[]> {

        const allSnippets = await text.split(/[\r\n]*[#]{3,}[\r\n]*/).map(async x => {
            const httpRequest = await RequestParserFactory.createRequestParser(x).parseHttpRequest();
            const harHttpRequest = this.convertToHARHttpRequest(httpRequest);
            const snippet = new HTTPSnippet(harHttpRequest);
            return snippet;
        });

        return await Promise.all(allSnippets);
    }

    @trace('Copy Request As cURL')
    public async copyAsCurl() {
        const editor = window.activeTextEditor;
        const document = getCurrentTextDocument();
        if (!editor || !document) {
            return;
        }

        const selectedRequest = await Selector.getRequest(editor);
        if (!selectedRequest) {
            return;
        }

        const { text } = selectedRequest;

        // parse http request
        const httpRequest = await RequestParserFactory.createRequestParser(text).parseHttpRequest();

        const harHttpRequest = this.convertToHARHttpRequest(httpRequest);
        const addPrefix = !(url.parse(harHttpRequest.url).protocol);
        const originalUrl = harHttpRequest.url;
        if (addPrefix) {
            // Add protocol for url that doesn't specify protocol to pass the HTTPSnippet validation #328
            harHttpRequest.url = `http://${originalUrl}`;
        }
        const snippet = new HTTPSnippet(harHttpRequest);
        if (addPrefix) {
            snippet.requests[0].fullUrl = originalUrl;
        }
        const result = snippet.convert('shell', 'curl', process.platform === 'win32' ? { indent: false } : {});
        await this.clipboard.writeText(result);
    }

    private convertToHARHttpRequest(request: HttpRequest): HARHttpRequest {
        // convert headers
        const headers: HARHeader[] = [];
        for (const key in request.headers) {
            const headerValue = request.headers[key];
            if (!headerValue) {
                continue;
            }
            const headerValues = Array.isArray(headerValue) ? headerValue : [headerValue.toString()];
            for (let value of headerValues) {
                if (key.toLowerCase() === 'authorization') {
                    value = CodeSnippetController.normalizeAuthHeader(value);
                }
                headers.push(new HARHeader(key, value));
            }
        }

        // convert cookie headers
        const cookies: HARCookie[] = [];
        const cookieHeader = headers.find(header => header.name.toLowerCase() === 'cookie');
        if (cookieHeader) {
            cookieHeader.value.split(';').forEach(pair => {
                const [headerName, headerValue = ''] = pair.split('=', 2);
                cookies.push(new HARCookie(headerName.trim(), headerValue.trim()));
            });
        }

        // convert body
        let body: HARPostData | undefined;
        if (request.body) {
            const contentTypeHeader = headers.find(header => header.name.toLowerCase() === 'content-type');
            const mimeType: string = contentTypeHeader?.value ?? 'application/json';
            if (typeof request.body === 'string') {
                const normalizedBody = request.body.split(EOL).reduce((prev, cur) => prev.concat(cur.trim()), '');
                body = new HARPostData(mimeType, normalizedBody);
            } else {
                body = new HARPostData(mimeType, request.rawBody!);
            }
        }

        return new HARHttpRequest(request.method, encodeUrl(request.url), headers, cookies, body);
    }

    public dispose() {
        this._webview.dispose();
    }

    private static normalizeAuthHeader(authHeader: string) {
        if (authHeader) {
            const start = authHeader.indexOf(' ');
            const scheme = authHeader.substr(0, start);
            if (scheme.toLowerCase() === 'basic') {
                const params = authHeader.substr(start).trim().split(' ');
                if (params.length === 2) {
                    return `Basic ${base64(`${params[0]}:${params[1]}`)}`;
                }
            }
        }

        return authHeader;
    }
}