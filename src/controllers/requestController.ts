import { ExtensionContext, Range, ViewColumn, window } from 'vscode';
import { logger } from '../logger';
import { HttpResponse } from '../models/httpResponse';
import { RestClientSettingsVS } from '../models/restClientSettingsVS';
import { trace } from "../utils/decorator";
import { RequestState } from '../utils/requestStatusEntry';
import { SelectorVS } from '../utils/selectorVS';
import { HttpResponseTextDocumentView } from '../views/httpResponseTextDocumentView';
import { HttpResponseWebview } from '../views/httpResponseWebview';
import { RestClient } from './RestClient';

export class RequestController extends RestClient {
    private _webview: HttpResponseWebview;
    private _textDocumentView: HttpResponseTextDocumentView;

    public constructor(context: ExtensionContext) {
        super();
        this._webview = new HttpResponseWebview(context);
        this._webview.onDidCloseAllWebviewPanels(() => {
            this._requestStatusEntry.update({ state: RequestState.Closed });
        });
        this._textDocumentView = new HttpResponseTextDocumentView();
    }

    private get settingsVS(): RestClientSettingsVS {
        return this._restClientSettings as RestClientSettingsVS;
    }

    @trace('Request')
    public async run(range: Range) {
        const editor = window.activeTextEditor;
        const document = this._restClientSettings.getCurrentDocumentWrapper();
        if (!editor || !document) {
            return;
        }

        const selectedText = SelectorVS.getCurrentText(editor, range);

        if (selectedText === null) {
            return null;
        }

        await this.runText(selectedText);
    }

    @trace('Rerun Request')
    public async rerun() {
        await super.rerun();
    }

    @trace('Cancel Request')
    public async cancel() {
        await super.cancel();
    }

    renderResponse(response: HttpResponse): void {
        try {
            const activeColumn = window.activeTextEditor!.viewColumn;
            const previewColumn = this.settingsVS.previewColumn === ViewColumn.Active
                ? activeColumn
                : ((activeColumn as number) + 1) as ViewColumn;
            if (this._restClientSettings.previewResponseInUntitledDocument) {
                this._textDocumentView.render(response, previewColumn);
            } else if (previewColumn) {
                this._webview.render(response, previewColumn);
            }
        } catch (reason) {
            logger.error('Unable to preview response:', reason);
            window.showErrorMessage(reason);
        }
    }

    public dispose() {
        super.dispose();
        this._webview.dispose();
    }
}