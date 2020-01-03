import * as fs from 'fs-extra';
import moment from 'moment';
import { EOL } from 'os';
import { window, workspace } from 'vscode';
import { logger } from '../logger';
import { HistoryQuickPickItem } from '../models/historyQuickPickItem';
import { SerializedHttpRequest } from '../models/httpRequest';
import { trace } from "../utils/decorator";
import { PersistUtility } from '../utils/persistUtility';

const tmp = require('tmp');

export class HistoryController {
    public constructor() {
    }

    @trace('History')
    public async save() {
        try {
            const requests = await PersistUtility.loadRequests();
            if (requests.length === 0) {
                window.showInformationMessage("No request history items are found!");
                return;
            }
            const itemPickList: HistoryQuickPickItem[] = requests.map(request => {
                // TODO: add headers and body in pick item?
                const item = new HistoryQuickPickItem();
                item.label = `${request.method.toUpperCase()} ${request.url}`;
                if (typeof request.body === 'string' && request.body.length > 0) {
                    item.description = `${request.body.length} body bytes`;
                }
                if (request.startTime) {
                    item.detail = `${moment().to(request.startTime)}`;
                }
                item.rawRequest = request;
                return item;
            });

            const item = await window.showQuickPick(itemPickList, { placeHolder: "" });
            if (!item) {
                return;
            }
            const path = await this.createRequestInTempFile(item.rawRequest);
            const document = await workspace.openTextDocument(path);
            window.showTextDocument(document);
        } catch (error) {
            this.errorHandler(error, 'Failed to persist the request into history file:');
        }
    }

    @trace('Clear History')
    public async clear() {
        try {
            window.showInformationMessage(`Do you really want to clear request history?`, { title: 'Yes' }, { title: 'No' })
                .then(async function (btn) {
                    if (btn?.title === 'Yes') {
                        await PersistUtility.clearRequests();
                        window.showInformationMessage('Request history has been cleared');
                    }
                });
        } catch (error) {
            this.errorHandler(error, 'Failed to clear the request history:');
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
                    for (const header in request.headers) {
                        if (request.headers.hasOwnProperty(header)) {
                            const value = request.headers[header];
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

    private errorHandler(error: any, message: string) {
        logger.error(message, error);
        window.showErrorMessage(message);
    }

    public dispose() {
    }
}