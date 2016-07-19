'use strict';

import { extensions } from 'vscode';
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
        }).catch(error => { });
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

    private static serializeToHistoryFile(requests: HttpRequest[]): void {
        fs.writeFileSync(PersistUtility.historyFilePath, JSON.stringify(requests));
    }

    private static deserializeFromHistoryFile(): Promise<HttpRequest[]> {
        return new Promise<HttpRequest[]>((resolve, reject) => {
            fs.readFile(PersistUtility.historyFilePath, (error, data) => {
                if (error) {
                    PersistUtility.createHistoryFileIfNotExist();
                    let previousRequests = PersistUtility.retrieveRequestsFromPreviousVersions();
                    if (previousRequests && previousRequests.length > 0) {
                        PersistUtility.serializeToHistoryFile(previousRequests);
                        resolve(previousRequests);
                        return;
                    }
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

    private static retrieveRequestsFromPreviousVersions(): HttpRequest[] {
        let extensionsFolderPath = path.dirname(path.dirname(PersistUtility.historyFilePath));
        let folders = fs.readdirSync(extensionsFolderPath).filter(function (file) {
            let filePath = path.join(extensionsFolderPath, file);
            return fs.statSync(filePath).isDirectory() && file.startsWith('humao.rest-client-');
        }).sort().reverse();

        let previousRequests: HttpRequest[] = [];
        for (var i in folders) {
            let historyFile = path.join(extensionsFolderPath, folders[i], Constants.HistoryFileName);
            try {
                fs.statSync(historyFile);
                let fileContent = fs.readFileSync(historyFile).toString();
                if (fileContent) {
                    let requests = <HttpRequest[]>JSON.parse(fileContent)
                    if (requests) {
                        previousRequests.push(...requests);
                        if (previousRequests.length >= Constants.HistoryItemsMaxCount) {
                            previousRequests = previousRequests.slice(0, Constants.HistoryItemsMaxCount);
                            break;
                        }
                    }
                }
            } catch (error) {
                continue;
            }
        }

        return previousRequests;
    }
}