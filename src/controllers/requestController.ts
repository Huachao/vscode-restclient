"use strict";

import { window, workspace, Uri, StatusBarItem, StatusBarAlignment, OutputChannel } from 'vscode';
import { RequestParser } from '../parser'
import { MimeUtility } from '../mimeUtility'
import { HttpClient } from '../httpClient'
import { HttpRequest } from '../models/httpRequest'
import { RestClientSettings } from '../models/configurationSettings'
import { PersistUtility } from '../persistUtility'

export class RequestController {
    private _outputChannel: OutputChannel;
    private _statusBarItem: StatusBarItem;
    private _restClientSettings: RestClientSettings;
    private _httpClient: HttpClient;

    constructor() {
        this._outputChannel = window.createOutputChannel('REST');
        this._statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        this._restClientSettings = new RestClientSettings();
        this._httpClient = new HttpClient(this._restClientSettings);
    }

    run() {
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

        if (selectedText === '') {
            return;
        }

        if (this._restClientSettings.clearOutput) {
            this._outputChannel.clear();
        }

        // clear status bar
        this._statusBarItem.text = `$(cloud-upload)`;
        this._statusBarItem.show();

        // parse http request
        let httpRequest = RequestParser.parseHttpRequest(selectedText);
        if (!httpRequest) {
            return;
        }

        // set http request
        this._httpClient.send(httpRequest)
            .then(response => {
                let output = `HTTP/${response.httpVersion} ${response.statusCode} ${response.statusMessage}\n`
                for (var header in response.headers) {
                    if (response.headers.hasOwnProperty(header)) {
                        var value = response.headers[header];
                        output += `${header}: ${value}\n`
                    }
                }

                let body = response.body;
                let contentType = response.headers['content-type'];
                if (contentType) {
                    let type = MimeUtility.parse(contentType).type;
                    if (type === 'application/json') {
                        body = JSON.stringify(JSON.parse(body), null, 4);
                    }
                }

                output += `\n${body}`;
                this._outputChannel.appendLine(`${output}\n`);
                this._outputChannel.show(true);

                this._statusBarItem.text = ` $(clock) ${response.elapsedMillionSeconds}ms`;
                this._statusBarItem.tooltip = 'duration';

                // persist to history json file
                PersistUtility.save(httpRequest);
            })
            .catch(error => {
                this._statusBarItem.text = '';
                this._outputChannel.appendLine(`${error}\n`);
                this._outputChannel.show(true);
            });
    }

    dispose() {
        this._outputChannel.dispose();
        this._statusBarItem.dispose();
    }
}