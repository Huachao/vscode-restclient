"use strict";

import { window, workspace, commands, Uri, StatusBarItem, StatusBarAlignment, ViewColumn, Disposable } from 'vscode';
import { RequestParserFactory } from '../models/requestParserFactory';
import { HttpClient } from '../httpClient';
import { HttpRequest } from '../models/httpRequest';
import { SerializedHttpRequest } from '../models/httpRequest';
import { RestClientSettings } from '../models/configurationSettings';
import { PersistUtility } from '../persistUtility';
import { HttpResponseTextDocumentContentProvider } from '../views/httpResponseTextDocumentContentProvider';
import { Telemetry } from '../telemetry';
import { VariableProcessor } from '../variableProcessor';
import { RequestStore } from '../requestStore';
import { ResponseStore } from '../responseStore';
import { Selector } from '../selector';
import * as Constants from '../constants';
import { EOL } from 'os';

const elegantSpinner = require('elegant-spinner');
const spinner = elegantSpinner();

const filesize = require('filesize');

const uuid = require('node-uuid');

export class RequestController {
    private _durationStatusBarItem: StatusBarItem;
    private _sizeStatusBarItem: StatusBarItem;
    private _restClientSettings: RestClientSettings;
    private _httpClient: HttpClient;
    private _responseTextProvider: HttpResponseTextDocumentContentProvider;
    private _registration: Disposable;
    private _previewUri: Uri = Uri.parse('rest-response://authority/response-preview');
    private _interval: NodeJS.Timer;

    public constructor() {
        this._durationStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        this._sizeStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        this._restClientSettings = new RestClientSettings();
        this._httpClient = new HttpClient(this._restClientSettings);

        this._responseTextProvider = new HttpResponseTextDocumentContentProvider(null, this._restClientSettings);
        this._registration = workspace.registerTextDocumentContentProvider('rest-response', this._responseTextProvider);
    }

    public async run() {
        Telemetry.sendEvent('Request');
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

        // variables replacement
        selectedText = await VariableProcessor.processRawRequest(selectedText);

        // parse http request
        let httpRequest = new RequestParserFactory().createRequestParser(selectedText).parseHttpRequest(selectedText, editor.document.fileName);
        if (!httpRequest) {
            return;
        }

        await this.runCore(httpRequest);
    }

    public async rerun() {
        Telemetry.sendEvent('Rerun Request');

        let httpRequest = RequestStore.getLatest();
        if (!httpRequest) {
            return;
        }

        await this.runCore(httpRequest);
    }

    public async cancel() {
        Telemetry.sendEvent('Cancel Request');

        if (RequestStore.isCompleted()) {
            return;
        }

        this.clearSendProgressStatusText();

        // cancel current request
        RequestStore.cancel();

        this._durationStatusBarItem.command = null;
        this._durationStatusBarItem.text = 'Cancelled $(circle-slash)';
        this._durationStatusBarItem.tooltip = null;
    }

    private async runCore(httpRequest: HttpRequest) {
        let requestId = uuid.v4();
        RequestStore.add(<string>requestId, httpRequest);

        // clear status bar
        this.setSendingProgressStatusText();

        // set http request
        try {
            let response = await this._httpClient.send(httpRequest);

            // check cancel
            if (RequestStore.isCancelled(<string>requestId)) {
                return;
            }

            this.clearSendProgressStatusText();
            this._durationStatusBarItem.command = null;
            this._durationStatusBarItem.text = ` $(clock) ${response.elapsedMillionSeconds}ms`;
            this._durationStatusBarItem.tooltip = 'Duration';

            this._sizeStatusBarItem.text = ` $(database) ${filesize(response.bodySizeInBytes)}`;
            this._sizeStatusBarItem.tooltip = 'Body Size';
            this._sizeStatusBarItem.show();

            this._responseTextProvider.response = response;
            this._responseTextProvider.update(this._previewUri);

            let previewUri = this.generatePreviewUri();
            ResponseStore.add(previewUri.toString(), response);
            try {
                await commands.executeCommand('vscode.previewHtml', previewUri, ViewColumn.Two, `Response(${response.elapsedMillionSeconds}ms)`);
            } catch (reason) {
                window.showErrorMessage(reason);
            }

            // persist to history json file
            let serializedRequest = <SerializedHttpRequest>httpRequest;
            serializedRequest.startTime = Date.now();
            await PersistUtility.saveRequest(serializedRequest);
        } catch (error) {
            // check cancel
            if (RequestStore.isCancelled(<string>requestId)) {
                return;
            }

            if (error.code === 'ETIMEDOUT') {
                error.message = `Please check your networking connectivity and your time out in ${this._restClientSettings.timeoutInMilliseconds}ms according to your configuration 'rest-client.timeoutinmilliseconds'. Details: ${error}. `;
            } else if (error.code === 'ECONNREFUSED') {
                error.message = `Connection is being rejected. The service isn’t running on the server, or a firewall is blocking requests. Details: ${error}.`;
            } else if (error.code === 'ENETUNREACH') {
                error.message = `You don't seem to be connected to a network. Details: ${error}`;
            }
            this.clearSendProgressStatusText();
            this._durationStatusBarItem.command = null;
            this._durationStatusBarItem.text = '';
            window.showErrorMessage(error.message);
        } finally {
            RequestStore.complete(<string>requestId);
        }
    }

    public dispose() {
        this._durationStatusBarItem.dispose();
        this._sizeStatusBarItem.dispose();
        this._registration.dispose();
    }

    private generatePreviewUri(): Uri {
        let uriString = 'rest-response://authority/response-preview'
        if (this._restClientSettings.showResponseInDifferentTab) {
            uriString += `/${Date.now()}`;  // just make every uri different
        }
        return Uri.parse(uriString);
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
}