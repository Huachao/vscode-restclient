"use strict";

import { window, Uri, workspace } from 'vscode';
import { ResponseStore } from '../responseStore';
import { HttpResponse } from '../models/httpResponse';
import { MimeUtility } from '../mimeUtility';
import { PersistUtility } from '../persistUtility';
import { RestClientSettings } from '../models/configurationSettings';
import { Telemetry } from '../telemetry';
import * as Constants from '../constants';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

var cp = require('copy-paste');
var mime = require('mime-types')

export class ResponseController {
    private _restClientSettings: RestClientSettings;
    public static responseSaveFolderPath: string = path.join(os.homedir(), Constants.ExtensionFolderName, Constants.DefaultResponseDownloadFolderName);
    public static responseBodySaveFolderPath: string = path.join(os.homedir(), Constants.ExtensionFolderName, Constants.DefaultResponseBodyDownloadFolerName);

    public constructor() {
        this._restClientSettings = new RestClientSettings();
    }

    public async save(uri: Uri) {
        Telemetry.sendEvent('Response-Save');
        if (!uri) {
            return;
        }
        let response = ResponseStore.get(uri.toString());
        if (response !== undefined) {
            let fullResponse = this.getFullResponseString(response);
            let filePath = path.join(ResponseController.responseSaveFolderPath, `Response-${Date.now()}.http`)
            try {
                await PersistUtility.createFileIfNotExistsAsync(filePath);
                fs.writeFileSync(filePath, fullResponse);
                window.showInformationMessage(`Saved to ${filePath}`, { title: 'Open' }, { title: 'Copy Path' }).then(function (btn) {
                    if (btn) {
                        if (btn.title === 'Open') {
                            workspace.openTextDocument(filePath).then(window.showTextDocument);
                        } else if (btn.title === 'Copy Path') {
                            cp.copy(filePath);
                        }
                    }
                });
            } catch (error) {
                window.showErrorMessage(`Failed to save latest response to ${filePath}`);
            }
        }
    }

    public async saveBody(uri: Uri) {
        Telemetry.sendEvent('Response-Save-Body');
        if (!uri) {
            return;
        }
        let response = ResponseStore.get(uri.toString());
        if (response !== undefined) {
            let contentType = response.getResponseHeaderValue("content-type");
            let extension = this.getExtension(contentType);
            let fileName = !extension ? `Response-${Date.now()}` : `Response-${Date.now()}.${extension}`;
            let filePath = path.join(ResponseController.responseBodySaveFolderPath, fileName);
            try {
                await PersistUtility.createFileIfNotExistsAsync(filePath);
                fs.writeFileSync(filePath, response.bodyStream);
                window.showInformationMessage(`Saved to ${filePath}`, { title: 'Open' }, { title: 'Copy Path' }).then(function (btn) {
                    if (btn) {
                        if (btn.title === 'Open') {
                            workspace.openTextDocument(filePath).then(window.showTextDocument);
                        } else if (btn.title === 'Copy Path') {
                            cp.copy(filePath);
                        }
                    }
                });
            } catch (error) {
                window.showErrorMessage(`Failed to save latest response body to ${filePath}`);
            }
        }
    }

    public dispose() {
    }

    private getFullResponseString(response: HttpResponse): string {
        let statusLine = `HTTP/${response.httpVersion} ${response.statusCode} ${response.statusMessage}${os.EOL}`;
        let headerString = '';
        for (var header in response.headers) {
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

    private getExtension(contentType: string): string|boolean {
        let mimeType = MimeUtility.parse(contentType);
        let contentTypeWithoutCharsets = `${mimeType.type}${mimeType.suffix}`;

        // Check if user has custom mapping for this content type first
        if (contentTypeWithoutCharsets in this._restClientSettings.mimeAndFileExtensionMapping) {
            let ext = this._restClientSettings.mimeAndFileExtensionMapping[contentTypeWithoutCharsets];
            ext = ext.replace(/^(\.)+/,"");
            if (ext) {
                return ext;
            }
        }
        return mime.extension(contentType);
    }
}