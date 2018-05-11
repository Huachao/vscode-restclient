"use strict";

import * as fs from 'fs-extra';
import * as moment from 'moment';
import { EOL } from 'os';
import { OutputChannel, window, workspace } from 'vscode';
import { trace } from "../utils/decorator";
import { HistoryQuickPickItem } from '../models/historyQuickPickItem';
import { SerializedHttpRequest } from '../models/httpRequest';
import { PersistUtility } from '../utils/persistUtility';

let tmp = require('tmp');

export class HistoryController {
    private _outputChannel: OutputChannel;

    public constructor() {
        this._outputChannel = window.createOutputChannel('REST');
    }

    @trace('History')
    public async save() {
        try {
            let requests = await PersistUtility.loadRequests();
            if (!requests || requests.length <= 0) {
                window.showInformationMessage("No request history items are found!");
                return;
            }
            let itemPickList: HistoryQuickPickItem[] = requests.map(request => {
                // TODO: add headers and body in pick item?
                let item = new HistoryQuickPickItem();
                item.label = `${request.method.toUpperCase()} ${request.url}`;
                if (request.body && typeof request.body === 'string' && request.body.length > 0) {
                    item.description = `${request.body.length} body bytes`;
                }
                if (request.startTime) {
                    item.detail = `${moment().to(request.startTime)}`;
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
            this.errorHandler(error);
        }
    }

    @trace('Clear History')
    public async clear() {
        try {
            window.showInformationMessage(`Do you really want to clear request history?`, { title: 'Yes' }, { title: 'No' })
                .then(async function (btn) {
                    if (btn) {
                        if (btn.title === 'Yes') {
                            await PersistUtility.clearRequests();
                            window.showInformationMessage('Request history has been cleared');
                        }
                    }
                });
        } catch (error) {
            this.errorHandler(error);
        }
    }

    private async createRequestInTempFile(request: SerializedHttpRequest): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            tmp.file({ prefix: 'vscode-restclient-', postfix: ".http" }, function _tempFileCreated(err, tmpFilePath, fd) {
                if (err) {
                    reject(err);
                    return;
                }
                let output = `${request.method.toUpperCase()} ${request.url}${EOL}`;
                if (request.headers) {
                    for (let header in request.headers) {
                        if (request.headers.hasOwnProperty(header)) {
                            let value = request.headers[header];
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

    public dispose() {
        this._outputChannel.dispose();
    }
}