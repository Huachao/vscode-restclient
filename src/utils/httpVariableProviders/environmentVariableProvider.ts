'use strict';

import { TextDocument } from 'vscode';
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

    public async has(document: TextDocument, name: string): Promise<boolean> {
        const variables = await this.getAvailableVariables();
        return name in variables;
    }

    public async get(document: TextDocument, name: string): Promise<HttpVariable> {
        const variables = await this.getAvailableVariables();
        if (!(name in variables)) {
            return { name, error: ResolveErrorMessage.EnvironmentVariableNotExist };
        }

        // Check if the variable is a reference to another variable
        const value = variables[name];
        const variableRegex = /\{{2}\$envRef(.+?)\}{2}/;
        const match = variableRegex.exec(value);

        if (match) {
            return this.getShared(match[1].trim());
        }

        return { name, value: variables[name] };
    }

    public async getAll(document: TextDocument): Promise<HttpVariable[]> {
        const variables = await this.getAvailableVariables();
        return Object.keys(variables).map(key => ({ name: key, value: variables[key]}));
    }

    private getShared(name: string): HttpVariable {
        const variables = this.getSharedVariables();
        if (!(name in variables)) {
            return { name, error: ResolveErrorMessage.EnvironmentReferenceVariableNotExist };
        }
        return { name, value: variables[name] };
    }

    private async getAvailableVariables(): Promise<{ [key: string]: string }> {
        const { name: environmentName } = await EnvironmentController.getCurrentEnvironment();
        const variables = this._settings.environmentVariables;
        const currentEnvironmentVariables = variables[environmentName];
        const sharedEnvironmentVariables = this.getSharedVariables();
        return Object.assign({}, sharedEnvironmentVariables, currentEnvironmentVariables);
    }

    private getSharedVariables(): { [key: string]: string } {
        const variables = this._settings.environmentVariables;
        const sharedEnvironmentVariables = variables[EnvironmentController.sharedEnvironmentName];
        return sharedEnvironmentVariables;
    }
}