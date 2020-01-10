import { EventEmitter, window } from 'vscode';
import * as Constants from '../common/constants';
import { RestClientSettings } from '../models/configurationSettings';
import { EnvironmentPickItem } from '../models/environmentPickItem';
import { trace } from "../utils/decorator";
import { EnvironmentStatusEntry } from '../utils/environmentStatusBarEntry';
import { EnvironmentVariableProvider } from '../utils/httpVariableProviders/environmentVariableProvider';
import { PersistUtility } from '../utils/persistUtility';

export class EnvironmentController {
    private static readonly noEnvironmentPickItem: EnvironmentPickItem = new EnvironmentPickItem(
        'No Environment', Constants.NoEnvironmentSelectedName, 'You Can Still Use Variables Defined In $shared Environment');

    private static readonly _onDidChangeEnvironment = new EventEmitter<string>();

    public static readonly onDidChangeEnvironment = EnvironmentController._onDidChangeEnvironment.event;

    private static readonly settings: RestClientSettings = RestClientSettings.Instance;

    private environmentStatusEntry: EnvironmentStatusEntry;

    public constructor(initEnvironment: EnvironmentPickItem) {
        EnvironmentVariableProvider.Instance.currentEnvironment = initEnvironment.label;
        this.environmentStatusEntry = new EnvironmentStatusEntry(initEnvironment.label);
    }

    @trace('Switch Environment')
    public async switchEnvironment() {
        const currentEnvironment = await EnvironmentController.getCurrentEnvironment();
        const itemPickList: EnvironmentPickItem[] = [];
        itemPickList.push(EnvironmentController.noEnvironmentPickItem);
        for (const name in EnvironmentController.settings.environmentVariables) {
            if (name === EnvironmentVariableProvider.sharedEnvironmentName) {
                continue;
            }
            const item = new EnvironmentPickItem(name, name);
            if (item.name === currentEnvironment.name) {
                item.description = '$(check)';
            }
            itemPickList.push(item);
        }

        const item = await window.showQuickPick(itemPickList, { placeHolder: "Select REST Client Environment" });
        if (!item) {
            return;
        }

        EnvironmentVariableProvider.Instance.currentEnvironment = item.label;
        EnvironmentController._onDidChangeEnvironment.fire(item.label);
        this.environmentStatusEntry.update(item.label);

        await PersistUtility.saveEnvironment(item);
    }

    public static async getCurrentEnvironment(): Promise<EnvironmentPickItem> {
        let currentEnvironment = await PersistUtility.loadEnvironment();
        if (!currentEnvironment) {
            currentEnvironment = EnvironmentController.noEnvironmentPickItem;
            await PersistUtility.saveEnvironment(currentEnvironment);
        }
        return currentEnvironment;
    }

    public dispose() {
        this.environmentStatusEntry.dispose();
    }
}