"use strict";

import { StatusBarItem, StatusBarAlignment, window } from 'vscode';
import { RestClientSettings } from '../models/configurationSettings';
import { EnvironmentPickItem } from '../models/environmentPickItem';
import { PersistUtility } from '../persistUtility';
import * as Constants from '../constants';
import { trace } from "../decorator";

export class EnvironmentController {
    private static readonly noEnvironmentPickItem: EnvironmentPickItem = new EnvironmentPickItem(
        'No Environment', Constants.NoEnvironmentSelectedName, 'You Can Still Use Variables Defined In $shared Environment');

    private static readonly sharedEnvironmentName: string = '$shared';

    private _environmentStatusBarItem: StatusBarItem;
    private _restClientSettings: RestClientSettings;

    public constructor(initEnvironment: EnvironmentPickItem) {
        this._restClientSettings = new RestClientSettings();

        if (this._restClientSettings.showEnvironmentStatusBarItem) {
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
        for (let name in this._restClientSettings.environmentVariables) {
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

        if (this._restClientSettings.showEnvironmentStatusBarItem) {
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

    public static async getCustomVariables(environment: EnvironmentPickItem = null): Promise<Map<string, string>> {
        if (!environment) {
            environment = await EnvironmentController.getCurrentEnvironment();
        }

        let settings = new RestClientSettings();
        let environments = settings.environmentVariables;
        let variables = {};
        Object.assign(
            variables,
            environments[EnvironmentController.sharedEnvironmentName] || {},
            environments[environment.name] || {});

        const map = new Map<string, string>();
        Object.keys(variables).forEach(key => {
            map.set(key, variables[key]);
        });
        return map;
    }

    public dispose() {
    }
}