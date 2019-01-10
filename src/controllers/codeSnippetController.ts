"use strict";

import { EOL } from 'os';
import { Clipboard, env, QuickInputButtons, QuickPickItem, window } from 'vscode';
import { ArrayUtility } from "../common/arrayUtility";
import * as Constants from '../common/constants';
import { HARCookie, HARHeader, HARHttpRequest, HARPostData } from '../models/harHttpRequest';
import { HttpRequest } from '../models/httpRequest';
import { RequestParserFactory } from '../models/requestParserFactory';
import { trace } from "../utils/decorator";
import { Selector } from '../utils/selector';
import { Telemetry } from '../utils/telemetry';
import { VariableProcessor } from '../utils/variableProcessor';
import { getCurrentTextDocument } from '../utils/workspaceUtility';
import { CodeSnippetWebview } from '../views/codeSnippetWebview';

const encodeUrl = require('encodeurl');
const HTTPSnippet = require('httpsnippet');

interface CodeSnippetTargetQuickPickItem extends QuickPickItem {
    target: {
        key: string;
        title: string;
        clients: [{
            title: string;
            link: string,
            description: string
        }]
    };
}

interface CodeSnippetClientQuickPickItem extends CodeSnippetTargetQuickPickItem {
    client: {
        key: string;
        title: string;
    };
}

export class CodeSnippetController {
    private static _availableTargets = HTTPSnippet.availableTargets();
    private readonly clipboard: Clipboard;
    private _convertedResult;
    private _webview: CodeSnippetWebview;

    constructor() {
        this._webview = new CodeSnippetWebview();
        this.clipboard = env.clipboard;
    }

    public async run() {
        const editor = window.activeTextEditor;
        const document = getCurrentTextDocument();
        if (!editor || !document) {
            return;
        }

        // Get selected text of selected lines or full document
        let selectedText = new Selector().getSelectedText(editor);
        if (!selectedText) {
            return;
        }

        // remove comment lines
        let lines: string[] = selectedText.split(Constants.LineSplitterRegex).filter(l => !Constants.CommentIdentifiersRegex.test(l));
        if (lines.length === 0 || lines.every(line => line === '')) {
            return;
        }

        // remove file variables definition lines and leading empty lines
        selectedText = ArrayUtility.skipWhile(lines, l => Constants.FileVariableDefinitionRegex.test(l) || l.trim() === '').join(EOL);

        // variables replacement
        selectedText = await VariableProcessor.processRawRequest(selectedText);

        // parse http request
        let httpRequest = new RequestParserFactory().createRequestParser(selectedText).parseHttpRequest(selectedText, document.fileName);
        if (!httpRequest) {
            return;
        }

        let harHttpRequest = this.convertToHARHttpRequest(httpRequest);
        let snippet = new HTTPSnippet(harHttpRequest);

        if (CodeSnippetController._availableTargets) {
            const quickPick = window.createQuickPick();
            const targetQuickPickItems: CodeSnippetTargetQuickPickItem[] = CodeSnippetController._availableTargets.map(target => ({ label: target.title, target }));
            quickPick.title = 'Generate Code Snippet';
            quickPick.step = 1;
            quickPick.totalSteps = 2;
            quickPick.items = targetQuickPickItems;
            quickPick.matchOnDescription = true;
            quickPick.matchOnDetail = true;
            quickPick.onDidHide(() => quickPick.dispose());
            quickPick.onDidTriggerButton(() => {
                quickPick.step--;
                quickPick.buttons = [];
                quickPick.items = targetQuickPickItems;
            });
            quickPick.onDidAccept(() => {
                const selectedItem = quickPick.selectedItems[0];
                if (selectedItem) {
                    if (quickPick.step === 1) {
                        quickPick.step++;
                        quickPick.buttons = [QuickInputButtons.Back];
                        const targetItem = selectedItem as CodeSnippetTargetQuickPickItem;
                        quickPick.items = targetItem.target.clients.map(
                            client => ({
                                label: client.title,
                                description: client.description,
                                detail: client.link,
                                target: targetItem.target,
                                client
                            })
                        );
                    } else if (quickPick.step === 2) {
                        const { target: { key: tk, title: tt }, client: { key: ck, title: ct } } = (selectedItem as CodeSnippetClientQuickPickItem);
                        Telemetry.sendEvent('Generate Code Snippet', { 'target': tk, 'client': ck });
                        let result = snippet.convert(tk, ck);
                        this._convertedResult = result;

                        try {
                            this._webview.render(result, `${tt}-${ct}`, tk);
                        } catch (reason) {
                            window.showErrorMessage(reason);
                        }
                    }
                }
            });
            quickPick.show();
        } else {
            window.showInformationMessage('No available code snippet convert targets');
        }
    }

    @trace('Copy Code Snippet')
    public async copy() {
        if (this._convertedResult) {
            await this.clipboard.writeText(this._convertedResult);
        }
    }

    @trace('Copy Request As cURL')
    public async copyAsCurl() {
        const editor = window.activeTextEditor;
        const document = getCurrentTextDocument();
        if (!editor || !document) {
            return;
        }

        // Get selected text of selected lines or full document
        let selectedText = new Selector().getSelectedText(editor);
        if (!selectedText) {
            return;
        }

        // remove comment lines
        let lines: string[] = selectedText.split(Constants.LineSplitterRegex).filter(l => !Constants.CommentIdentifiersRegex.test(l));
        if (lines.length === 0 || lines.every(line => line === '')) {
            return;
        }

        // remove file variables definition lines
        selectedText = ArrayUtility.skipWhile(lines, l => Constants.FileVariableDefinitionRegex.test(l) || l.trim() === '').join(EOL);

        // variables replacement
        selectedText = await VariableProcessor.processRawRequest(selectedText);

        // parse http request
        let httpRequest = new RequestParserFactory().createRequestParser(selectedText).parseHttpRequest(selectedText, document.fileName);
        if (!httpRequest) {
            return;
        }

        let harHttpRequest = this.convertToHARHttpRequest(httpRequest);
        let snippet = new HTTPSnippet(harHttpRequest);
        let result = snippet.convert('shell', 'curl', process.platform === 'win32' ? { indent: false } : {});
        await this.clipboard.writeText(result);
    }

    private convertToHARHttpRequest(request: HttpRequest): HARHttpRequest {
        // convert headers
        let headers: HARHeader[] = [];
        for (let key in request.headers) {
            let headerValue = request.headers[key];
            if (key.toLowerCase() === 'authorization') {
                headerValue = CodeSnippetController.normalizeAuthHeader(headerValue);
            }
            headers.push(new HARHeader(key, headerValue));
        }

        // convert cookie headers
        let cookies: HARCookie[] = [];
        let cookieHeader = headers.find(header => header.name.toLowerCase() === 'cookie');
        if (cookieHeader) {
            cookieHeader.value.split(';').forEach(pair => {
                let [headerName, headerValue = ''] = pair.split('=', 2);
                cookies.push(new HARCookie(headerName.trim(), headerValue.trim()));
            });
        }

        // convert body
        let body: HARPostData = null;
        if (request.body) {
            let contentTypeHeader = headers.find(header => header.name.toLowerCase() === 'content-type');
            let mimeType: string;
            if (contentTypeHeader) {
                mimeType = contentTypeHeader.value;
            }
            if (typeof request.body === 'string') {
                let normalizedBody = request.body.split(EOL).reduce((prev, cur) => prev.concat(cur.trim()), '');
                body = new HARPostData(mimeType, normalizedBody);
            } else {
                body = new HARPostData(mimeType, request.rawBody);
            }
        }

        return new HARHttpRequest(request.method, encodeUrl(request.url), headers, cookies, body);
    }

    public dispose() {
        this._webview.dispose();
    }

    private static normalizeAuthHeader(authHeader) {
        if (authHeader) {
            let start = authHeader.indexOf(' ');
            let scheme = authHeader.substr(0, start);
            if (scheme && scheme.toLowerCase() === 'basic') {
                let params = authHeader.substr(start).trim().split(' ');
                if (params.length === 2) {
                    return 'Basic ' + Buffer.from(`${params[0]}:${params[1]}`).toString('base64');
                }
            }
        }

        return authHeader;
    }
}