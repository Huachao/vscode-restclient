'use strict';

import { SerializedHttpRequest } from './models/httpRequest';
import { EnvironmentPickItem } from './models/environmentPickItem';
import * as Constants from './constants';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export class PersistUtility {
    public static readonly historyFilePath: string = path.join(os.homedir(), Constants.ExtensionFolderName, Constants.HistoryFileName);
    public static readonly cookieFilePath: string = path.join(os.homedir(), Constants.ExtensionFolderName, Constants.CookieFileName);
    public static readonly environmentFilePath: string = path.join(os.homedir(), Constants.ExtensionFolderName, Constants.EnvironmentFileName);
    private static emptyHttpRequestItems: SerializedHttpRequest[] = [];

    public static async saveRequest(httpRequest: SerializedHttpRequest) {
        try {
            let requests = await PersistUtility.deserializeFromHistoryFile();
            requests.unshift(httpRequest);
            requests = requests.slice(0, Constants.HistoryItemsMaxCount);
            await PersistUtility.serializeToHistoryFile(requests);
        } catch (error) {
        }
    }

    public static loadRequests(): Promise<SerializedHttpRequest[]> {
        return PersistUtility.deserializeFromHistoryFile();
    }

    public static async saveEnvironment(environment: EnvironmentPickItem) {
        await PersistUtility.createFileIfNotExistsAsync(PersistUtility.environmentFilePath);
        await PersistUtility.serializeToEnvironmentFile(environment);
    }

    public static loadEnvironment(): Promise<EnvironmentPickItem> {
        return PersistUtility.deserializeFromEnvironmentFile();
    }

    public static createFileIfNotExists(path: string) {
        try {
            fs.statSync(path);
        } catch (error) {
            PersistUtility.ensureDirectoryExistence(path);
            fs.writeFileSync(path, '');
        }
    }

    public static createFileIfNotExistsAsync(path: string) {
        return new Promise<void>((resolve, reject) => {
            fs.stat(path, err => {
                if (err === null) {
                    resolve();
                }

                new Promise<string>((resolve, reject) => {
                    PersistUtility.ensureDirectoryExistence(path);
                    fs.writeFile(path, '', err => err === null ? resolve(path) : reject(err));
                }).then(_ => resolve());
            });
        });
    }

    public static serializeToEnvironmentFile(environment: EnvironmentPickItem) {
        return new Promise<void>((resolve, reject) => {
            fs.writeFile(PersistUtility.environmentFilePath, JSON.stringify(environment), error => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    }

    private static deserializeFromEnvironmentFile(): Promise<EnvironmentPickItem> {
        return new Promise<EnvironmentPickItem>((resolve, reject) => {
            fs.readFile(PersistUtility.environmentFilePath, (error, data) => {
                if (error) {
                    PersistUtility.createFileIfNotExistsAsync(PersistUtility.environmentFilePath).then(_ => resolve(null));
                    return;
                } else {
                    let fileContent = data.toString();
                    if (fileContent) {
                        resolve(JSON.parse(fileContent));
                        return;
                    }
                    resolve(null);
                }
            });
        });
    }

    public static serializeToHistoryFile(requests: SerializedHttpRequest[]) {
        return new Promise<void>((resolve, reject) => {
            fs.writeFile(PersistUtility.historyFilePath, JSON.stringify(requests), error => {
                if (error) {
                    reject(error);
                    return;
                }

                resolve();
            });
        });
    }

    private static deserializeFromHistoryFile(): Promise<SerializedHttpRequest[]> {
        return new Promise<SerializedHttpRequest[]>((resolve, reject) => {
            fs.readFile(PersistUtility.historyFilePath, (error, data) => {
                if (error) {
                    PersistUtility.createFileIfNotExistsAsync(PersistUtility.historyFilePath).then(_ => resolve(PersistUtility.emptyHttpRequestItems));
                } else {
                    let fileContent = data.toString();
                    if (fileContent) {
                        try {
                            resolve(JSON.parse(fileContent));
                            return;
                        } catch (error) {
                        }
                    }
                    resolve(PersistUtility.emptyHttpRequestItems);
                }
            });
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