'use strict';

import * as Constants from '../../common/constants';
import { EnvironmentController } from '../../controllers/environmentController';
import { RestClientSettings } from '../../models/configurationSettings';
import { ResolveErrorMessage } from '../../models/httpVariableResolveResult';
import { VariableType } from '../../models/variableType';
import { HttpVariable, HttpVariableProvider } from './httpVariableProvider';

export class EnvironmentVariableProvider implements HttpVariableProvider {
    private static _instance: EnvironmentVariableProvider;

    private readonly _settings: RestClientSettings = RestClientSettings.Instance;

    public static get Instance(): EnvironmentVariableProvider {
        if (!EnvironmentVariableProvider._instance) {
            EnvironmentVariableProvider._instance = new EnvironmentVariableProvider();
        }

        return EnvironmentVariableProvider._instance;
    }

    private constructor() {
    }

    public readonly type: VariableType = VariableType.Environment;

    public async has(name: string): Promise<boolean> {
        const variables = await this.getAvailableVariables();
        return name in variables;
    }

    public async get(name: string): Promise<HttpVariable> {
        const variables = await this.getAvailableVariables();
        if (!(name in variables)) {
            return { name, error: ResolveErrorMessage.EnvironmentVariableNotExist };
        }

        return { name, value: variables[name] };
    }

    public async getAll(): Promise<HttpVariable[]> {
        const variables = await this.getAvailableVariables();
        return Object.keys(variables).map(key => ({ name: key, value: variables[key]}));
    }

    private async getAvailableVariables(): Promise<{ [key: string]: string }> {
        let { name: environmentName } = await EnvironmentController.getCurrentEnvironment();
        if (environmentName === Constants.NoEnvironmentSelectedName) {
            environmentName = EnvironmentController.sharedEnvironmentName;
        }
        const variables = this._settings.environmentVariables;
        const currentEnvironmentVariables = variables[environmentName];
        const sharedEnvironmentVariables = variables[EnvironmentController.sharedEnvironmentName];
        this.mapEnvironmentVariables(currentEnvironmentVariables, sharedEnvironmentVariables);
        return {...sharedEnvironmentVariables, ...currentEnvironmentVariables};
    }

    private mapEnvironmentVariables(current: any, shared: any) {
        for (const [key, value] of Object.entries(current)) {
            if (typeof(value) !== "string") {
                continue;
            }
            const variableRegex = /\{{2}\$shared (.+?)\}{2}/;
            const match = variableRegex.exec(value);
            if (!match) {
                continue;
            }
            const referenceKey = match[1].trim();
            if (typeof(shared[referenceKey]) === "string") {
                current[key] = shared[referenceKey];
            }
        }
    }
}