import * as path from 'path';
import { commands, Event, EventEmitter, ExtensionContext, Uri, WebviewPanel } from 'vscode';
import { SystemSettings } from '../models/configurationSettings';

export abstract class BaseWebview {

    protected _onDidCloseAllWebviewPanels = new EventEmitter<void>();

    protected readonly settings: SystemSettings = SystemSettings.Instance;

    protected readonly baseFilePath: Uri;

    protected readonly vscodeStyleFilePath: Uri;

    protected readonly customStyleFilePath: Uri;

    protected readonly scriptFilePath: Uri;

    protected readonly iconFilePath: Uri;

    protected panels: WebviewPanel[] = [];

    protected activePanel: WebviewPanel | undefined;

    protected constructor(protected readonly context: ExtensionContext) {
        this.baseFilePath = Uri.file(this.context.asAbsolutePath(path.join('styles', 'reset.css')));
        this.vscodeStyleFilePath = Uri.file(this.context.asAbsolutePath(path.join('styles', 'vscode.css')));
        this.customStyleFilePath = Uri.file(this.context.asAbsolutePath(path.join('styles', 'rest-client.css')));
        this.scriptFilePath = Uri.file(this.context.asAbsolutePath(path.join('scripts', 'main.js')));
        this.iconFilePath = Uri.file(this.context.asAbsolutePath(path.join('images', 'rest_icon.png')));
    }

    public get onDidCloseAllWebviewPanels(): Event<void> {
        return this._onDidCloseAllWebviewPanels.event;
    }

    protected setPreviewActiveContext(value: boolean) {
        commands.executeCommand('setContext', this.previewActiveContextKey, value);
    }

    protected abstract get viewType(): string;

    protected abstract get previewActiveContextKey(): string;
}