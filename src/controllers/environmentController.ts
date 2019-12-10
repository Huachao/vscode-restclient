import { languages, StatusBarAlignment, StatusBarItem, window } from 'vscode';
import * as Constants from '../common/constants';
import { RestClientSettings } from '../models/configurationSettings';
import { EnvironmentPickItem } from '../models/environmentPickItem';
import { trace } from "../utils/decorator";
import { PersistUtility } from '../utils/persistUtility';
import { getCurrentTextDocument } from '../utils/workspaceUtility';

export class EnvironmentController {
    private static readonly noEnvironmentPickItem: EnvironmentPickItem = new EnvironmentPickItem(
        'No Environment', Constants.NoEnvironmentSelectedName, 'You Can Still Use Variables Defined In $shared Environment');

    public static readonly sharedEnvironmentName: string = '$shared';
    private static readonly settings: RestClientSettings = RestClientSettings.Instance;

    private _environmentStatusBarItem: StatusBarItem;

    public constructor(initEnvironment: EnvironmentPickItem) {
        this._environmentStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 100);
        this._environmentStatusBarItem.command = 'rest-client.switch-environment';
        this._environmentStatusBarItem.text = initEnvironment.label;
        this._environmentStatusBarItem.tooltip = 'Switch REST Client Environment';
        this._environmentStatusBarItem.show();

        window.onDidChangeActiveTextEditor(this.showHideStatusBar, this);
    }

    @trace('Switch Environment')
    public async switchEnvironment() {
        const currentEnvironment = await EnvironmentController.getCurrentEnvironment();
        const itemPickList: EnvironmentPickItem[] = [];
        itemPickList.push(EnvironmentController.noEnvironmentPickItem);
        for (const name in EnvironmentController.settings.environmentVariables) {
            if (name === EnvironmentController.sharedEnvironmentName) {
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

        this._environmentStatusBarItem.text = item.label;

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
        this._environmentStatusBarItem.dispose();
    }

    private showHideStatusBar() {
        const document = getCurrentTextDocument();
        if (document && languages.match(['http', 'plaintext'], document)) {
            this._environmentStatusBarItem.show();
            return;
        } else {
            this._environmentStatusBarItem.hide();
        }
    }
}