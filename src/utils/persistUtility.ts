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
        let requests = await this.deserializeFromFileAsync(this.historyFilePath, this.emptyHttpRequestItems);
        requests.unshift(httpRequest);
        requests = requests.slice(0, Constants.HistoryItemsMaxCount);
        await fs.writeJson(this.historyFilePath, requests);
    }

    public static loadRequests(): Promise<SerializedHttpRequest[]> {
        return this.deserializeFromFileAsync(this.historyFilePath, this.emptyHttpRequestItems);
    }

    public static clearRequests(): Promise<void> {
        return fs.writeJson(this.historyFilePath, this.emptyHttpRequestItems);
    }

    public static async saveEnvironment(environment: EnvironmentPickItem): Promise<void> {
        await this.ensureFileAsync(this.environmentFilePath);
        await fs.writeJson(this.environmentFilePath, environment);
    }

    public static loadEnvironment(): Promise<EnvironmentPickItem | undefined> {
        return this.deserializeFromFileAsync<EnvironmentPickItem>(this.environmentFilePath);
    }

    public static ensureCookieFile() {
        fs.ensureFileSync(this.cookieFilePath);
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