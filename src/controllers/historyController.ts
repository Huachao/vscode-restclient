import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import * as fs from 'fs-extra';
import { EOL, tmpdir } from 'os';
import * as path from 'path';
import { QuickPickItem, window, workspace } from 'vscode';
import Logger from '../logger';
import { SerializedHttpRequest } from '../models/httpRequest';
import { trace } from "../utils/decorator";
import { UserDataManager } from '../utils/userDataManager';

dayjs.extend(relativeTime);

const uuidv4 = require('uuid/v4');

export class HistoryController {
    public constructor() {
    }

    @trace('History')
    public async save() {
        try {
            const requests = await UserDataManager.getRequestHistory();
            if (requests.length === 0) {
                window.showInformationMessage("No request history items are found!");
                return;
            }

            const itemPickList = requests.map(request => {
                const item: QuickPickItem & { rawRequest: SerializedHttpRequest } = {
                    label: `${request.method.toUpperCase()} ${request.url}`,
                    rawRequest: request
                };
                if (typeof request.body === 'string' && request.body.length > 0) {
                    item.description = `${request.body.length} body bytes`;
                }
                if (request.startTime) {
                    item.detail = `${dayjs().to(request.startTime)}`;
                }
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
                        await UserDataManager.clearRequestHistory();
                        window.showInformationMessage('Request history has been cleared');
                    }
                });
        } catch (error) {
            this.errorHandler(error, 'Failed to clear the request history:');
        }
    }

    private async createRequestInTempFile(request: SerializedHttpRequest): Promise<string> {
        const file = await this.createTempFile();
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
        await fs.writeFile(file, output);
        return file;
    }

    private async createTempFile(): Promise<string> {
        const file = path.join(tmpdir(), `vscode-restclient-${uuidv4()}.http`);
        await fs.ensureFile(file);
        return file;
    }

    private errorHandler(error: any, message: string) {
        Logger.error(message, error);
        window.showErrorMessage(message);
    }

    public dispose() {
    }
}