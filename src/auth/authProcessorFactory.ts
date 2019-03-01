// tslint:disable: ordered-imports

import { IAuthProcessor } from './IAuthProcessor';
import { HttpRequest } from '../models/httpRequest';
import * as Constants from '../common/constants';
import { SharePointAuthProcessor } from './implementation/sharePointAuthProcessor';
import { PassThroughProcessor } from './implementation/passThroughProcessor';
import { EnvironmentVariableProvider } from '../utils/httpVariableProviders/environmentVariableProvider';
import { window } from 'vscode';

export class AuthProcessorFactory {
    public static async resolveAuthProcessor(request: HttpRequest): Promise<IAuthProcessor> {
        let sharepointAuthPath = await EnvironmentVariableProvider.Instance.get(window.activeTextEditor.document, Constants.SharePointAuthEnvironmentKey);

        if (sharepointAuthPath) {
            return new SharePointAuthProcessor(request, sharepointAuthPath.value.toString());
        }

        return new PassThroughProcessor();
    }
}