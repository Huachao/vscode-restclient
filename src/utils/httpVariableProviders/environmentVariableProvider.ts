'use strict';

import { TextDocument } from 'vscode';
import { EnvironmentController } from '../../controllers/environmentController';
import { RestClientSettings } from '../../models/configurationSettings';
import { ResolveErrorMessage } from '../../models/httpVariableResolveResult';
import { VariableType } from '../../models/variableType';
import { HttpVariableProvider, HttpVariableValue } from './httpVariableProvider';

export class EnvironmentVariableProvider implements HttpVariableProvider {
    private static _instance: EnvironmentVariableProvider;

    private readonly _setttings: RestClientSettings = RestClientSettings.Instance;

    public static get Instance(): EnvironmentVariableProvider {
        if (!EnvironmentVariableProvider._instance) {
            EnvironmentVariableProvider._instance = new EnvironmentVariableProvider();
        }

        return EnvironmentVariableProvider._instance;
    }

    private constructor() {
    }

    public readonly type: VariableType = VariableType.Environment;

    public async has(document: TextDocument, name: string): Promise<boolean> {
        const variables = await this.getAvailableVariables();
        return name in variables;
    }

    public async get(document: TextDocument, name: string): Promise<HttpVariableValue> {
        const variables = await this.getAvailableVariables();
        if (!(name in variables)) {
            return { name, error: ResolveErrorMessage.EnvironmentVariableNotExist };
        }

        return { name, value: variables[name] };
    }

    public async getAll(document: TextDocument): Promise<HttpVariableValue[]> {
        const variables = await this.getAvailableVariables();
        return Object.keys(variables).map(key => ({ name: key, value: variables[key]}));
    }

    private async getAvailableVariables(): Promise<{ [key: string]: string }> {
        const { name: environmentName } = await EnvironmentController.getCurrentEnvironment();
        const variables = this._setttings.environmentVariables;
        const currentEnvironmentVariables = variables[environmentName];
        const sharedEnvironmentVariables = variables[EnvironmentController.sharedEnvironmentName];
        return Object.assign({}, sharedEnvironmentVariables, currentEnvironmentVariables);
    }
}