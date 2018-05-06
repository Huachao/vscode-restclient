'use strict';

import { WebviewPanel, extensions, EventEmitter, Event } from 'vscode';
import { RestClientSettings } from '../models/configurationSettings';
import * as Constants from '../constants';

export abstract class BaseWebview {

    protected _onDidCloseAllWebviewPanels = new EventEmitter();

    protected readonly extensionPath: string;

    protected panels: WebviewPanel[];

    protected constructor(protected settings?: RestClientSettings) {
        this.extensionPath = extensions.getExtension(Constants.ExtensionId).extensionPath;
        this.panels = [];
    }

    public get onDidCloseAllWebviewPanels(): Event<{}> {
        return this._onDidCloseAllWebviewPanels.event;
    }

    protected abstract get viewType(): string;
}