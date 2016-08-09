"use strict";

import { window, workspace, OutputChannel } from 'vscode';
import { PersistUtility } from '../persistUtility'
import { HttpRequest } from '../models/httpRequest'
import { HistoryQuickPickItem } from '../models/historyQuickPickItem'
import { EOL } from 'os';
import * as fs from 'fs'

var tmp = require('tmp')

export class HistoryController {
    private _outputChannel: OutputChannel;

    constructor() {
        this._outputChannel = window.createOutputChannel('REST');
    }

    async run() {
        try {
            let requests = await PersistUtility.load();
            if (!requests || requests.length <= 0) {
                window.showInformationMessage("No request history items are found!");
                return;
            }
            var itemPickList: HistoryQuickPickItem[] = requests.map(request => {
                // TODO: add headers and body in pick item?
                let item = new HistoryQuickPickItem();
                item.label = `${request.method.toUpperCase()} ${request.url}`;
                if (request.body && request.body.length > 0) {
                    item.description = `${request.body.length} body bytes`;
                }
                item.rawRequest = request;
                return item;
            });

            let item = await window.showQuickPick(itemPickList, { placeHolder: "" });
            if (!item) {
                return;
            }
            let path = await this.createRequestInTempFile(item.rawRequest);
            let document = await workspace.openTextDocument(path);
            window.showTextDocument(document);
        } catch (error) {
            this.errorHandler(error)
        }
    }

    private async createRequestInTempFile(request: HttpRequest): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            tmp.file({ prefix: 'vscode-restclient-', postfix: ".http" }, function _tempFileCreated(err, tmpFilePath, fd) {
                if (err) {
                    reject(err);
                    return;
                }
                let output = `${request.method.toUpperCase()} ${request.url}${EOL}`;
                if (request.headers) {
                    for (var header in request.headers) {
                        if (request.headers.hasOwnProperty(header)) {
                            var value = request.headers[header];
                            output += `${header}: ${value}${EOL}`;
                        }
                    }
                }
                if (request.body) {
                    output += `${EOL}${request.body}`;
                }
                fs.writeFile(tmpFilePath, output, error => {
                    reject(error);
                    return;
                });
                resolve(tmpFilePath);
            });
        });
    }

    private errorHandler(error: any) {
        this._outputChannel.appendLine(error);
        this._outputChannel.show();
        window.showErrorMessage("There was an error, please view details in output log");
    }

    dispose() {
        this._outputChannel.dispose();
    }
}