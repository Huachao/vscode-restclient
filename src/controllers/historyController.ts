import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import * as fs from 'fs-extra';
import { EOL, tmpdir } from 'os';
import * as path from 'path';
import { QuickPickItem, window, workspace } from 'vscode';
import { HistoricalHttpRequest } from '../models/httpRequest';
import { trace } from "../utils/decorator";
import { UserDataManager } from '../utils/userDataManager';

dayjs.extend(relativeTime);

const uuidv4 = require('uuid/v4');

export class HistoryController {
    public constructor() {
    }

    @trace('History')
    public async save() {
        const requests = await UserDataManager.getRequestHistory();
        if (requests.length === 0) {
            window.showInformationMessage("No request history items are found!");
            return;
        }

        const itemPickList = requests.map(request => {
            const item: QuickPickItem & { rawRequest: HistoricalHttpRequest } = {
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
        await window.showTextDocument(document);
    }

    @trace('Clear History')
    public async clear() {
        const btn = await window.showInformationMessage(
            'Do you really want to clear request history?',
            { title: 'Yes' },
            { title: 'No' });
        if (btn?.title === 'Yes') {
            await UserDataManager.clearRequestHistory();
            window.showInformationMessage('Request history has been cleared');
        }
    }

    private async createRequestInTempFile(request: HistoricalHttpRequest): Promise<string> {
        const file = await this.createTempFile();

        let output = "";
        if (request.https) {
            for (const key in request.https) {
                const val = request.https[key];
                if (val) {
                    output += `# @https.${key} ${val}${EOL}`;
                }
            }
        }

        output += `${request.method.toUpperCase()} ${request.url}${EOL}`;
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

    public dispose() {
    }
}