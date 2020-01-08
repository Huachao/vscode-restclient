import { ExtensionContext, Range, ViewColumn, window } from 'vscode';
import { logger } from '../logger';
import { RestClientSettings } from '../models/configurationSettings';
import { HttpRequest, SerializedHttpRequest } from '../models/httpRequest';
import { RequestParserFactory } from '../models/requestParserFactory';
import { RequestVariableCacheKey } from '../models/requestVariableCacheKey';
import { RequestVariableCacheValue } from "../models/requestVariableCacheValue";
import { RestClientSettingsVS } from '../models/restClientSettingsVS';
import { trace } from "../utils/decorator";
import { HttpClient } from '../utils/httpClient';
import { PersistUtility } from '../utils/persistUtility';
import { RequestState, RequestStatusEntry } from '../utils/requestStatusEntry';
import { RequestStore } from '../utils/requestStore';
import { RequestVariableCache } from "../utils/requestVariableCache";
import { SelectorVS } from '../utils/selectorVS';
import { HttpResponseTextDocumentView } from '../views/httpResponseTextDocumentView';
import { HttpResponseWebview } from '../views/httpResponseWebview';

const uuidv4 = require('uuid/v4');

export class RequestController {
    private readonly _restClientSettings: RestClientSettingsVS = RestClientSettings.Instance as RestClientSettingsVS;
    private readonly _requestStore: RequestStore = RequestStore.Instance;
    private _requestStatusEntry: RequestStatusEntry;
    private _httpClient: HttpClient;
    private _webview: HttpResponseWebview;
    private _textDocumentView: HttpResponseTextDocumentView;

    public constructor(context: ExtensionContext) {
        this._requestStatusEntry = this._restClientSettings.getRequestStatusEntry();
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
        const document = this._restClientSettings.getCurrentDocumentWrapper();
        if (!editor || !document) {
            return;
        }

        const selectedRequest = await SelectorVS.getRequest(editor, range);
        if (!selectedRequest) {
            return;
        }

        const { text, name } = selectedRequest;

        // parse http request
        const httpRequest = new RequestParserFactory().createRequestParser(text).parseHttpRequest(document.fileName);

        if (name) {
            httpRequest.requestVariableCacheKey = new RequestVariableCacheKey(name, document);
        }

        await this.runCore(httpRequest);
    }

    @trace('Rerun Request')
    public async rerun() {
        const httpRequest = this._requestStore.getLatest();
        if (!httpRequest) {
            return;
        }

        await this.runCore(httpRequest);
    }

    @trace('Cancel Request')
    public async cancel() {
        if (this._requestStore.isCompleted()) {
            return;
        }

        // cancel current request
        this._requestStore.cancel();

        this._requestStatusEntry.update({ state: RequestState.Cancelled });
    }

    private async runCore(httpRequest: HttpRequest) {
        const requestId = uuidv4();
        this._requestStore.add(<string>requestId, httpRequest);

        // clear status bar
        this._requestStatusEntry.update({ state: RequestState.Pending });

        // set http request
        try {
            const response = await this._httpClient.send(httpRequest);

            // check cancel
            if (this._requestStore.isCancelled(<string>requestId)) {
                return;
            }

            this._requestStatusEntry.update({ state: RequestState.Received, response });

            if (httpRequest.requestVariableCacheKey) {
                RequestVariableCache.add(httpRequest.requestVariableCacheKey, new RequestVariableCacheValue(httpRequest, response));
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
                logger.error('Unable to preview response:', reason);
                window.showErrorMessage(reason);
            }

            // persist to history json file
            const serializedRequest = SerializedHttpRequest.convertFromHttpRequest(httpRequest);
            await PersistUtility.saveRequest(serializedRequest);
        } catch (error) {
            // check cancel
            if (this._requestStore.isCancelled(<string>requestId)) {
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
            logger.error('Failed to send request:', error);
            window.showErrorMessage(error.message);
        } finally {
            this._requestStore.complete(<string>requestId);
        }
    }

    public dispose() {
        this._requestStatusEntry.dispose();
        this._webview.dispose();
    }
}