import { EventEmitter, l10n, QuickPickItem, window } from 'vscode';
import * as Constants from '../common/constants';
import { SystemSettings } from '../models/configurationSettings';
import { fileEnvironments } from '../utils/editorEnvironments';
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

    /**
     * With no argument it asks; with a name it switches directly (the tests
     * and any automation use this). `''` goes back to «no environment».
     */
    public async switchEnvironment(name?: string) {
        const fromSettings = Object.keys(this.settings.environmentVariables)
            .filter(name => name !== EnvironmentController.sharedEnvironmentName);
        const fromFile = Object.keys(fileEnvironments());
        const names = [...new Set([...fromSettings, ...fromFile])];

        const userEnvironments: EnvironmentPickItem[] = names.map(name => ({
            name,
            label: name,
            description: [
                name === this.currentEnvironment.name ? '$(check)' : '',
                fromFile.includes(name) ? l10n.t('from http-client.env.json') : ''
            ].filter(Boolean).join(' ') || undefined
        }));

        const itemPickList: EnvironmentPickItem[] = [EnvironmentController.noEnvironmentPickItem, ...userEnvironments];

        let item: EnvironmentPickItem | undefined;
        if (name !== undefined) {
            item = name === '' ? EnvironmentController.noEnvironmentPickItem : userEnvironments.find(e => e.name === name);
            if (!item) {
                window.showWarningMessage(l10n.t('There is no environment named "{0}"', name));
                return;
            }
        } else {
            item = await window.showQuickPick(itemPickList, { placeHolder: l10n.t('Select Rest Client environment') });
            if (!item) {
                return;
            }
        }

        this.currentEnvironment = item;

        EnvironmentController._onDidChangeEnvironment.fire(item.label);
        this.environmentStatusEntry.update(item.label);

        await UserDataManager.setEnvironment({ name: item.name, label: item.label });
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
}
