'use strict';

import { SerializedHttpRequest } from './models/httpRequest';
import * as Constants from './constants';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class PersistUtility {
    static readonly historyFilePath: string = path.join(os.homedir(), Constants.ExtensionFolderName, Constants.HistoryFileName);
    static readonly cookieFilePath: string = path.join(os.homedir(), Constants.ExtensionFolderName, Constants.CookieFileName);
    private static emptyHttpRequestItems: SerializedHttpRequest[] = [];

    static async save(httpRequest: SerializedHttpRequest) {
        try {
            let requests = await PersistUtility.deserializeFromHistoryFile();
            requests.unshift(httpRequest);
            requests = requests.slice(0, Constants.HistoryItemsMaxCount);
            await PersistUtility.serializeToHistoryFile(requests);
        } catch (error) {
        }
    }

    static async load(): Promise<SerializedHttpRequest[]> {
        return PersistUtility.deserializeFromHistoryFile();
    }

    static createHistoryFileIfNotExist() {
        try {
            fs.statSync(PersistUtility.historyFilePath);
        } catch (error) {
            PersistUtility.ensureDirectoryExistence(PersistUtility.historyFilePath);
            fs.writeFileSync(PersistUtility.historyFilePath, '');
        }
    }

    static createCookieFileIfNotExist() {
        try {
            fs.statSync(PersistUtility.cookieFilePath);
        } catch (error) {
            PersistUtility.ensureDirectoryExistence(PersistUtility.cookieFilePath);
            fs.writeFileSync(PersistUtility.cookieFilePath, '');
        }
    }

    static createResponseFileIfNotExist(path: string) {
        try {
            fs.statSync(path);
        } catch (error) {
            PersistUtility.ensureDirectoryExistence(path);
            fs.writeFileSync(path, '');
        }
    }

    static async serializeToHistoryFile(requests: SerializedHttpRequest[]) {
        return new Promise<void>((resolve, reject) => {
            fs.writeFile(PersistUtility.historyFilePath, JSON.stringify(requests), error => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            })
        });
    }

    private static async deserializeFromHistoryFile(): Promise<SerializedHttpRequest[]> {
        return new Promise<SerializedHttpRequest[]>((resolve, reject) => {
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

    private static ensureDirectoryExistence(filePath: string) {
        let dirname = path.dirname(filePath);
        if (PersistUtility.directoryExists(dirname)) {
            return true;
        }
        PersistUtility.ensureDirectoryExistence(dirname);
        fs.mkdirSync(dirname);
    }

    private static directoryExists(path) {
        try {
            return fs.statSync(path).isDirectory();
        } catch (err) {
            return false;
        }
    }
}