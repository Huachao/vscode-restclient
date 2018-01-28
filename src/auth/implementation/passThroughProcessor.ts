import { IAuthProcessor } from '../IAuthProcessor';

export class PassThroughProcessor implements IAuthProcessor {
    process(options: any): Promise<any> {
        return Promise.resolve(options);
    }
}