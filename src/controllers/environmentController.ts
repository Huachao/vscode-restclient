"use strict";

import { StatusBarAlignment, StatusBarItem, window } from 'vscode';
import * as Constants from '../common/constants';
import { RestClientSettings } from '../models/configurationSettings';
import { EnvironmentPickItem } from '../models/environmentPickItem';
import { trace } from "../utils/decorator";
import { PersistUtility } from '../utils/persistUtility';

export class EnvironmentController {
    private static readonly noEnvironmentPickItem: EnvironmentPickItem = new EnvironmentPickItem(
        'No Environment', Constants.NoEnvironmentSelectedName, 'You Can Still Use Variables Defined In $shared Environment');

    public static readonly sharedEnvironmentName: string = '$shared';
    private static readonly settings: RestClientSettings = RestClientSettings.Instance;

    private _environmentStatusBarItem: StatusBarItem;

    public constructor(initEnvironment: EnvironmentPickItem) {
        if (EnvironmentController.settings.showEnvironmentStatusBarItem) {
            this._environmentStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Right, 100);
            this._environmentStatusBarItem.command = 'rest-client.switch-environment';
            this._environmentStatusBarItem.text = initEnvironment.label;
            this._environmentStatusBarItem.tooltip = 'Switch REST Client Environment';
            this._environmentStatusBarItem.show();
        }
    }

    @trace('Switch Environment')
    public async switchEnvironment() {
        let currentEnvironment = await EnvironmentController.getCurrentEnvironment();
        let itemPickList: EnvironmentPickItem[] = [];
        itemPickList.push(EnvironmentController.noEnvironmentPickItem);
        for (let name in EnvironmentController.settings.environmentVariables) {
            if (name === EnvironmentController.sharedEnvironmentName) {
                continue;
            }
            let item = new EnvironmentPickItem(name, name);
            if (item.name === currentEnvironment.name) {
                item.description = '$(check)';
            }
            itemPickList.push(item);
        }

        let item = await window.showQuickPick(itemPickList, { placeHolder: "Select REST Client Environment" });
        if (!item) {
            return;
        }

        if (EnvironmentController.settings.showEnvironmentStatusBarItem) {
            this._environmentStatusBarItem.text = item.label;
        }

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
    }
}