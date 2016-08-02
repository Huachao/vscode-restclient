'use strict';

import { HttpRequest } from './models/httpRequest'
import * as Constants from './constants'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

export class PersistUtility {
    static historyFilePath: string = path.join(os.homedir(), Constants.ExtensionFolderName, Constants.HistoryFileName);
    static cookieFilePath: string = path.join(os.homedir(), Constants.ExtensionFolderName, Constants.CookieFileName);
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

    private static serializeToHistoryFile(requests: HttpRequest[]): void {
        fs.writeFileSync(PersistUtility.historyFilePath, JSON.stringify(requests));
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