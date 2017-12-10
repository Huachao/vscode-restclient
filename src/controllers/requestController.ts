"use strict";
import { RequestLines } from "../models/requestLines"

import { window, workspace, commands, Uri, StatusBarItem, StatusBarAlignment, ViewColumn, Disposable, TextDocument, Range } from 'vscode';
import { ArrayUtility } from "../common/arrayUtility";
import { RequestParserFactory } from '../models/requestParserFactory';
import { HttpClient } from '../httpClient';
import { HttpRequest } from '../models/httpRequest';
import { HttpResponse } from '../models/httpResponse';
import { SerializedHttpRequest } from '../models/httpRequest';
import { RestClientSettings } from '../models/configurationSettings';
import { PersistUtility } from '../persistUtility';
import { HttpResponseTextDocumentContentProvider } from '../views/httpResponseTextDocumentContentProvider';
import { UntitledFileContentProvider } from '../views/responseUntitledFileContentProvider';
import { trace } from "../decorator";
import { VariableProcessor } from '../variableProcessor';
import { RequestStore } from '../requestStore';
import { ResponseStore } from '../responseStore';
import { Selector } from '../selector';
import * as Constants from '../constants';
import { EOL } from 'os';
import { HttpResponseCacheKey } from "../models/httpResponseCacheKey";
import { ResponseCache } from "../responseCache";

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

        this._responseTextProvider = new HttpResponseTextDocumentContentProvider(this._restClientSettings);
        this._registration = workspace.registerTextDocumentContentProvider('rest-response', this._responseTextProvider);

        workspace.onDidCloseTextDocument((params) => this.onDidCloseTextDocument(params));
    }

    @trace('Request')
    public async run(requestLines: RequestLines) {
        let editor = window.activeTextEditor;
        if (!editor || !editor.document) {
            return;
        }

        // Get selected text of selected lines or full document
        let selectedText = new Selector().getSelectedText(editor, requestLines.range);
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
        selectedText = ArrayUtility.skipWhile(lines, l => Constants.VariableDefinitionRegex.test(l) || l.trim() === '').join(EOL);

        // variables replacement
        selectedText = await VariableProcessor.processRawRequest(selectedText);

        // parse http request
        let httpRequest = new RequestParserFactory().createRequestParser(selectedText).parseHttpRequest(selectedText, editor.document.fileName, this._restClientSettings.useTrunkedTransferEncodingForSendingFileContent);
        if (!httpRequest) {
            return;
        }

        if (requestLines.reponseVar) {
            httpRequest.responseCacheKey = new HttpResponseCacheKey(requestLines.reponseVar, requestLines.requestDocumentUri);
        }

        await this.runCore(httpRequest);
    }

    @trace('Rerun Request')
    public async rerun() {
        let httpRequest = RequestStore.getLatest();
        if (!httpRequest) {
            return;
        }

        await this.runCore(httpRequest);
    }

    @trace('Cancel Request')
    public async cancel() {

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
            this.formatDurationStatusBar(response);

            this.formatSizeStatusBar(response);
            this._sizeStatusBarItem.show();

            let previewUri = this.generatePreviewUri();
            ResponseStore.add(previewUri.toString(), response);
            if (httpRequest.responseCacheKey) {
                ResponseCache.add(httpRequest.responseCacheKey, response);
            }

            this._responseTextProvider.update(this._previewUri);

            try {
                if (this._restClientSettings.previewResponseInUntitledDocument) {
                    UntitledFileContentProvider.createHttpResponseUntitledFile(
                        response,
                        this._restClientSettings.showResponseInDifferentTab,
                        this._restClientSettings.previewResponseSetUntitledDocumentLanguageByContentType,
                        this._restClientSettings.includeAdditionalInfoInResponse,
                        this._restClientSettings.suppressResponseBodyContentTypeValidationWarning
                    );
                } else {
                    await commands.executeCommand('vscode.previewHtml', previewUri, ViewColumn.Two, `Response(${response.elapsedMillionSeconds}ms)`);
                }
            } catch (reason) {
                window.showErrorMessage(reason);
            }

            // persist to history json file
            let serializedRequest = SerializedHttpRequest.convertFromHttpRequest(httpRequest);
            await PersistUtility.saveRequest(serializedRequest);
        } catch (error) {
            // check cancel
            if (RequestStore.isCancelled(<string>requestId)) {
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
        let uriString = 'rest-response://authority/response-preview';
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

    private onDidCloseTextDocument(doc: TextDocument): void {
        // Remove the status bar associated with the response preview uri
        if (this._restClientSettings.showResponseInDifferentTab) {
            return;
        }

        if (ResponseStore.get(doc.uri.toString())) {
            this._durationStatusBarItem.hide();
            this._sizeStatusBarItem.hide();
        }
    }

    private formatDurationStatusBar(response: HttpResponse) {
        this._durationStatusBarItem.command = null;
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
        this._sizeStatusBarItem.tooltip = `Breakdown of Response Size:${EOL}Headers: ${filesize(response.headersSizeInBytes)}${EOL}Body: ${filesize(response.bodySizeInBytes)}`;
    }
}