'use strict';

import { extensions, Extension, window, OutputChannel } from 'vscode';
import { HttpRequest } from './models/httpRequest'
import * as Constants from './constants'
import * as fs from 'fs'
import * as path from 'path'

export class PersistUtility {
    private static historyFilePath: string = path.join(extensions.getExtension(Constants.ExtensionId).extensionPath, Constants.HistoryFileName);
    private static emptyHttpRequestItems: HttpRequest[] = [];

    static save(httpRequest: HttpRequest) {
        PersistUtility.deserializeFromHistoryFile().then(requests => {
            requests.unshift(httpRequest);
            requests = requests.slice(0, Constants.HistoryItemsMaxCount);
            PersistUtility.serializeToHistoryFile(requests);
        }).catch(error => {});
    }
    
    static load(): Promise<HttpRequest[]> {
        return PersistUtility.deserializeFromHistoryFile();
    }

    private static createHistoryFileIfNotExist() {
        try {
            fs.statSync(PersistUtility.historyFilePath);
        } catch (error) {
            fs.writeFileSync(PersistUtility.historyFilePath, '');
        }
    }

    private static serializeToHistoryFile(requests: HttpRequest[]): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            fs.writeFile(PersistUtility.historyFilePath, JSON.stringify(requests));
        });
    }

    private static deserializeFromHistoryFile(): Promise<HttpRequest[]> {
        return new Promise<HttpRequest[]>((resolve, reject) => {
            fs.readFile(PersistUtility.historyFilePath, (error, data) => {
                if (error) {
                    PersistUtility.createHistoryFileIfNotExist();
                } else {
                    let fileContent = data.toString();
                    if (fileContent) {
                        resolve(JSON.parse(fileContent));
                        return;
                    }
                }
                resolve(PersistUtility.emptyHttpRequestItems);
            })
        });
    }
}