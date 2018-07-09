'use strict';

import { EOL } from 'os';
import { ViewColumn, window, workspace } from 'vscode';
import { Headers } from '../models/base';
import { RestClientSettings } from '../models/configurationSettings';
import { HttpResponse } from '../models/httpResponse';
import { PreviewOption } from '../models/previewOption';
import { MimeUtility } from '../utils/mimeUtility';
import { ResponseFormatUtility } from '../utils/responseFormatUtility';

export class HttpResponseTextDocumentView {

    private readonly settings: RestClientSettings = RestClientSettings.Instance;

    public constructor() {
    }

    public render(response: HttpResponse, column: ViewColumn) {
        const content = this.getTextDocumentContent(response);
        const language = this.getVSCodeDocumentLanguageId(response);
        workspace.openTextDocument({ language, content }).then(document => {
            window.showTextDocument(document, { viewColumn: column, preserveFocus: !this.settings.previewResponsePanelTakeFocus, preview: !this.settings.showResponseInDifferentTab });
        });
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
                    request.body = 'NOTE: Request Body From File Not Shown';
                }
                content += `${EOL}${ResponseFormatUtility.FormatBody(request.body.toString(), requestContentType, true)}${EOL}`;
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
            content += `${prefix}${ResponseFormatUtility.FormatBody(response.body, responseContentType, true)}`;
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