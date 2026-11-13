import { ExtensionContext, l10n, Range, TextDocument, Uri, ViewColumn, window, workspace } from 'vscode';
import { HostCertificateConflictError } from '../core/hostCertificateMatcher';
import { namedBlock, closeImports } from '../core/imports';
import { isRequest, splitBlocks } from '../core/sequence';
import Logger from '../logger';
import { IRestClientSettings, RequestSettings, RestClientSettings } from '../models/configurationSettings';
import { HistoricalHttpRequest, HttpRequest } from '../models/httpRequest';
import { RequestMetadata } from '../models/requestMetadata';
import { RequestParserFactory } from '../models/requestParserFactory';
import { OnReceive, HttpClient } from '../utils/httpClient';
import { isEventStream } from '../core/sse';
import { talk, bodyMessages, DEFAULT_LISTEN_MS } from '../core/websocket';
import { HttpResponse } from '../models/httpResponse';
import { getHeader } from '../utils/misc';
import { checkResponse } from '../utils/assertionReport';
import { Assertion } from '../core/assertions';
import { RequestState, RequestStatusEntry } from '../utils/requestStatusBarEntry';
import { RequestVariableCache } from "../utils/requestVariableCache";
import { Selector } from '../utils/selector';
import { UserDataManager } from '../utils/userDataManager';
import { getCurrentTextDocument } from '../utils/workspaceUtility';
import { HttpResponseTextDocumentView } from '../views/httpResponseTextDocumentView';
import { HttpResponseWebview } from '../views/httpResponseWebview';

export class RequestController {
    private _requestStatusEntry: RequestStatusEntry;
    private _httpClient: HttpClient;
    private _webview: HttpResponseWebview;
    private _textDocumentView: HttpResponseTextDocumentView;
    private _lastRequestSettingTuple: [HttpRequest, IRestClientSettings, Assertion[]];
    private _lastPendingRequest?: HttpRequest;

    public constructor(context: ExtensionContext) {
        this._requestStatusEntry = new RequestStatusEntry();
        this._httpClient = new HttpClient();
        this._webview = new HttpResponseWebview(context);
        this._webview.onDidCloseAllWebviewPanels(() => this._requestStatusEntry.update({ state: RequestState.Closed }));
        this._textDocumentView = new HttpResponseTextDocumentView();
    }

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

        const { text, metadatas, assertions } = selectedRequest;
        const name = metadatas.get(RequestMetadata.Name);

        if (metadatas.has(RequestMetadata.Note)) {
            const note = name
                ? l10n.t('Are you sure you want to send the request "{0}"?', name)
                : l10n.t('Are you sure you want to send this request?');
            const yes = l10n.t('Yes');
            const userConfirmed = await window.showWarningMessage(note, yes, l10n.t('No'));
            if (userConfirmed !== yes) {
                return;
            }
        }

        const requestSettings = new RequestSettings(metadatas);
        const settings: IRestClientSettings = new RestClientSettings(requestSettings);

        // parse http request
        const httpRequest = await RequestParserFactory.createRequestParser(text, settings).parseHttpRequest(name);

        if (httpRequest.method === 'WEBSOCKET') {
            await this.runWebSocket(httpRequest, settings, document, assertions);
            return;
        }

        await this.runCore(httpRequest, settings, document, assertions);
    }

    /**
     * Sends a request from a file by its name (or the first one) and returns
     * the response. This is what the agent tools use: it goes down the same
     * path as «Send Request», so variables, environments, secrets and the
     * panel behave exactly as if a person had done it.
     */
    public async sendFromFile(uri: Uri, requestName?: string): Promise<HttpResponse> {
        const document = await workspace.openTextDocument(uri);
        const documentText = document.getText();
        const blocks = splitBlocks(documentText).filter(isRequest);
        let block = requestName ? blocks.find(b => b.name === requestName) : blocks[0];
        if (!block && requestName && document.uri.scheme === 'file') {
            // It may live in an imported file, in which case it runs as `run #name`.
            const { imported } = closeImports(document.fileName, documentText);
            if (namedBlock(requestName, documentText, imported)) {
                block = { text: `run #${requestName}`, line: blocks[0]?.line ?? 0 };
            }
        }
        if (!block) {
            throw new Error(requestName ? `there is no request named "${requestName}" in ${document.fileName}` : `there are no requests in ${document.fileName}`);
        }
        const editor = await window.showTextDocument(document, { preview: false, preserveFocus: true });
        const line = new Range(block.line, 0, block.line, 0);
        const selectedRequest = block.text.startsWith('run #')
            ? await Selector.getRequestFromText(editor.document, block.text)
            : await Selector.getRequest(editor, line);
        if (!selectedRequest) {
            throw new Error('the request could not be read');
        }
        const { text, metadatas, assertions } = selectedRequest;
        const name = metadatas.get(RequestMetadata.Name);
        const settings: IRestClientSettings = new RestClientSettings(new RequestSettings(metadatas));
        const httpRequest = await RequestParserFactory.createRequestParser(text, settings).parseHttpRequest(name);
        const response = httpRequest.method === 'WEBSOCKET'
            ? await this.runWebSocket(httpRequest, settings, document, assertions)
            : await this.runCore(httpRequest, settings, document, assertions);
        if (!response) {
            throw new Error('the request failed or was cancelled');
        }
        return response;
    }

    public async rerun() {
        if (!this._lastRequestSettingTuple) {
            return;
        }

        const [request, settings, assertions] = this._lastRequestSettingTuple;

        // TODO: recover from last request settings
        await this.runCore(request, settings, undefined, assertions);
    }

    public async cancel() {
        this._lastPendingRequest?.cancel();

        this._requestStatusEntry.update({ state: RequestState.Cancelled });
    }
    public async clearCookies() {
        try {
            await this._httpClient.clearCookies();
        } catch (error) {
            window.showErrorMessage(l10n.t('Error clearing cookies: {0}', error?.message));
        }
    }

    private async runCore(httpRequest: HttpRequest, settings: IRestClientSettings, document?: TextDocument, assertions: Assertion[] = []): Promise<HttpResponse | undefined> {
        // clear status bar
        this._requestStatusEntry.update({ state: RequestState.Pending });

        // set last request and last pending request
        this._lastPendingRequest = httpRequest;
        this._lastRequestSettingTuple = [httpRequest, settings, assertions];

        // A text/event-stream is painted as it arrives: the panel opens with
        // the first chunk and grows. When it ends it is rendered whole like any
        // other response, so history and variables are unaffected.
        let streaming = false;
        const onReceive: OnReceive = (chunk, meta) => {
            if (settings.previewResponseInUntitledDocument || !isEventStream(getHeader(meta.headers, 'content-type') as string | undefined)) {
                return;
            }
            // A failure while painting the stream must not bring the request
            // down: it is logged and the full response still arrives at the end.
            try {
                if (!streaming) {
                    streaming = true;
                    this._webview.startStreaming(httpRequest, meta, this.resolvePreviewColumn(settings, document));
                }
                this._webview.appendChunk(chunk.toString('utf8'));
            } catch (e) {
                Logger.error('Streaming panel failed:', e);
                console.error('[rest-client] streaming panel failed:', e);
            }
        };

        // set http request
        try {
            const response = await this._httpClient.send(httpRequest, settings, onReceive);

            // check cancel
            if (httpRequest.isCancelled) {
                return undefined;
            }

            // The `# @assert` lines of the block, checked here as the runner
            // does, and shown with the response. Nothing blocks on a failure.
            if (assertions.length > 0) {
                response.assertions = checkResponse(assertions, response);
            }

            this._requestStatusEntry.update({ state: RequestState.Received, response });

            if (httpRequest.name && document) {
                RequestVariableCache.add(document, httpRequest.name, response);
            }

            try {
                const previewColumn = this.resolvePreviewColumn(settings, document);
                if (settings.previewResponseInUntitledDocument) {
                    await this._textDocumentView.render(response, previewColumn);
                } else {
                    await this._webview.render(response, previewColumn);
                }
            } catch (reason) {
                Logger.error('Unable to preview response:', reason);
                console.error('[rest-client] unable to preview response:', reason);
                window.showErrorMessage(reason);
            }

            // persist to history json file
            await UserDataManager.addToRequestHistory(HistoricalHttpRequest.convertFromHttpRequest(httpRequest));
            return response;
        } catch (error) {
            // check cancel
            if (httpRequest.isCancelled) {
                if (streaming) {
                    // Cancelling is the normal way to end a stream that never
                    // finishes: what was received stays in the panel.
                    this._webview.finishStreaming(l10n.t('cancelled; the events above were received before'));
                }
                return;
            }

            if (error instanceof HostCertificateConflictError) {
                error.message = l10n.t('Conflicting entries in rest-client.certificates: {0}. Case-equivalent keys must have identical cert, key, pfx and passphrase settings.', error.keys.map(key => JSON.stringify(key)).join(', '));
            } else if (error.code === 'ETIMEDOUT') {
                error.message = `Request timed out. Double-check your network connection and/or raise the timeout duration (currently set to ${settings.timeoutInMilliseconds}ms) as needed: 'rest-client.timeoutinmilliseconds'. Details: ${error}.`;
            } else if (error.code === 'ECONNREFUSED') {
                error.message = `The connection was rejected. Either the requested service isn’t running on the requested server/port, the proxy settings in vscode are misconfigured, or a firewall is blocking requests. Details: ${error}.`;
            } else if (error.code === 'ENETUNREACH') {
                error.message = `You don't seem to be connected to a network. Details: ${error}`;
            }
            this._requestStatusEntry.update({ state: RequestState.Error });
            Logger.error('Failed to send request:', error);
            console.error('[rest-client] failed to send request:', error);
            window.showErrorMessage(error.message);
            return undefined;
        } finally {
            if (this._lastPendingRequest === httpRequest) {
                this._lastPendingRequest = undefined;
            }
        }
    }

    /**
     * WEBSOCKET url: opens, sends the messages in the body (separated by ===),
     * listens for `@timeout` ms (3 s by default) and closes. The response is
     * the transcript, with status 101, so the panel, the history and the
     * assertions treat it like any other.
     */
    private async runWebSocket(httpRequest: HttpRequest, settings: IRestClientSettings, document?: TextDocument, assertions: Assertion[] = []): Promise<HttpResponse | undefined> {
        this._requestStatusEntry.update({ state: RequestState.Pending });
        this._lastRequestSettingTuple = [httpRequest, settings, assertions];
        const t0 = Date.now();
        try {
            const ms = settings.timeoutInMilliseconds > 0 ? settings.timeoutInMilliseconds : DEFAULT_LISTEN_MS;
            const r = await talk(httpRequest.url, httpRequest.headers as Record<string, string>, bodyMessages(httpRequest.rawBody), ms);
            if (r.closedBy === 'error' && r.received.length === 0) {
                throw new Error(r.detail ?? 'WebSocket error');
            }
            const body = Buffer.from(r.transcript, 'utf8');
            const total = Date.now() - t0;
            const response = new HttpResponse(
                101, 'Switching Protocols', '1.1',
                { 'Content-Type': 'text/plain; charset=utf-8', 'X-Closed-By': r.closedBy },
                r.transcript, body.length, 0, body,
                { total } as HttpResponse['timingPhases'],
                httpRequest);
            if (assertions.length > 0) {
                response.assertions = checkResponse(assertions, response);
            }
            this._requestStatusEntry.update({ state: RequestState.Received, response });
            if (httpRequest.name && document) {
                RequestVariableCache.add(document, httpRequest.name, response);
            }
            const previewColumn = this.resolvePreviewColumn(settings, document);
            if (settings.previewResponseInUntitledDocument) {
                await this._textDocumentView.render(response, previewColumn);
            } else {
                await this._webview.render(response, previewColumn);
            }
            await UserDataManager.addToRequestHistory(HistoricalHttpRequest.convertFromHttpRequest(httpRequest));
            return response;
        } catch (error) {
            this._requestStatusEntry.update({ state: RequestState.Error });
            Logger.error('WebSocket failed:', error);
            window.showErrorMessage(error instanceof Error ? error.message : String(error));
            return undefined;
        }
    }

    private resolvePreviewColumn(settings: IRestClientSettings, document?: TextDocument): ViewColumn {
        if (settings.previewColumn !== ViewColumn.Active) {
            return settings.previewColumn;
        }

        const requestEditor = document
            ? window.visibleTextEditors.find(editor => editor.document === document)
            : undefined;
        const editor = requestEditor ?? window.activeTextEditor;

        return editor?.viewColumn ?? ViewColumn.One;
    }

    public dispose() {
        this._requestStatusEntry.dispose();
        this._webview.dispose();
    }
}