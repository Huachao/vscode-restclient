"use strict";

import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { Clipboard, env, Uri, window, workspace } from 'vscode';
import * as Constants from '../common/constants';
import { HttpResponse } from '../models/httpResponse';
import { trace } from "../utils/decorator";
import { MimeUtility } from '../utils/mimeUtility';
import { PersistUtility } from '../utils/persistUtility';
import { HttpResponseWebview } from '../views/httpResponseWebview';

export class ResponseController {
    public static responseSaveFolderPath: string = path.join(os.homedir(), Constants.ExtensionFolderName, Constants.DefaultResponseDownloadFolderName);
    public static responseBodySaveFolderPath: string = path.join(os.homedir(), Constants.ExtensionFolderName, Constants.DefaultResponseBodyDownloadFolderName);
    private readonly clipboard: Clipboard;

    public constructor() {
        fs.ensureDir(ResponseController.responseSaveFolderPath);
        fs.ensureDir(ResponseController.responseBodySaveFolderPath);
        this.clipboard = env.clipboard;
    }

    @trace('Response-Save')
    public async save() {
        const response = HttpResponseWebview.activePreviewResponse;
        if (response) {
            const fullResponse = this.getFullResponseString(response);
            const defaultFilePath = path.join(ResponseController.responseSaveFolderPath, `Response-${Date.now()}.http`);
            try {
                const uri = await window.showSaveDialog({ defaultUri: Uri.file(defaultFilePath) });
                if (uri) {
                    const filePath = uri.fsPath;
                    await PersistUtility.ensureFileAsync(filePath);
                    await fs.writeFile(filePath, fullResponse);
                    const btn = await window.showInformationMessage(`Saved to ${filePath}`, { title: 'Open' }, { title: 'Copy Path' });
                    if (btn) {
                        if (btn.title === 'Open') {
                            workspace.openTextDocument(filePath).then(window.showTextDocument);
                        } else if (btn.title === 'Copy Path') {
                            await this.clipboard.writeText(filePath);
                        }
                    }
                }
            } catch {
                window.showErrorMessage('Failed to save latest response to disk.');
            }
        }
    }

    @trace('Response-Copy-Body')
    public async copyBody() {
        const response = HttpResponseWebview.activePreviewResponse;
        if (response) {
            await this.clipboard.writeText(response.body);
        }
    }

    @trace('Response-Save-Body')
    public async saveBody() {
        const response = HttpResponseWebview.activePreviewResponse;
        if (response) {
            const extension = MimeUtility.getExtension(response.contentType, '');
            const fileName = !extension ? `Response-${Date.now()}` : `Response-${Date.now()}.${extension}`;
            const defaultFilePath = path.join(ResponseController.responseBodySaveFolderPath, fileName);
            try {
                const uri = await window.showSaveDialog({ defaultUri: Uri.file(defaultFilePath) });
                if (uri) {
                    const filePath = uri.fsPath;
                    await PersistUtility.ensureFileAsync(filePath);
                    await fs.writeFile(filePath, response.bodyBuffer);
                    const btn = await window.showInformationMessage(`Saved to ${filePath}`, { title: 'Open' }, { title: 'Copy Path' });
                    if (btn) {
                        if (btn.title === 'Open') {
                            workspace.openTextDocument(filePath).then(window.showTextDocument);
                        } else if (btn.title === 'Copy Path') {
                            await this.clipboard.writeText(filePath);
                        }
                    }
                }
            } catch {
                window.showErrorMessage('Failed to save latest response body to disk');
            }
        }
    }

    public dispose() {
    }

    private getFullResponseString(response: HttpResponse): string {
        const statusLine = `HTTP/${response.httpVersion} ${response.statusCode} ${response.statusMessage}${os.EOL}`;
        let headerString = '';
        for (const header in response.headers) {
            if (response.headers.hasOwnProperty(header)) {
                headerString += `${header}: ${response.headers[header]}${os.EOL}`;
            }
        }
        let body = '';
        if (response.body) {
            body = `${os.EOL}${response.body}`;
        }
        return `${statusLine}${headerString}${body}`;
    }
}