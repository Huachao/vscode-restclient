import { ExtensionContext, Range, TextDocument, ViewColumn, window } from 'vscode';
import * as Constants from '../common/constants';
import Logger from '../logger';
import { RestClientSettings } from '../models/configurationSettings';
import { HttpRequest, SerializedHttpRequest } from '../models/httpRequest';
import { RequestParserFactory } from '../models/requestParserFactory';
import { trace } from "../utils/decorator";
import { HttpClient } from '../utils/httpClient';
import { JsonFileUtility } from '../utils/jsonFileUtility';
import { RequestState, RequestStatusEntry } from '../utils/requestStatusBarEntry';
import { RequestVariableCache } from "../utils/requestVariableCache";
import { Selector } from '../utils/selector';
import { getCurrentTextDocument } from '../utils/workspaceUtility';
import { HttpResponseTextDocumentView } from '../views/httpResponseTextDocumentView';
import { HttpResponseWebview } from '../views/httpResponseWebview';

export class RequestController {
    private readonly _restClientSettings: RestClientSettings = RestClientSettings.Instance;
    private _requestStatusEntry: RequestStatusEntry;
    private _httpClient: HttpClient;
    private _webview: HttpResponseWebview;
    private _textDocumentView: HttpResponseTextDocumentView;
    private _lastRequest?: HttpRequest;
    private _lastPendingRequest?: HttpRequest;

    public constructor(context: ExtensionContext) {
        this._requestStatusEntry = new RequestStatusEntry();
        this._httpClient = new HttpClient();
        this._webview = new HttpResponseWebview(context);
        this._webview.onDidCloseAllWebviewPanels(() => {
            this._requestStatusEntry.update({ state: RequestState.Closed });
        });
        this._textDocumentView = new HttpResponseTextDocumentView();
    }

    @trace('Request')
    public async run(range: Range) {
        const editor = window.activeTextEditor;
        const document = getCurrentTextDocument();
        if (!editor || !document) {
            return;
        }

        const selectedRequest = await Selector.getRequest(editor, range);
        if (!selectedRequest) {
            return;
        }

        const { text, name, warnBeforeSend } = selectedRequest;

        if (warnBeforeSend) {
            const note = name ? `Are you sure you want to send the request "${name}"?` : 'Are you sure you want to send this request?';
            const userConfirmed = await window.showWarningMessage(note, 'Yes', 'No');
            if (userConfirmed !== 'Yes') {
                return;
            }
        }

        // parse http request
        const httpRequest = RequestParserFactory.createRequestParser(text).parseHttpRequest(document.fileName, name);

        await this.runCore(httpRequest, document);
    }

    @trace('Rerun Request')
    public async rerun() {
        if (!this._lastRequest) {
            return;
        }

        await this.runCore(this._lastRequest);
    }

    @trace('Cancel Request')
    public async cancel() {
        this._lastPendingRequest?.cancel();

        this._requestStatusEntry.update({ state: RequestState.Cancelled });
    }

    private async runCore(httpRequest: HttpRequest, document?: TextDocument) {
        // clear status bar
        this._requestStatusEntry.update({ state: RequestState.Pending });

        // set last request and last pending request
        this._lastPendingRequest = this._lastRequest = httpRequest;

        // set http request
        try {
            const response = await this._httpClient.send(httpRequest);

            // check cancel
            if (httpRequest.isCancelled) {
                return;
            }

            this._requestStatusEntry.update({ state: RequestState.Received, response });

            if (httpRequest.name && document) {
                RequestVariableCache.add(document, httpRequest.name, response);
            }

            try {
                const activeColumn = window.activeTextEditor!.viewColumn;
                const previewColumn = this._restClientSettings.previewColumn === ViewColumn.Active
                    ? activeColumn
                    : ((activeColumn as number) + 1) as ViewColumn;
                if (this._restClientSettings.previewResponseInUntitledDocument) {
                    this._textDocumentView.render(response, previewColumn);
                } else if (previewColumn) {
                    this._webview.render(response, previewColumn);
                }
            } catch (reason) {
                Logger.error('Unable to preview response:', reason);
                window.showErrorMessage(reason);
            }

            // persist to history json file
            await this.addToHistory(httpRequest);
        } catch (error) {
            // check cancel
            if (httpRequest.isCancelled) {
                return;
            }

            if (error.code === 'ETIMEDOUT') {
                error.message = `Please check your networking connectivity and your time out in ${this._restClientSettings.timeoutInMilliseconds}ms according to your configuration 'rest-client.timeoutinmilliseconds'. Details: ${error}. `;
            } else if (error.code === 'ECONNREFUSED') {
                error.message = `Connection is being rejected. The service isn’t running on the server, or incorrect proxy settings in vscode, or a firewall is blocking requests. Details: ${error}.`;
            } else if (error.code === 'ENETUNREACH') {
                error.message = `You don't seem to be connected to a network. Details: ${error}`;
            }
            this._requestStatusEntry.update({ state: RequestState.Error });
            Logger.error('Failed to send request:', error);
            window.showErrorMessage(error.message);
        } finally {
            if (this._lastPendingRequest === httpRequest) {
                this._lastPendingRequest = undefined;
            }
        }
    }

    public dispose() {
        this._requestStatusEntry.dispose();
        this._webview.dispose();
    }

    private async addToHistory(request: HttpRequest) {
        // persist to history json file
        const serializedRequest = SerializedHttpRequest.convertFromHttpRequest(request);
        const requests = await JsonFileUtility.deserializeFromFileAsync<SerializedHttpRequest[]>(Constants.HistoryFilePath, []);
        requests.unshift(serializedRequest);
        await JsonFileUtility.serializeToFileAsync(Constants.HistoryFilePath, requests.slice(0, Constants.HistoryItemsMaxCount));
    }
}