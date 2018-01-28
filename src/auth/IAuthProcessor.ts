export interface IAuthProcessor {
    process(options: any): Promise<any>;
}