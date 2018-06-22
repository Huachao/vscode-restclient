'use strict';

import { TextDocument } from 'vscode';
import { EnvironmentController } from '../../controllers/environmentController';
import { RestClientSettings } from '../../models/configurationSettings';
import { ResolveErrorMessage } from '../../models/requestVariableResolveResult';
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
        const [current, shared] = await this.getAvailableVariables();
        return name in current || name in shared;
    }

    public async get(document: TextDocument, name: string): Promise<HttpVariableValue> {
        const [current, shared] = await this.getAvailableVariables();
        if (!(name in current) && !(name in shared)) {
            return { name, error: ResolveErrorMessage.EnviornmentVariableNotExist };
        }

        return { name, value: current[name] || shared[name] };
    }

    public async getAll(document: TextDocument): Promise<HttpVariableValue[]> {
        const [current, shared] = await this.getAvailableVariables();
        const variables = Object.assign({}, shared, current);
        return Object.keys(variables).map(key => ({ name: key, value: variables[key]}));
    }

    private async getAvailableVariables(): Promise<{ [key: string]: string }[]> {
        const { name: environmentName } = await EnvironmentController.getCurrentEnvironment();
        const variables = this._setttings.environmentVariables;
        const currentEnvironmentVariables = variables[environmentName] || {};
        const sharedEnvironmentVariables = variables[EnvironmentController.sharedEnvironmentName] || {};
        return [currentEnvironmentVariables, sharedEnvironmentVariables];
    }
}