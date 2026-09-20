import { EventEmitter, l10n, QuickPickItem, window } from 'vscode';
import * as Constants from '../common/constants';
import { SystemSettings } from '../models/configurationSettings';
import { trace } from "../utils/decorator";
import { entornosDeFichero } from '../utils/entornosEditor';
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
     * Sin argumento pregunta; con nombre cambia directamente (lo usan las
     * pruebas y cualquier automatización). `''` vuelve a «sin entorno».
     */
    @trace('Switch Environment')
    public async switchEnvironment(nombre?: string) {
        const deAjustes = Object.keys(this.settings.environmentVariables)
            .filter(name => name !== EnvironmentController.sharedEnvironmentName);
        const deFichero = Object.keys(entornosDeFichero());
        const nombres = [...new Set([...deAjustes, ...deFichero])];

        const userEnvironments: EnvironmentPickItem[] = nombres.map(name => ({
            name,
            label: name,
            description: [
                name === this.currentEnvironment.name ? '$(check)' : '',
                deFichero.includes(name) ? l10n.t('from http-client.env.json') : ''
            ].filter(Boolean).join(' ') || undefined
        }));

        const itemPickList: EnvironmentPickItem[] = [EnvironmentController.noEnvironmentPickItem, ...userEnvironments];

        let item: EnvironmentPickItem | undefined;
        if (nombre !== undefined) {
            item = nombre === '' ? EnvironmentController.noEnvironmentPickItem : userEnvironments.find(e => e.name === nombre);
            if (!item) {
                window.showWarningMessage(l10n.t('There is no environment named "{0}"', nombre));
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
