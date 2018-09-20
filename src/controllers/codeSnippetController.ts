"use strict";

import { EOL } from 'os';
import { window } from 'vscode';
import { ArrayUtility } from "../common/arrayUtility";
import * as Constants from '../common/constants';
import { CodeSnippetClient } from '../models/codeSnippetClient';
import { CodeSnippetClientQuickPickItem } from '../models/codeSnippetClientPickItem';
import { CodeSnippetTarget } from '../models/codeSnippetTarget';
import { CodeSnippetTargetQuickPickItem } from '../models/codeSnippetTargetPickItem';
import { HARCookie, HARHeader, HARHttpRequest, HARPostData } from '../models/harHttpRequest';
import { HttpRequest } from '../models/httpRequest';
import { RequestParserFactory } from '../models/requestParserFactory';
import { trace } from "../utils/decorator";
import { Selector } from '../utils/selector';
import { Telemetry } from '../utils/telemetry';
import { VariableProcessor } from '../utils/variableProcessor';
import { getCurrentTextDocument } from '../utils/workspaceUtility';
import { CodeSnippetWebview } from '../views/codeSnippetWebview';

const clipboardy = require('clipboardy');
const encodeUrl = require('encodeurl');
const HTTPSnippet = require('httpsnippet');

export class CodeSnippetController {
    private static _availableTargets = HTTPSnippet.availableTargets();
    private _convertedResult;
    private _webview: CodeSnippetWebview;

    constructor() {
        this._webview = new CodeSnippetWebview();
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
            let targetsPickList: CodeSnippetTargetQuickPickItem[] = CodeSnippetController._availableTargets.map(target => {
                let item = new CodeSnippetTargetQuickPickItem();
                item.label = target.title;
                item.rawTarget = new CodeSnippetTarget();
                item.rawTarget.default = target.default;
                item.rawTarget.extname = target.extname;
                item.rawTarget.key = target.key;
                item.rawTarget.title = target.title;
                item.rawTarget.clients = target.clients.map(client => {
                    let clientItem = new CodeSnippetClient();
                    clientItem.key = client.key;
                    clientItem.link = client.link;
                    clientItem.title = client.title;
                    clientItem.description = client.description;

                    return clientItem;
                });

                return item;
            });

            let item = await window.showQuickPick(targetsPickList, { placeHolder: "" });
            if (!item) {
                return;
            } else {
                let clientsPickList: CodeSnippetClientQuickPickItem[] = item.rawTarget.clients.map(client => {
                    let item = new CodeSnippetClientQuickPickItem();
                    item.label = client.title;
                    item.description = client.description;
                    item.detail = client.link;
                    item.rawClient = client;
                    return item;
                });

                let client = await window.showQuickPick(clientsPickList, { placeHolder: "" });
                if (client) {
                    Telemetry.sendEvent('Generate Code Snippet', { 'target': item.rawTarget.key, 'client': client.rawClient.key });
                    let result = snippet.convert(item.rawTarget.key, client.rawClient.key);
                    this._convertedResult = result;

                    try {
                        this._webview.render(result, `${item.rawTarget.title}-${client.rawClient.title}`, item.rawTarget.key);
                    } catch (reason) {
                        window.showErrorMessage(reason);
                    }
                }
            }
        } else {
            window.showInformationMessage('No available code snippet convert targets');
        }
    }

    @trace('Copy Code Snippet')
    public async copy() {
        if (this._convertedResult) {
            clipboardy.writeSync(this._convertedResult);
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
        clipboardy.writeSync(result);
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