'use strict';

import { WebviewPanel, extensions, EventEmitter, Event, Uri } from 'vscode';
import { RestClientSettings } from '../models/configurationSettings';
import * as Constants from '../constants';
import * as path from 'path';

export abstract class BaseWebview {

    protected _onDidCloseAllWebviewPanels = new EventEmitter<void>();

    protected readonly styleFolderPath: Uri;

    protected readonly styleFilePath: Uri;

    protected readonly scriptFolderPath: Uri;

    protected readonly scriptFilePath: Uri;

    protected panels: WebviewPanel[];

    protected constructor(protected settings?: RestClientSettings) {
        const extensionPath = extensions.getExtension(Constants.ExtensionId).extensionPath;
        this.panels = [];
        this.styleFilePath = Uri.file(path.join(extensionPath, Constants.CSSFolderName, Constants.CSSFileName))
            .with({ scheme: 'vscode-resource' });
        this.styleFolderPath = Uri.file(path.join(extensionPath, Constants.CSSFolderName));
        this.scriptFilePath = Uri.file(path.join(extensionPath, Constants.ScriptsFolderName, Constants.ScriptFileName))
            .with({ scheme: 'vscode-resource' });
        this.scriptFolderPath = Uri.file(path.join(extensionPath, Constants.ScriptsFolderName));
    }

    public get onDidCloseAllWebviewPanels(): Event<void> {
        return this._onDidCloseAllWebviewPanels.event;
    }

    protected abstract get viewType(): string;
}