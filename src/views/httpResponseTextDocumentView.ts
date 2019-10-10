'use strict';

import { EOL } from 'os';
import { languages, Position, Range, TextDocument, ViewColumn, window, workspace } from 'vscode';
import { Headers } from '../models/base';
import { RestClientSettings } from '../models/configurationSettings';
import { HttpResponse } from '../models/httpResponse';
import { PreviewOption } from '../models/previewOption';
import { MimeUtility } from '../utils/mimeUtility';
import { ResponseFormatUtility } from '../utils/responseFormatUtility';

export class HttpResponseTextDocumentView {

    private readonly settings: RestClientSettings = RestClientSettings.Instance;

    protected readonly documents: TextDocument[] = [];

    public constructor() {
        workspace.onDidCloseTextDocument(e => {
            const index = this.documents.indexOf(e);
            if (index !== -1) {
                this.documents.splice(index, 1);
            }
        });
    }

    public async render(response: HttpResponse, column?: ViewColumn) {
        const content = this.getTextDocumentContent(response);
        const language = this.getVSCodeDocumentLanguageId(response);
        let document: TextDocument;
        if (this.settings.showResponseInDifferentTab || this.documents.length === 0) {
            document = await workspace.openTextDocument({ language, content });
            this.documents.push(document);
            await window.showTextDocument(document, { viewColumn: column, preserveFocus: !this.settings.previewResponsePanelTakeFocus, preview: false });
        } else {
            document = this.documents[this.documents.length - 1];
            languages.setTextDocumentLanguage(document, language);
            const editor = await window.showTextDocument(document, { viewColumn: column, preserveFocus: !this.settings.previewResponsePanelTakeFocus, preview: false });
            editor.edit(edit => {
                const startPosition = new Position(0, 0);
                const endPosition = document.lineAt(document.lineCount - 1).range.end;
                edit.replace(new Range(startPosition, endPosition), content);
            });
        }
    }

    private getTextDocumentContent(response: HttpResponse): string {
        let content = '';
        const previewOption = this.settings.previewOption;
        if (previewOption === PreviewOption.Exchange) {
            // for add request details
            const request = response.request;
            content += `${request.method} ${request.url} HTTP/1.1${EOL}`;
            content += this.formatHeaders(request.headers);
            if (request.body) {
                const requestContentType = request.getHeader('content-type');
                if (typeof request.body !== 'string') {
                    request.body = 'NOTE: Request Body From Is File Not Shown';
                }
                content += `${EOL}${ResponseFormatUtility.formatBody(request.body.toString(), requestContentType, true)}${EOL}`;
            }

            content += EOL.repeat(2);
        }

        if (previewOption !== PreviewOption.Body) {
            content += `HTTP/${response.httpVersion} ${response.statusCode} ${response.statusMessage}${EOL}`;
            content += this.formatHeaders(response.headers);
        }

        if (previewOption !== PreviewOption.Headers) {
            const responseContentType = response.getHeader('content-type');
            const prefix = previewOption === PreviewOption.Body ? '' : EOL;
            content += `${prefix}${ResponseFormatUtility.formatBody(response.body, responseContentType, true)}`;
        }

        return content;
    }

    private formatHeaders(headers: Headers): string {
        let headerString = '';
        for (const header in headers) {
            const value = headers[header] as string;
            headerString += `${header}: ${value}${EOL}`;
        }
        return headerString;
    }

    private getVSCodeDocumentLanguageId(response: HttpResponse) {
        if (this.settings.previewOption === PreviewOption.Body) {
            const contentType = response.getHeader('content-type');
            if (MimeUtility.isJSON(contentType)) {
                return 'json';
            } else if (MimeUtility.isJavaScript(contentType)) {
                return 'javascript';
            } else if (MimeUtility.isXml(contentType)) {
                return 'xml';
            } else if (MimeUtility.isHtml(contentType)) {
                return 'html';
            } else if (MimeUtility.isCSS(contentType)) {
                return 'css';
            }
        }

        return 'http';
    }
}