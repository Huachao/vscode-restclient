"use strict";

import { EOL } from 'os';
import { Range, StatusBarAlignment, StatusBarItem, window } from 'vscode';
import { ArrayUtility } from "../common/arrayUtility";
import * as Constants from '../common/constants';
import { RestClientSettings } from '../models/configurationSettings';
import { HttpRequest, SerializedHttpRequest } from '../models/httpRequest';
import { HttpResponse } from '../models/httpResponse';
import { RequestParserFactory } from '../models/requestParserFactory';
import { RequestVariableCacheKey } from "../models/requestVariableCacheKey";
import { RequestVariableCacheValue } from "../models/requestVariableCacheValue";
import { trace } from "../utils/decorator";
import { HttpClient } from '../utils/httpClient';
import { PersistUtility } from '../utils/persistUtility';
import { RequestStore } from '../utils/requestStore';
import { RequestVariableCache } from "../utils/requestVariableCache";
import { Selector } from '../utils/selector';
import { VariableProcessor } from '../utils/variableProcessor';
import { HttpResponseTextDocumentView } from '../views/httpResponseTextDocumentView';
import { HttpResponseWebview } from '../views/httpResponseWebview';

const elegantSpinner = require('elegant-spinner');
const spinner = elegantSpinner();

const filesize = require('filesize');
const uuid = require('node-uuid');

export class RequestController {
    private readonly _restClientSettings: RestClientSettings = RestClientSettings.Instance;
    private readonly _requestStore: RequestStore = RequestStore.Instance;
    private _durationStatusBarItem: StatusBarItem;
    private _sizeStatusBarItem: StatusBarItem;
    private _httpClient: HttpClient;
    private _interval: NodeJS.Timer;
    private _webview: HttpResponseWebview;
    private _textDocumentView: HttpResponseTextDocumentView;

    public constructor() {
        this._durationStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        this._sizeStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        this._httpClient = new HttpClient();
        this._webview = new HttpResponseWebview();
        this._webview.onDidCloseAllWebviewPanels(() => {
            this._durationStatusBarItem.hide();
            this._sizeStatusBarItem.hide();
        });
        this._textDocumentView = new HttpResponseTextDocumentView();
    }

    @trace('Request')
    public async run(range: Range) {
        let editor = window.activeTextEditor;
        if (!editor || !editor.document) {
            return;
        }

        const selector = new Selector();

        // Get selected text of selected lines or full document
        let selectedText = selector.getSelectedText(editor, range);
        if (!selectedText) {
            return;
        }

        const requestVariable = selector.getRequestVariableForSelectedText(editor, range);

        // remove comment lines
        let lines: string[] = selectedText.split(/\r?\n/g);
        selectedText = lines.filter(l => !Constants.CommentIdentifiersRegex.test(l)).join(EOL);
        if (selectedText === '') {
            return;
        }

        // remove file variables definition lines
        lines = selectedText.split(/\r?\n/g);
        selectedText = ArrayUtility.skipWhile(lines, l => Constants.FileVariableDefinitionRegex.test(l) || l.trim() === '').join(EOL);

        // variables replacement
        selectedText = await VariableProcessor.processRawRequest(selectedText);

        // parse http request
        let httpRequest = new RequestParserFactory().createRequestParser(selectedText).parseHttpRequest(selectedText, editor.document.fileName);
        if (!httpRequest) {
            return;
        }

        if (requestVariable) {
            httpRequest.requestVariableCacheKey = new RequestVariableCacheKey(requestVariable, editor.document.uri.toString());
        }

        await this.runCore(httpRequest);
    }

    @trace('Rerun Request')
    public async rerun() {
        let httpRequest = this._requestStore.getLatest();
        if (!httpRequest) {
            return;
        }

        await this.runCore(httpRequest);
    }

    @trace('Cancel Request')
    public async cancel() {

        if (this._requestStore.isCompleted()) {
            return;
        }

        this.clearSendProgressStatusText();

        // cancel current request
        this._requestStore.cancel();

        this._durationStatusBarItem.text = 'Cancelled $(circle-slash)';
        this._durationStatusBarItem.tooltip = null;
    }

    private async runCore(httpRequest: HttpRequest) {
        let requestId = uuid.v4();
        this._requestStore.add(<string>requestId, httpRequest);

        // clear status bar
        this.setSendingProgressStatusText();

        // set http request
        try {
            let response = await this._httpClient.send(httpRequest);

            // check cancel
            if (this._requestStore.isCancelled(<string>requestId)) {
                return;
            }

            this.clearSendProgressStatusText();
            this.formatDurationStatusBar(response);

            this.formatSizeStatusBar(response);
            this._sizeStatusBarItem.show();

            if (httpRequest.requestVariableCacheKey) {
                RequestVariableCache.add(httpRequest.requestVariableCacheKey, new RequestVariableCacheValue(httpRequest, response));
            }

            try {
                if (this._restClientSettings.previewResponseInUntitledDocument) {
                    this._textDocumentView.render(response);
                } else {
                    this._webview.render(response);
                }
            } catch (reason) {
                window.showErrorMessage(reason);
            }

            // persist to history json file
            let serializedRequest = SerializedHttpRequest.convertFromHttpRequest(httpRequest);
            await PersistUtility.saveRequest(serializedRequest);
        } catch (error) {
            // check cancel
            if (this._requestStore.isCancelled(<string>requestId)) {
                return;
            }

            if (error.code === 'ETIMEDOUT') {
                error.message = `Please check your networking connectivity and your time out in ${this._restClientSettings.timeoutInMilliseconds}ms according to your configuration 'rest-client.timeoutinmilliseconds'. Details: ${error}. `;
            } else if (error.code === 'ECONNREFUSED') {
                error.message = `Connection is being rejected. The service isn’t running on the server, or incorrect proxy settings in vscode, or a firewall is blocking requests. Details: ${error}.`;
            } else if (error.code === 'ENETUNREACH') {
                error.message = `You don't seem to be connected to a network. Details: ${error}`;
            }
            this.clearSendProgressStatusText();
            this._durationStatusBarItem.text = '';
            window.showErrorMessage(error.message);
        } finally {
            this._requestStore.complete(<string>requestId);
        }
    }

    public dispose() {
        this._durationStatusBarItem.dispose();
        this._sizeStatusBarItem.dispose();
        this._webview.dispose();
    }

    private setSendingProgressStatusText() {
        this.clearSendProgressStatusText();
        this._interval = setInterval(() => {
            this._durationStatusBarItem.text = `Waiting ${spinner()}`;
        }, 50);
        this._durationStatusBarItem.tooltip = 'Waiting Response';
        this._durationStatusBarItem.show();
    }

    private clearSendProgressStatusText() {
        clearInterval(this._interval);
        this._sizeStatusBarItem.hide();
    }

    private formatDurationStatusBar(response: HttpResponse) {
        this._durationStatusBarItem.text = ` $(clock) ${response.elapsedMillionSeconds}ms`;
        this._durationStatusBarItem.tooltip = [
            'Breakdown of Duration:',
            `Socket: ${response.timingPhases.wait.toFixed(1)}ms`,
            `DNS: ${response.timingPhases.dns.toFixed(1)}ms`,
            `TCP: ${response.timingPhases.tcp.toFixed(1)}ms`,
            `FirstByte: ${response.timingPhases.firstByte.toFixed(1)}ms`,
            `Download: ${response.timingPhases.download.toFixed(1)}ms`
        ].join(EOL);
    }

    private formatSizeStatusBar(response: HttpResponse) {
        this._sizeStatusBarItem.text = ` $(database) ${filesize(response.bodySizeInBytes + response.headersSizeInBytes)}`;
        this._sizeStatusBarItem.tooltip = [
            'Breakdown of Response Size:',
            `Headers: ${filesize(response.headersSizeInBytes)}`,
            `Body: ${filesize(response.bodySizeInBytes)}`
        ].join(EOL);
    }
}