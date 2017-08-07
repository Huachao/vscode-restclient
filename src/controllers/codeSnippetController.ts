"use strict";

import { window, Uri, Disposable, workspace, commands, ViewColumn } from 'vscode';
import { ArrayUtility } from "../common/arrayUtility";
import { RequestParserFactory } from '../models/requestParserFactory';
import { VariableProcessor } from '../variableProcessor';
import { HttpRequest } from '../models/httpRequest';
import { HARHttpRequest, HARHeader, HARCookie, HARPostData } from '../models/harHttpRequest';
import { CodeSnippetTargetQuickPickItem } from '../models/codeSnippetTargetPickItem';
import { CodeSnippetTarget } from '../models/codeSnippetTarget';
import { CodeSnippetClientQuickPickItem } from '../models/codeSnippetClientPickItem';
import { CodeSnippetClient } from '../models/codeSnippetClient';
import { CodeSnippetTextDocumentContentProvider } from '../views/codeSnippetTextDocumentContentProvider';
import { Selector } from '../selector';
import { Telemetry } from '../telemetry';
import * as Constants from '../constants';
import { EOL } from 'os';

const cp = require('copy-paste');
const HTTPSnippet = require('httpsnippet');

export class CodeSnippetController {
    private static _availableTargets = HTTPSnippet.availableTargets();
    private _previewUri: Uri = Uri.parse('rest-code-snippet://authority/generate-code-snippet');
    private _codeSnippetTextProvider: CodeSnippetTextDocumentContentProvider;
    private _registration: Disposable;
    private _selectedText;
    private _convertedResult;

    constructor() {
        this._codeSnippetTextProvider = new CodeSnippetTextDocumentContentProvider(null, null);
        this._registration = workspace.registerTextDocumentContentProvider('rest-code-snippet', this._codeSnippetTextProvider);
    }

    public async run() {
        let editor = window.activeTextEditor;
        if (!editor || !editor.document) {
            return;
        }

        // Get selected text of selected lines or full document
        let selectedText = new Selector().getSelectedText(editor);
        if (!selectedText) {
            return;
        }

        // remove comment lines
        let lines: string[] = selectedText.split(/\r?\n/g);
        selectedText = lines.filter(l => !Constants.CommentIdentifiersRegex.test(l)).join(EOL);
        if (selectedText === '') {
            return;
        }

        // remove file variables definition lines
        lines = selectedText.split(/\r?\n/g);
        selectedText = ArrayUtility.skipWhile(lines, l => Constants.VariableDefinitionRegex.test(l)).join(EOL);

        // variables replacement
        selectedText = await VariableProcessor.processRawRequest(selectedText);
        this._selectedText = selectedText;

        // parse http request
        let httpRequest = new RequestParserFactory().createRequestParser(selectedText).parseHttpRequest(selectedText, editor.document.fileName, true);
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
                    this._codeSnippetTextProvider.convertResult = result;
                    this._codeSnippetTextProvider.lang = item.rawTarget.key;
                    this._codeSnippetTextProvider.update(this._previewUri);

                    try {
                        await commands.executeCommand('vscode.previewHtml', this._previewUri, ViewColumn.Two, `${item.rawTarget.title}-${client.rawClient.title}`);
                    } catch (reason) {
                        window.showErrorMessage(reason);
                    }
                }
            }
        } else {
            window.showInformationMessage('No available code snippet convert targets');
        }
    }

    public async copy() {
        if (this._convertedResult) {
            cp.copy(this._convertedResult);
        }
    }

    public async copyAsCurl() {
        let editor = window.activeTextEditor;
        if (!editor || !editor.document) {
            return;
        }

        // Get selected text of selected lines or full document
        let selectedText = new Selector().getSelectedText(editor);
        if (!selectedText) {
            return;
        }

        // remove comment lines
        let lines: string[] = selectedText.split(/\r?\n/g);
        selectedText = lines.filter(l => !Constants.CommentIdentifiersRegex.test(l)).join(EOL);
        if (selectedText === '') {
            return;
        }

        // remove file variables definition lines
        lines = selectedText.split(/\r?\n/g);
        selectedText = ArrayUtility.skipWhile(lines, l => Constants.VariableDefinitionRegex.test(l)).join(EOL);

        // environment variables replacement
        selectedText = await VariableProcessor.processRawRequest(selectedText);
        this._selectedText = selectedText;

        // parse http request
        let httpRequest = new RequestParserFactory().createRequestParser(selectedText).parseHttpRequest(selectedText, editor.document.fileName, true);
        if (!httpRequest) {
            return;
        }

        let harHttpRequest = this.convertToHARHttpRequest(httpRequest);
        let snippet = new HTTPSnippet(harHttpRequest);
        let result = snippet.convert('shell', 'curl');
        cp.copy(result);
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
                let cookieParts = pair.split('=', 2);
                if (cookieParts.length === 2) {
                    cookies.push(new HARCookie(cookieParts[0].trim(), cookieParts[1].trim()));
                } else {
                    cookies.push(new HARCookie(cookieParts[0].trim(), ''));
                }
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

        return new HARHttpRequest(request.method, request.url, headers, cookies, body);
    }

    public dispose() {
    }

    private static normalizeAuthHeader(authHeader) {
        if (authHeader) {
            let start = authHeader.indexOf(' ');
            let scheme = authHeader.substr(0, start);
            if (scheme && scheme.toLowerCase() === 'basic') {
                let params = authHeader.substr(start).trim().split(' ');
                if (params.length === 2) {
                    return 'Basic ' + new Buffer(`${params[0]}:${params[1]}`).toString('base64');
                }
            }
        }

        return authHeader;
    }
}