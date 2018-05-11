"use strict";

import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { Uri, window, workspace } from 'vscode';
import * as Constants from '../common/constants';
import { RestClientSettings } from '../models/configurationSettings';
import { HttpResponse } from '../models/httpResponse';
import { trace } from "../utils/decorator";
import { MimeUtility } from '../utils/mimeUtility';
import { PersistUtility } from '../utils/persistUtility';
import { HttpResponseWebview } from '../views/httpResponseWebview';

let cp = require('copy-paste');
let mime = require('mime-types');

export class ResponseController {
    private readonly _restClientSettings: RestClientSettings = RestClientSettings.Instance;
    public static responseSaveFolderPath: string = path.join(os.homedir(), Constants.ExtensionFolderName, Constants.DefaultResponseDownloadFolderName);
    public static responseBodySaveFolderPath: string = path.join(os.homedir(), Constants.ExtensionFolderName, Constants.DefaultResponseBodyDownloadFolerName);

    public constructor() {
    }

    @trace('Response-Save')
    public async save() {
        const response = HttpResponseWebview.activePreviewResponse;
        if (response) {
            const fullResponse = this.getFullResponseString(response);
            const defaultFilePath = path.join(ResponseController.responseSaveFolderPath, `Response-${Date.now()}.http`);
            try {
                const uri = await window.showSaveDialog({defaultUri: Uri.file(defaultFilePath)});
                if (uri) {
                    let filePath = uri.fsPath;
                    await PersistUtility.ensureFileAsync(filePath);
                    await fs.writeFile(filePath, fullResponse);
                    await window.showInformationMessage(`Saved to ${filePath}`, { title: 'Open' }, { title: 'Copy Path' }).then(function (btn) {
                        if (btn) {
                            if (btn.title === 'Open') {
                                workspace.openTextDocument(filePath).then(window.showTextDocument);
                            } else if (btn.title === 'Copy Path') {
                                cp.copy(filePath);
                            }
                        }
                    });
                }
            } catch {
                window.showErrorMessage('Failed to save latest response to disk.');
            }
        }
    }

    @trace('Response-Save-Body')
    public async saveBody() {
        const response = HttpResponseWebview.activePreviewResponse;
        if (response) {
            const contentType = response.getHeader("content-type");
            const extension = this.getExtension(contentType);
            const fileName = !extension ? `Response-${Date.now()}` : `Response-${Date.now()}.${extension}`;
            const defaultFilePath = path.join(ResponseController.responseBodySaveFolderPath, fileName);
            try {
                const uri = await window.showSaveDialog({defaultUri: Uri.file(defaultFilePath)});
                if (uri) {
                    const filePath = uri.fsPath;
                    await PersistUtility.ensureFileAsync(filePath);
                    await fs.writeFile(filePath, response.bodyStream);
                    await window.showInformationMessage(`Saved to ${filePath}`, { title: 'Open' }, { title: 'Copy Path' }).then(function (btn) {
                        if (btn) {
                            if (btn.title === 'Open') {
                                workspace.openTextDocument(filePath).then(window.showTextDocument);
                            } else if (btn.title === 'Copy Path') {
                                cp.copy(filePath);
                            }
                        }
                    });
                }
            } catch {
                window.showErrorMessage('Failed to save latest response body to disk');
            }
        }
    }

    public dispose() {
    }

    private getFullResponseString(response: HttpResponse): string {
        let statusLine = `HTTP/${response.httpVersion} ${response.statusCode} ${response.statusMessage}${os.EOL}`;
        let headerString = '';
        for (let header in response.headers) {
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

    private getExtension(contentType: string): string | boolean {
        let mimeType = MimeUtility.parse(contentType);
        let contentTypeWithoutCharsets = `${mimeType.type}${mimeType.suffix}`;

        // Check if user has custom mapping for this content type first
        if (contentTypeWithoutCharsets in this._restClientSettings.mimeAndFileExtensionMapping) {
            let ext = this._restClientSettings.mimeAndFileExtensionMapping[contentTypeWithoutCharsets];
            ext = ext.replace(/^(\.)+/, "");
            if (ext) {
                return ext;
            }
        }
        return mime.extension(contentType);
    }
}