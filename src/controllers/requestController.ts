"use strict";

import { window, workspace, commands, Uri, StatusBarItem, StatusBarAlignment, ViewColumn, Disposable } from 'vscode';
import { RequestParserFactory } from '../models/requestParserFactory'
import { HttpClient } from '../httpClient'
import { RestClientSettings } from '../models/configurationSettings'
import { PersistUtility } from '../persistUtility'
import { HttpResponseTextDocumentContentProvider } from '../views/httpResponseTextDocumentContentProvider';
import { EOL } from 'os';

export class RequestController {
    private _statusBarItem: StatusBarItem;
    private _restClientSettings: RestClientSettings;
    private _httpClient: HttpClient;
    private _responseTextProvider: HttpResponseTextDocumentContentProvider;
    private _registration: Disposable;
    private _previewUri: Uri = Uri.parse('rest-response://authority/response-preview');

    private static commentIdentifiersRegex = new RegExp('^\\s*(\#|\/\/)');

    constructor() {
        this._statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        this._restClientSettings = new RestClientSettings();
        this._httpClient = new HttpClient(this._restClientSettings);

        this._responseTextProvider = new HttpResponseTextDocumentContentProvider(null);
        this._registration = workspace.registerTextDocumentContentProvider('rest-response', this._responseTextProvider);
    }

    async run() {
        let editor = window.activeTextEditor;
        if (!editor || !editor.document) {
            return;
        }

        // Get selected text of selected lines or full document
        let selectedText: string;
        if (editor.selection.isEmpty) {
            selectedText = editor.document.getText();
        } else {
            selectedText = editor.document.getText(editor.selection);
        }

        // remove comment lines
        let lines: string[] = selectedText.split(EOL);
        selectedText = lines.filter(l => !RequestController.commentIdentifiersRegex.test(l)).join(EOL);
        if (selectedText === '') {
            return;
        }

        // clear status bar
        this._statusBarItem.text = `$(cloud-upload)`;
        this._statusBarItem.show();

        // parse http request
        let httpRequest = new RequestParserFactory().createRequestParser(selectedText).parseHttpRequest(selectedText);
        if (!httpRequest) {
            return;
        }

        // set http request
        try {
            let response = await this._httpClient.send(httpRequest);
            this._statusBarItem.text = ` $(clock) ${response.elapsedMillionSeconds}ms`;
            this._statusBarItem.tooltip = 'duration';

            this._responseTextProvider.response = response;
            this._responseTextProvider.update(this._previewUri);

            let previewUri = this.generatePreviewUri();
            try {
                await commands.executeCommand('vscode.previewHtml', previewUri, ViewColumn.Two, 'Response')
            } catch (reason) {
                window.showErrorMessage(reason);
            }

            // persist to history json file
            await PersistUtility.save(httpRequest);
        } catch (error) {
            if (error.code === 'ETIMEDOUT') {
                error.message = `Error: ${error}. Please check your networking connectivity and your time out in ${this._restClientSettings.timeoutInMilliseconds}ms according to your configuration 'rest-client.timeoutinmilliseconds'.`;
            }
            this._statusBarItem.text = '';
            window.showErrorMessage(error.message);
        }
    }

    dispose() {
        this._statusBarItem.dispose();
        this._registration.dispose();
    }

    private generatePreviewUri(): Uri {
        let uriString = 'rest-response://authority/response-preview'
        if (this._restClientSettings.showResponseInDifferentTab) {
            uriString += `/${Date.now()}`;  // just make every uri different
        }
        return Uri.parse(uriString);
    }
}