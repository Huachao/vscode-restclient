import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import * as fs from 'fs-extra';
import { EOL, tmpdir } from 'os';
import * as path from 'path';
import { l10n, QuickPickItem, window, workspace } from 'vscode';
import { HistoricalHttpRequest } from '../models/httpRequest';
import { trace } from "../utils/decorator";
import { formatHeaders } from '../utils/misc';
import { UserDataManager } from '../utils/userDataManager';

dayjs.extend(relativeTime);

import { v4 as uuidv4 } from 'uuid';

export class HistoryController {
    public constructor() {
    }

    @trace('History')
    public async save() {
        const requests = await UserDataManager.getRequestHistory();
        if (requests.length === 0) {
            window.showInformationMessage(l10n.t('No request history items are found!'));
            return;
        }

        const itemPickList = requests.map(request => {
            const item: QuickPickItem & { rawRequest: HistoricalHttpRequest } = {
                label: `${request.method.toUpperCase()} ${request.url}`,
                rawRequest: request
            };
            if (typeof request.body === 'string' && request.body.length > 0) {
                item.description = l10n.t('{0} body bytes', request.body.length);
            }
            if (request.startTime) {
                item.detail = `${dayjs().to(request.startTime)}`;
            }
            return item;
        });

        const item = await window.showQuickPick(itemPickList, { placeHolder: l10n.t('Pick a request to reopen') });
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
            l10n.t('Do you really want to clear request history?'),
            { title: l10n.t('Yes') },
            { title: l10n.t('No') });
        if (btn?.title === l10n.t('Yes')) {
            await UserDataManager.clearRequestHistory();
            window.showInformationMessage(l10n.t('Request history has been cleared'));
        }
    }

    private async createRequestInTempFile(request: HistoricalHttpRequest): Promise<string> {
        const file = await this.createTempFile();
        let output = `${request.method.toUpperCase()} ${request.url}${EOL}`;
        output += formatHeaders(request.headers);
        if (request.body) {
            output += `${EOL}${request.body}`;
        }
        await fs.writeFile(file, output);
        return file;
    }

    private async createTempFile(): Promise<string> {
        const file = path.join(tmpdir(), `rest-client-${uuidv4()}.http`);
        await fs.ensureFile(file);
        return file;
    }

    public dispose() {
    }
}