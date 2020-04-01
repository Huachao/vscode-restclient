import * as path from 'path';
import { commands, Event, EventEmitter, ExtensionContext, Uri, WebviewPanel } from 'vscode';
import { RestClientSettings } from '../models/configurationSettings';

export abstract class BaseWebview {

    protected _onDidCloseAllWebviewPanels = new EventEmitter<void>();

    protected readonly settings: RestClientSettings = RestClientSettings.Instance;

    protected readonly styleFilePath: Uri;

    protected readonly scriptFilePath: Uri;

    protected readonly iconFilePath: Uri;

    protected panels: WebviewPanel[] = [];

    protected constructor(protected readonly context: ExtensionContext) {
        this.styleFilePath = Uri.file(this.context.asAbsolutePath(path.join('styles', 'rest-client.css')));
        this.scriptFilePath = Uri.file(this.context.asAbsolutePath(path.join('scripts', 'main.js')));
        this.iconFilePath = Uri.file(this.context.asAbsolutePath(path.join('images', 'rest_icon.png')));
    }

    public get onDidCloseAllWebviewPanels(): Event<void> {
        return this._onDidCloseAllWebviewPanels.event;
    }

    protected setPrviewActiveContext(value: boolean) {
        commands.executeCommand('setContext', this.previewActiveContextKey, value);
    }

    protected abstract get viewType(): string;

    protected abstract get previewActiveContextKey(): string;
}