import { RestClientSettings } from '../models/configurationSettings';
import { HttpRequest, SerializedHttpRequest } from '../models/httpRequest';
import { HttpResponse } from '../models/httpResponse';
import { RequestParserFactory } from '../models/requestParserFactory';
import { RequestVariableCacheKey } from '../models/requestVariableCacheKey';
import { RequestVariableCacheValue } from "../models/requestVariableCacheValue";
import { HttpClient } from '../utils/httpClient';
import { PersistUtility } from '../utils/persistUtility';
import { RequestState, RequestStatusEntry } from '../utils/requestStatusEntry';
import { RequestVariableCache } from "../utils/requestVariableCache";
import { Selector } from '../utils/selector';

export abstract class RestClient {
    protected readonly _restClientSettings: RestClientSettings = RestClientSettings.Instance;
    protected _requestStatusEntry: RequestStatusEntry;
    private _httpClient: HttpClient;
    private _lastRequest?: HttpRequest;
    private _lastPendingRequest?: HttpRequest;

    public constructor() {
        this._requestStatusEntry = this._restClientSettings.getRequestStatusEntry();
        this._httpClient = new HttpClient();
    }

    public async runText(requestText: string) {
        const document = this._restClientSettings.getCurrentDocumentWrapper();
        if (!document) {
            return;
        }

        const selectedRequest = await Selector.getRequestFromText(requestText);
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

    public async rerun() {
        if (!this._lastRequest) {
            return;
        }

        await this.runCore(this._lastRequest);
    }

    public async cancel() {
        this._lastPendingRequest?.cancel();

        this._requestStatusEntry.update({ state: RequestState.Cancelled });
    }

    protected async runCore(httpRequest: HttpRequest) {
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

            if (httpRequest.requestVariableCacheKey) {
                RequestVariableCache.add(httpRequest.requestVariableCacheKey, new RequestVariableCacheValue(httpRequest, response));
            }

            this.renderResponse(response);

            // persist to history json file
            const serializedRequest = SerializedHttpRequest.convertFromHttpRequest(httpRequest);
            await PersistUtility.saveRequest(serializedRequest);
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
            this._requestStatusEntry.update({ state: RequestState.Error});
            // logger.error('Failed to send request:', error);
            this._restClientSettings.showErrorMessage(error.message);
        } finally {
            if (this._lastPendingRequest === httpRequest) {
                this._lastPendingRequest = undefined;
            }
        }
    }

    public abstract renderResponse(response: HttpResponse): void;

    public dispose() {
        this._requestStatusEntry.dispose();
    }
}