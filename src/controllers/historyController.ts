"use strict";

import { window, workspace, QuickPickItem, OutputChannel } from 'vscode';
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

    run(): any {
        PersistUtility.load().then(requests => {
            if (!requests || requests.length <= 0) {
                window.showInformationMessage("No request history items are found!");
                return;
            }
            var itemPickList: HistoryQuickPickItem[] = requests.map(request => {
                // TODO: add headers and body in pick item?
                let item = new HistoryQuickPickItem();
                item.label = `${request.method.toUpperCase()} ${request.url}`;
                item.rawRequest = request;
                return item;
            });

            window.showQuickPick(itemPickList, { placeHolder: "" }).then(item => {
                if (!item) {
                    return;
                }
                this.createRequestInTempFile(item.rawRequest).then(path => {
                    workspace.openTextDocument(path).then(d => {
                        window.showTextDocument(d);
                    });
                });
            })
        }).catch(error => this.errorHandler(error));
    }

    private createRequestInTempFile(request: HttpRequest): Promise<string> {
        return new Promise((resolve, reject) => {
            tmp.file({ prefix: 'vscode-restclient-' }, function _tempFileCreated(err, tmpFilePath, fd) {
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