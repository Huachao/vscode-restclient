import * as fs from 'fs-extra';

export class JsonFileUtility {
    public static async serializeToFileAsync<T>(path: string, data: T): Promise<void> {
        await fs.ensureFile(path);
        await fs.writeJson(path, data);
    }

    public static async deserializeFromFileAsync<T>(path: string): Promise<T | undefined>;
    public static async deserializeFromFileAsync<T>(path: string, defaultValue: T): Promise<T>;
    public static async deserializeFromFileAsync<T>(path: string, defaultValue?: T): Promise<T | undefined> {
        try {
            return await fs.readJson(path);
        } catch {
            await fs.ensureFile(path);
            return defaultValue;
        }
    }
}