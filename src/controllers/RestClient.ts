import { RestClientSettings } from '../models/configurationSettings';
import { HttpRequest, SerializedHttpRequest } from '../models/httpRequest';
import { HttpResponse } from '../models/httpResponse';
import { RequestParserFactory } from '../models/requestParserFactory';
import { RequestVariableCacheKey } from '../models/requestVariableCacheKey';
import { RequestVariableCacheValue } from "../models/requestVariableCacheValue";
import { HttpClient } from '../utils/httpClient';
import { PersistUtility } from '../utils/persistUtility';
import { RequestState, RequestStatusEntry } from '../utils/requestStatusEntry';
import { RequestStore } from '../utils/requestStore';
import { RequestVariableCache } from "../utils/requestVariableCache";
import { Selector } from '../utils/selector';

const uuidv4 = require('uuid/v4');

export abstract class RestClient {
    protected readonly _restClientSettings: RestClientSettings = RestClientSettings.Instance;
    protected readonly _requestStore: RequestStore = RequestStore.Instance;
    protected  _requestStatusEntry: RequestStatusEntry;
    private _httpClient: HttpClient;

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
        const httpRequest = this._requestStore.getLatest();
        if (!httpRequest) {
            return;
        }

        await this.runCore(httpRequest);
    }

    public async cancel() {
        if (this._requestStore.isCompleted()) {
            return;
        }

        // cancel current request
        this._requestStore.cancel();

        this._requestStatusEntry.update({ state: RequestState.Cancelled });
    }

    protected async runCore(httpRequest: HttpRequest) {
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

            this.renderResponse(response);

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
            // logger.error('Failed to send request:', error);
            this._restClientSettings.showErrorMessage(error.message);
        } finally {
            this._requestStore.complete(<string>requestId);
        }
    }

    public abstract renderResponse(response: HttpResponse): void;

    public dispose() {
        this._requestStatusEntry.dispose();
    }
}