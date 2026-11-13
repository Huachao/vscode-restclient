import { TextDocument } from 'vscode';
import * as Constants from '../../common/constants';
import { EnvironmentController } from '../../controllers/environmentController';
import { SystemSettings } from '../../models/configurationSettings';
import { ResolveErrorMessage } from '../../models/httpVariableResolveResult';
import { VariableType } from '../../models/variableType';
import { fileEnvironments } from '../editorEnvironments';
import { HttpVariable } from '../../models/httpVariable';
import { HttpVariableProvider } from './httpVariableProvider';

/**
 * Variables of the selected environment. They come from two places, combined:
 *
 * - the settings (`rest-client.environmentVariables`), as always;
 * - the `http-client.env.json` / `http-client.private.env.json` files next to
 *   the `.http` file or further up, which is the JetBrains format.
 *
 * For the same environment and the same variable the file wins: what is in
 * the repository is what the whole team sees. `$shared` is preserved.
 */
export class EnvironmentVariableProvider implements HttpVariableProvider {
    private static _instance: EnvironmentVariableProvider;

    private readonly _settings: SystemSettings = SystemSettings.Instance;

    public static get Instance(): EnvironmentVariableProvider {
        if (!this._instance) {
            this._instance = new EnvironmentVariableProvider();
        }

        return this._instance;
    }

    private constructor() {
    }

    public readonly type: VariableType = VariableType.Environment;

    public async has(name: string, document?: TextDocument): Promise<boolean> {
        const variables = await this.getAvailableVariables(document);
        return name in variables;
    }

    public async get(name: string, document?: TextDocument): Promise<HttpVariable> {
        const variables = await this.getAvailableVariables(document);
        if (!(name in variables)) {
            return { name, error: ResolveErrorMessage.EnvironmentVariableNotExist };
        }

        return { name, value: variables[name] };
    }

    public async getAll(document?: TextDocument): Promise<HttpVariable[]> {
        const variables = await this.getAvailableVariables(document);
        return Object.keys(variables).map(key => ({ name: key, value: variables[key] }));
    }

    private async getAvailableVariables(document?: TextDocument): Promise<{ [key: string]: string }> {
        let { name: environmentName } = await EnvironmentController.getCurrentEnvironment();
        const withoutEnvironment = environmentName === Constants.NoEnvironmentSelectedName;
        if (withoutEnvironment) {
            environmentName = EnvironmentController.sharedEnvironmentName;
        }
        const variables = this._settings.environmentVariables;
        // Copies: the `{{$shared x}}` mapping below writes into the object,
        // and the original used to write into the settings themselves.
        const currentEnvironmentVariables = { ...(variables[environmentName] ?? {}) };
        const sharedEnvironmentVariables = { ...(variables[EnvironmentController.sharedEnvironmentName] ?? {}) };

        // Resolve mappings from shared environment
        this.mapEnvironmentVariables('shared', sharedEnvironmentVariables, sharedEnvironmentVariables);
        this.mapEnvironmentVariables('shared', currentEnvironmentVariables, sharedEnvironmentVariables);

        // Resolve mappings from current environment
        this.mapEnvironmentVariables(environmentName, currentEnvironmentVariables, currentEnvironmentVariables);

        const fromFile = withoutEnvironment ? {} : (fileEnvironments(document)[environmentName] ?? {});
        return { ...sharedEnvironmentVariables, ...currentEnvironmentVariables, ...fromFile };
    }

    private mapEnvironmentVariables(environment: string, current: { [key: string]: string }, shared: { [key: string]: string }) {
        for (const [key, value] of Object.entries(current)) {
            const variableRegex = new RegExp(`\\{{2}\\$${environment} (.+?)\\}{2}`);
            const match = variableRegex.exec(value);

            if (!match) {
                continue;
            }

            const referenceKey = match[1].trim();
            if (shared[referenceKey] === undefined) {
                continue;
            }

            current[key] = current[key]!.replace(variableRegex, shared[referenceKey]!);
        }
    }
}
