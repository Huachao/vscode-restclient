import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as Constants from '../common/constants';
import { EnvironmentPickItem } from '../models/environmentPickItem';
import { SerializedHttpRequest } from '../models/httpRequest';

export class PersistUtility {
    public static readonly historyFilePath: string = path.join(os.homedir(), Constants.ExtensionFolderName, Constants.HistoryFileName);
    public static readonly cookieFilePath: string = path.join(os.homedir(), Constants.ExtensionFolderName, Constants.CookieFileName);
    public static readonly environmentFilePath: string = path.join(os.homedir(), Constants.ExtensionFolderName, Constants.EnvironmentFileName);
    private static emptyHttpRequestItems: SerializedHttpRequest[] = [];

    public static async saveRequest(httpRequest: SerializedHttpRequest): Promise<void> {
        let requests = await PersistUtility.deserializeFromFileAsync(PersistUtility.historyFilePath, PersistUtility.emptyHttpRequestItems);
        requests.unshift(httpRequest);
        requests = requests.slice(0, Constants.HistoryItemsMaxCount);
        await fs.writeJson(PersistUtility.historyFilePath, requests);
    }

    public static loadRequests(): Promise<SerializedHttpRequest[]> {
        return PersistUtility.deserializeFromFileAsync(PersistUtility.historyFilePath, PersistUtility.emptyHttpRequestItems);
    }

    public static clearRequests(): Promise<void> {
        return fs.writeJson(PersistUtility.historyFilePath, PersistUtility.emptyHttpRequestItems);
    }

    public static async saveEnvironment(environment: EnvironmentPickItem): Promise<void> {
        await PersistUtility.ensureFileAsync(PersistUtility.environmentFilePath);
        await fs.writeJson(PersistUtility.environmentFilePath, environment);
    }

    public static loadEnvironment(): Promise<EnvironmentPickItem | undefined> {
        return PersistUtility.deserializeFromFileAsync<EnvironmentPickItem>(PersistUtility.environmentFilePath);
    }

    public static ensureCookieFile() {
        fs.ensureFileSync(PersistUtility.cookieFilePath);
    }

    public static ensureFileAsync(path: string): Promise<void> {
        return fs.ensureFile(path);
    }

    private static async deserializeFromFileAsync<T>(path: string): Promise<T | undefined>;
    private static async deserializeFromFileAsync<T>(path: string, defaultValue: T): Promise<T>;
    private static async deserializeFromFileAsync<T>(path: string, defaultValue?: T): Promise<T | undefined> {
        try {
            return await fs.readJson(path);
        } catch {
            await fs.ensureFile(path);
            return defaultValue;
        }
    }
}