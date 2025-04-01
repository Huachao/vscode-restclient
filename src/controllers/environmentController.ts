import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter, QuickPickItem, window } from 'vscode';
import * as Constants from '../common/constants';
import { SystemSettings } from '../models/configurationSettings';
import { trace } from "../utils/decorator";
import { EnvironmentStatusEntry } from '../utils/environmentStatusBarEntry';
import { UserDataManager } from '../utils/userDataManager';

type EnvironmentPickItem = QuickPickItem & { name: string };

export class EnvironmentController {
    private static readonly noEnvironmentPickItem: EnvironmentPickItem = {
        label: 'No Environment',
        name: Constants.NoEnvironmentSelectedName,
        description: 'You can still use variables defined in the $shared environment'
    };

    public static readonly sharedEnvironmentName: string = '$shared';

    private static readonly _onDidChangeEnvironment = new EventEmitter<string>();

    public static readonly onDidChangeEnvironment = EnvironmentController._onDidChangeEnvironment.event;

    private readonly settings: SystemSettings = SystemSettings.Instance;

    private environmentStatusEntry: EnvironmentStatusEntry;

    private currentEnvironment: EnvironmentPickItem;

    private constructor(initEnvironment: EnvironmentPickItem) {
        this.currentEnvironment = initEnvironment;
        this.environmentStatusEntry = new EnvironmentStatusEntry(initEnvironment.label);
    }

    @trace('Switch Environment')
    public async switchEnvironment() {
        // Add no environment at the top
        const userEnvironments: EnvironmentPickItem[] =
            Object.keys(this.settings.environmentVariables)
                .filter(name => name !== EnvironmentController.sharedEnvironmentName)
                .map(name => ({
                    name,
                    label: name,
                    description: name === this.currentEnvironment.name ? '$(check)' : undefined
                }));

        const itemPickList: EnvironmentPickItem[] = [EnvironmentController.noEnvironmentPickItem, ...userEnvironments];
        const item = await window.showQuickPick(itemPickList, { placeHolder: "Select REST Client Environment!!!" });
        if (!item) {
            return;
        }

        this.currentEnvironment = item;

        EnvironmentController._onDidChangeEnvironment.fire(item.label);
        this.environmentStatusEntry.update(item.label);

        if (this.settings.environmentVariables[item.label]?.auto_fetch_token_data) {
            const { default: fetch } = await import('node-fetch');
            const token = await this.getTokenForEnvironment(item.label, this.settings.environmentVariables[item.label].auto_fetch_token_data, fetch);
            if (token !== '') {
                await this.setAuthToken(token);
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Notification,
                    title: `Token is Created Successfully for Environment ${item.label}!`,
                    cancellable: false
                }, async (progress) => {
                    progress.report({ increment: 0 });

                    // Simulate a delay of 10 seconds
                    await new Promise(resolve => setTimeout(resolve, 5000));

                    progress.report({ increment: 100, message: "Done!" });
                });
            }
        }

        await UserDataManager.setEnvironment(item);
    }

    public static async create(): Promise<EnvironmentController> {
        const environment = await this.getCurrentEnvironment();
        return new EnvironmentController(environment);
    }

    public static async getCurrentEnvironment(): Promise<EnvironmentPickItem> {
        const currentEnvironment = await UserDataManager.getEnvironment() as EnvironmentPickItem | undefined;
        return currentEnvironment || this.noEnvironmentPickItem;
    }

    public dispose() {
        this.environmentStatusEntry.dispose();
    }

    private async setAuthToken(token: string): Promise<void> {
        try {
            // Add token to $shared environment variables
            if (!this.settings.environmentVariables[EnvironmentController.sharedEnvironmentName]) {
                this.settings.environmentVariables[EnvironmentController.sharedEnvironmentName] = {};
            }

            this.settings.environmentVariables[EnvironmentController.sharedEnvironmentName].token = token;

            // Check if workspace exists and has settings
            const workspaceConfig = vscode.workspace.getConfiguration('rest-client');
            const hasWorkspaceConfig = workspaceConfig.inspect('environmentVariables')?.workspaceValue !== undefined;

            // Update settings at workspace level if available, otherwise fallback to global
            await vscode.workspace.getConfiguration().update(
                'rest-client.environmentVariables',
                this.settings.environmentVariables,
                hasWorkspaceConfig ? vscode.ConfigurationTarget.Workspace : vscode.ConfigurationTarget.Global
            );

            const scope = hasWorkspaceConfig ? 'workspace' : 'global';
            console.log(`Token updated in $shared environment variables (${scope} scope)`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to update token in shared environment: ${error}`);
        }
    }

    private getNestedValue(obj: any, path: string[]): any {
        return path.reduce((acc, key) => acc && acc[key], obj);
    }

    private async getTokenForEnvironment(environmentName: string, autoFetchTokenData: any, fetch: any): Promise<string> {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
            vscode.window.showErrorMessage('No active editor found');
            return '';
        }

        // Add check for .http extension
        if (!activeEditor.document.fileName.toLowerCase().endsWith('.http')) {
            vscode.window.showErrorMessage('Please open a .http file to continue');
            return '';
        }

        const envFilePath = path.join(path.dirname(activeEditor.document.fileName), `.env`);
        let clientId: string | undefined;
        let clientSecret: string | undefined;

        if (!autoFetchTokenData.client_id_variable_name || !autoFetchTokenData.client_secret_variable_name) {
            vscode.window.showErrorMessage(`client_id_variable_name and client_secret_variable_name must configured in settings.`);
            return '';
        }

        try {
            if (fs.existsSync(envFilePath)) {
                const envContent = await fs.promises.readFile(envFilePath, 'utf8');
                const lines = envContent.split('\n');

                for (const line of lines) {
                    const [key, value] = line.split('=').map(part => part.trim());
                    if (key === autoFetchTokenData.client_id_variable_name) clientId = value;
                    if (key === autoFetchTokenData.client_secret_variable_name) clientSecret = value;
                }
            } else {
                // Create new .env file if it doesn't exist
                await fs.promises.writeFile(envFilePath, '', { flag: 'w' });
                vscode.window.showInformationMessage('Created new .env file. Please add your client credentials.');
                return '';
            }
        } catch (error) {
            vscode.window.showErrorMessage(`auto_fetch_token_data is configured for environment but there is no .env created adjacent to this http file.`);
            return '';
        }

        if (!clientId || !clientSecret) {
            vscode.window.showErrorMessage(`${autoFetchTokenData.client_id_variable_name} and ${autoFetchTokenData.client_secret_variable_name} must be defined in .env.`);
            return '';
        }
        const encodedCredentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

        const headers: any = {
            'Authorization': `${autoFetchTokenData['auth_type']} ${encodedCredentials}`
        };
        if (autoFetchTokenData['content_type']) {
            headers['Content-Type'] = autoFetchTokenData['content_type'];
        }
        const body = new URLSearchParams();
        if (autoFetchTokenData['grant_type']) {
            body.append('grant_type', autoFetchTokenData['grant_type']);
        }
        if (autoFetchTokenData['scope']) {
            body.append('scope', autoFetchTokenData['scope']);
        }

        const tokenExpression = autoFetchTokenData['response_token_value_tag_name'];

        if (!tokenExpression) {
            vscode.window.showErrorMessage(`response_token_value_tag_name is missing in settings for ${environmentName} where auto_fetch_token_data is configured`);
            return '';
        }

        try {
            const method = autoFetchTokenData['method'];
            if (!method) {
                throw new Error('method is missing in settings');
            }
            const token_request_url = autoFetchTokenData['token_request_url'];
            if (!token_request_url) {
                throw new Error('token_request_url is missing in settings');
            }

            const response = await fetch(token_request_url, {
                method: method,
                headers: headers,
                body: body
            });
            const data = await response.json();

            if (typeof data === 'object' && data !== null) {
                const token = this.getNestedValue(data, tokenExpression.split("."));
                if (token) {
                    return token;
                } else {
                    vscode.window.showErrorMessage(`Check the token_expression array in settings "${tokenExpression}" is not found in ${JSON.stringify(data)}`);
                    return '';
                }
            } else {
                throw new Error('Invalid response structure');
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Error fetching token: ${error}`);
            return '';
        }
    }
}