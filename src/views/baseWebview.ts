'use strict';

import * as path from 'path';
import { Event, EventEmitter, extensions, Uri, WebviewPanel } from 'vscode';
import * as Constants from '../common/constants';
import { RestClientSettings } from '../models/configurationSettings';

export abstract class BaseWebview {

    protected _onDidCloseAllWebviewPanels = new EventEmitter<void>();

    protected readonly settings: RestClientSettings = RestClientSettings.Instance;

    protected readonly extensionPath: string;

    protected readonly styleFolderPath: Uri;

    protected readonly styleFilePath: Uri;

    protected readonly scriptFolderPath: Uri;

    protected readonly scriptFilePath: Uri;

    protected panels: WebviewPanel[];

    protected constructor() {
        this.extensionPath = extensions.getExtension(Constants.ExtensionId)!.extensionPath;
        this.panels = [];
        this.styleFilePath = Uri.file(path.join(this.extensionPath, Constants.CSSFolderName, Constants.CSSFileName));
        this.styleFolderPath = Uri.file(path.join(this.extensionPath, Constants.CSSFolderName));
        this.scriptFilePath = Uri.file(path.join(this.extensionPath, Constants.ScriptsFolderName, Constants.ScriptFileName));
        this.scriptFolderPath = Uri.file(path.join(this.extensionPath, Constants.ScriptsFolderName));
    }

    public get onDidCloseAllWebviewPanels(): Event<void> {
        return this._onDidCloseAllWebviewPanels.event;
    }

    protected abstract get viewType(): string;
}