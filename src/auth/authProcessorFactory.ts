import { IAuthProcessor } from './IAuthProcessor';
import { HttpRequest } from '../models/httpRequest';
import * as Constants from '../constants';
import { SharePointAuthProcessor } from './implementation/sharePointAuthProcessor';
import { PassThroughProcessor } from './implementation/passThroughProcessor';
import { EnvironmentController } from '../controllers/environmentController';

export class AuthProcessorFactory {
    public static async resolveAuthProcessor(request: HttpRequest): Promise<IAuthProcessor> {
        let environmentVariables = await EnvironmentController.getCustomVariables();
        let sharepointAuthPath = environmentVariables.get(Constants.SharePointAuthEnvironmentKey);

        if (sharepointAuthPath) {
            return new SharePointAuthProcessor(request, sharepointAuthPath);
        }

        return new PassThroughProcessor();
    }
}