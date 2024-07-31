import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { HistoricalHttpRequest } from '../models/httpRequest';
import { JsonFileUtility } from './jsonFileUtility';

const restClientDir = 'rest-client';
const rootPath = process.env.VSC_REST_CLIENT_HOME !== undefined
    ? process.env.VSC_REST_CLIENT_HOME
    : path.join(os.homedir(), `.${restClientDir}`);

function getCachePath(): string {
    if (fs.existsSync(rootPath)) {
        return rootPath;
    }

    if (process.env.XDG_CACHE_HOME !== undefined) {
        return path.join(process.env.XDG_CACHE_HOME, restClientDir);
    }

    return rootPath;
}

function getStatePath(): string {
    if (fs.existsSync(rootPath)) {
        return rootPath;
    }

    if (process.env.XDG_STATE_HOME !== undefined) {
        return path.join(process.env.XDG_STATE_HOME, restClientDir);
    }

    return rootPath;
}

export class UserDataManager {

    private static readonly historyItemsMaxCount = 50;

    private static readonly cachePath: string = getCachePath();
    private static readonly statePath: string = getStatePath();

    public static get cookieFilePath() {
        return path.join(this.cachePath, 'cookie.json');
    }

    private static get historyFilePath() {
        return path.join(this.cachePath, 'history.json');
    }

    private static get environmentFilePath() {
        return path.join(this.statePath, 'environment.json');
    }

    private static get responseSaveFolderPath() {
        return path.join(this.cachePath, 'responses/raw');
    }

    private static get responseBodySaveFolderPath() {
        return path.join(this.cachePath, 'responses/body');
    }

    public static async initialize(): Promise<void> {
        await Promise.all([
            fs.ensureFile(this.historyFilePath),
            fs.ensureFile(this.cookieFilePath),
            fs.ensureFile(this.environmentFilePath),
            fs.ensureDir(this.responseSaveFolderPath),
            fs.ensureDir(this.responseBodySaveFolderPath)
        ]);
    }

    public static async addToRequestHistory(request: HistoricalHttpRequest) {
        const requests = await JsonFileUtility.deserializeFromFile<HistoricalHttpRequest[]>(this.historyFilePath, []);
        requests.unshift(request);
        await JsonFileUtility.serializeToFile(this.historyFilePath, requests.slice(0, this.historyItemsMaxCount));
    }

    public static clearRequestHistory(): Promise<void> {
        return JsonFileUtility.serializeToFile(this.historyFilePath, []);
    }

    public static getRequestHistory(): Promise<HistoricalHttpRequest[]> {
        return JsonFileUtility.deserializeFromFile(this.historyFilePath, []);
    }

    public static getEnvironment() {
        return JsonFileUtility.deserializeFromFile(this.environmentFilePath);
    }

    public static setEnvironment(item: unknown) {
        return JsonFileUtility.serializeToFile(this.environmentFilePath, item);
    }

    public static getResponseSaveFilePath(fileName: string) {
        return path.join(this.responseSaveFolderPath, fileName);
    }

    public static getResponseBodySaveFilePath(fileName: string) {
        return path.join(this.responseBodySaveFolderPath, fileName);
    }
}
