"use strict";

import { window, workspace, commands, Uri, StatusBarItem, StatusBarAlignment, ViewColumn, Disposable, TextDocument, Range } from 'vscode';
import { ArrayUtility } from "../common/arrayUtility";
import { RequestParserFactory } from '../models/requestParserFactory';
import { HttpClient } from '../httpClient';
import { HttpRequest } from '../models/httpRequest';
import { HttpResponse } from '../models/httpResponse';
import { SerializedHttpRequest } from '../models/httpRequest';
import { RestClientSettings } from '../models/configurationSettings';
import { PersistUtility } from '../persistUtility';
import { HttpResponseTextDocumentContentProvider } from '../views/httpResponseTextDocumentContentProvider';
import { UntitledFileContentProvider } from '../views/responseUntitledFileContentProvider';
import { trace } from "../decorator";
import { VariableProcessor } from '../variableProcessor';
import { RequestStore } from '../requestStore';
import { ResponseStore } from '../responseStore';
import { Selector } from '../selector';
import * as Constants from '../constants';
import { EOL } from 'os';
import * as Path from 'path';
import { glob, readFile } from "../common/fsUtility";
import { runRequestScript } from "../scriptUtility";
import { toHttpString } from "../common/valueUtility";
import { isNil } from "lodash";
import * as Enumerable from 'node-enumerable';

interface RunCoreOptions {
    openResponse?: boolean;
    responseResolver?: (err: any, response: HttpResponse) => void;
    showErrors?: boolean;
}

interface StringDocument {
    file: string;
    text: string;
}


const elegantSpinner = require('elegant-spinner');
const spinner = elegantSpinner();

const filesize = require('filesize');

const uuid = require('node-uuid');

export class RequestController {
    private _durationStatusBarItem: StatusBarItem;
    private _sizeStatusBarItem: StatusBarItem;
    private _restClientSettings: RestClientSettings;
    private _httpClient: HttpClient;
    private _responseTextProvider: HttpResponseTextDocumentContentProvider;
    private _registration: Disposable;
    private _interval: NodeJS.Timer;

    public constructor() {
        this._durationStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        this._sizeStatusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        this._restClientSettings = new RestClientSettings();
        this._httpClient = new HttpClient(this._restClientSettings);

        this._responseTextProvider = new HttpResponseTextDocumentContentProvider(this._restClientSettings);
        this._registration = workspace.registerTextDocumentContentProvider('rest-response', this._responseTextProvider);

        workspace.onDidCloseTextDocument((params) => this.onDidCloseTextDocument(params));
    }

    private async parseTextForRequest(text: string) {
        if (!text) {
            return text;
        }

        // remove comment lines
        let lines: string[] = text.split(/\r?\n/g);
        text = lines.filter(l => !Constants.CommentIdentifiersRegex.test(l)).join(EOL);
        if ('' === text) {
            return text;
        }

        const BASE_TEXT = text;

        // remove file variables definition lines
        lines = text.split(/\r?\n/g);
        text = ArrayUtility.skipWhile(lines, l => Constants.VariableDefinitionRegex.test(l) || l.trim() === '').join(EOL);

        // variables replacement
        return await VariableProcessor.processRawRequest(text, BASE_TEXT);
    }

    @trace('Request')
    public async run(range: Range) {
        let editor = window.activeTextEditor;
        if (!editor || !editor.document) {
            return;
        }

        // Get selected text of selected lines or full document
        let selectedText = new Selector().getSelectedText(editor, range);
        if (!selectedText) {
            return;
        }

        selectedText = await this.parseTextForRequest(selectedText);

        // parse http request
        let httpRequest = new RequestParserFactory().createRequestParser(selectedText).parseHttpRequest(selectedText, editor.document.fileName);
        if (!httpRequest) {
            return;
        }

        await this.runCore(httpRequest);
    }

    @trace('Request Script')
    public async runScript(range: Range) {
        try {
            const SCRIPT_EDITOR = window.activeTextEditor;
            if (!SCRIPT_EDITOR || !SCRIPT_EDITOR.document) {
                return;
            }

            const WORKSPACES = workspace.workspaceFolders;
            const REQUEST_DOCUMENTS: StringDocument[] = [];

            if (WORKSPACES) {
                const FILES: string[] = [];
                for (const WS of WORKSPACES) {
                    (await glob('**/*.{http,rest}', {
                        absolute: true,
                        nocase: true,
                        nodir: true,
                        nosort: true,
                        cwd: WS.uri.fsPath,
                        root: WS.uri.fsPath,
                    })).forEach(m => FILES.push(m));
                }

                for (const F of Enumerable.from(FILES).distinct()) {
                    REQUEST_DOCUMENTS.push({
                        file: F,
                        text: (await readFile(F)).toString('ascii'),
                    });
                }
            }

            let quickPickItems = REQUEST_DOCUMENTS.map(doc => {
                return {
                    label: Path.basename(doc.file),
                    description: '',
                    detail: Path.dirname(doc.file),
                    document: doc,
                };
            });
            quickPickItems = Enumerable.from(quickPickItems).orderBy(qp => {
                return qp.label.toLowerCase().trim();
            }).thenBy(qp => {
                return qp.detail.toLowerCase().trim();
            }).toArray();

            if (quickPickItems.length < 1) {
                window.showWarningMessage(
                    'No requests found!'
                );

                return;
            }

            const SELECTED_QP_ITEM = await window.showQuickPick(quickPickItems, {
                placeHolder: 'Select the request file, the script should be run for ...',
            });

            let selectedRequestDocument: StringDocument;

            if (SELECTED_QP_ITEM) {
                selectedRequestDocument = SELECTED_QP_ITEM.document;
            }

            if (!selectedRequestDocument) {
                return;
            }

            const SCRIPT = SCRIPT_EDITOR.document.getText(range);
            const SCRIPT_FILE = SCRIPT_EDITOR.document.fileName;
            const REQUEST_FILE = selectedRequestDocument.file;
            const REQUEST_DIR = Path.dirname(REQUEST_FILE);
            const UNPARSED_REQUEST = selectedRequestDocument.text;

            await runRequestScript({
                buildRequest: async (opts) => {
                    const VARS = opts.vars || {};

                    let parsedRequest = UNPARSED_REQUEST;
                    for (const VAR_NAME in VARS) {
                        const VALUE = toHttpString(VARS[VAR_NAME]);

                        parsedRequest = '@' + `${VAR_NAME} = ${VALUE}\n\n` + parsedRequest;
                    }
                    parsedRequest += "\n";

                    parsedRequest = await this.parseTextForRequest(parsedRequest);

                    return new RequestParserFactory().createRequestParser(parsedRequest)
                                                     .parseHttpRequest(parsedRequest, REQUEST_FILE);
                },
                cwd: REQUEST_DIR,
                requestFile: REQUEST_FILE,
                run: async (opts) => {
                    let response: HttpResponse;

                    await this.runCore(opts.request, {
                        openResponse: false,
                        responseResolver: (err, resp) => {
                            if (err) {
                                throw err;
                            } else {
                                response = resp;
                            }
                        },
                        showErrors: false,
                    });

                    return response;
                },
                script: SCRIPT,
                scriptFile: SCRIPT_FILE,
                uuid: uuid,
            });
        } catch (e) {
            window.showErrorMessage(`Could not execute script: '${e}'`);
        }
    }

    @trace('Rerun Request')
    public async rerun() {
        let httpRequest = RequestStore.getLatest();
        if (!httpRequest) {
            return;
        }

        await this.runCore(httpRequest);
    }

    @trace('Cancel Request')
    public async cancel() {

        if (RequestStore.isCompleted()) {
            return;
        }

        this.clearSendProgressStatusText();

        // cancel current request
        RequestStore.cancel();

        this._durationStatusBarItem.command = null;
        this._durationStatusBarItem.text = 'Cancelled $(circle-slash)';
        this._durationStatusBarItem.tooltip = null;
    }

    private async runCore(httpRequest: HttpRequest, opts?: RunCoreOptions) {
        if (!opts) {
            opts = {};
        }

        let showErrors = true;
        if (!isNil(opts.showErrors)) {
            showErrors = opts.showErrors;
        }

        let requestId = uuid.v4();
        RequestStore.add(<string>requestId, httpRequest);

        // clear status bar
        this.setSendingProgressStatusText();

        // set http request
        let err: any;
        let response: HttpResponse;
        try {
            response = await this._httpClient.send(httpRequest);

            // check cancel
            if (RequestStore.isCancelled(<string>requestId)) {
                return;
            }

            this.clearSendProgressStatusText();
            this.formatDurationStatusBar(response);

            this.formatSizeStatusBar(response);
            this._sizeStatusBarItem.show();

            let showResponse = true;
            if (!isNil(opts.openResponse)) {
                showResponse = opts.openResponse;
            }

            if (showResponse) {
                let previewUri = this.generatePreviewUri();
                ResponseStore.add(previewUri.toString(), response);

                this._responseTextProvider.update(previewUri);

                try {
                    if (this._restClientSettings.previewResponseInUntitledDocument) {
                        UntitledFileContentProvider.createHttpResponseUntitledFile(
                            response,
                            this._restClientSettings.showResponseInDifferentTab,
                            this._restClientSettings.previewResponseSetUntitledDocumentLanguageByContentType,
                            this._restClientSettings.includeAdditionalInfoInResponse,
                            this._restClientSettings.suppressResponseBodyContentTypeValidationWarning
                        );
                    } else {
                        await commands.executeCommand('vscode.previewHtml', previewUri, ViewColumn.Two, `Response(${response.elapsedMillionSeconds}ms)`);
                    }
                } catch (reason) {
                    if (showErrors) {
                        window.showErrorMessage(reason);
                    }
                }
            }

            // persist to history json file
            let serializedRequest = SerializedHttpRequest.convertFromHttpRequest(httpRequest);
            await PersistUtility.saveRequest(serializedRequest);
        } catch (error) {
            err = error;

            // check cancel
            if (RequestStore.isCancelled(<string>requestId)) {
                return;
            }

            if (error.code === 'ETIMEDOUT') {
                error.message = `Please check your networking connectivity and your time out in ${this._restClientSettings.timeoutInMilliseconds}ms according to your configuration 'rest-client.timeoutinmilliseconds'. Details: ${error}. `;
            } else if (error.code === 'ECONNREFUSED') {
                error.message = `Connection is being rejected. The service isn’t running on the server, or incorrect proxy settings in vscode, or a firewall is blocking requests. Details: ${error}.`;
            } else if (error.code === 'ENETUNREACH') {
                error.message = `You don't seem to be connected to a network. Details: ${error}`;
            }
            this.clearSendProgressStatusText();
            this._durationStatusBarItem.command = null;
            this._durationStatusBarItem.text = '';

            if (showErrors) {
                window.showErrorMessage(error.message);
            }
        } finally {
            RequestStore.complete(<string>requestId);

            if (opts.responseResolver) {
                opts.responseResolver(err, response);
            }
        }
    }

    public dispose() {
        this._durationStatusBarItem.dispose();
        this._sizeStatusBarItem.dispose();
        this._registration.dispose();
    }

    private generatePreviewUri(): Uri {
        let uriString = 'rest-response://authority/response-preview';
        if (this._restClientSettings.showResponseInDifferentTab) {
            uriString += `/${Date.now()}`;  // just make every uri different
        }
        uriString += '.html';
        return Uri.parse(uriString);
    }

    private setSendingProgressStatusText() {
        this.clearSendProgressStatusText();
        this._interval = setInterval(() => {
            this._durationStatusBarItem.text = `Waiting ${spinner()}`;
        }, 50);
        this._durationStatusBarItem.tooltip = 'Waiting Response';
        this._durationStatusBarItem.show();
    }

    private clearSendProgressStatusText() {
        clearInterval(this._interval);
        this._sizeStatusBarItem.hide();
    }

    private onDidCloseTextDocument(doc: TextDocument): void {
        // Remove the status bar associated with the response preview uri
        if (this._restClientSettings.showResponseInDifferentTab) {
            return;
        }

        if (ResponseStore.get(doc.uri.toString())) {
            this._durationStatusBarItem.hide();
            this._sizeStatusBarItem.hide();
        }
    }

    private formatDurationStatusBar(response: HttpResponse) {
        this._durationStatusBarItem.command = null;
        this._durationStatusBarItem.text = ` $(clock) ${response.elapsedMillionSeconds}ms`;
        this._durationStatusBarItem.tooltip = [
            'Breakdown of Duration:',
            `Socket: ${response.timingPhases.wait.toFixed(1)}ms`,
            `DNS: ${response.timingPhases.dns.toFixed(1)}ms`,
            `TCP: ${response.timingPhases.tcp.toFixed(1)}ms`,
            `FirstByte: ${response.timingPhases.firstByte.toFixed(1)}ms`,
            `Download: ${response.timingPhases.download.toFixed(1)}ms`
        ].join(EOL);
    }

    private formatSizeStatusBar(response: HttpResponse) {
        this._sizeStatusBarItem.text = ` $(database) ${filesize(response.bodySizeInBytes + response.headersSizeInBytes)}`;
        this._sizeStatusBarItem.tooltip = `Breakdown of Response Size:${EOL}Headers: ${filesize(response.headersSizeInBytes)}${EOL}Body: ${filesize(response.bodySizeInBytes)}`;
    }
}