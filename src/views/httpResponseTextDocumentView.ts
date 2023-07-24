import { EOL } from 'os';
import { languages, Position, Range, TextDocument, ViewColumn, window, workspace } from 'vscode';
import { RequestHeaders, ResponseHeaders } from '../models/base';
import { SystemSettings } from '../models/configurationSettings';
import { HttpRequest } from '../models/httpRequest';
import { HttpResponse } from '../models/httpResponse';
import { PreviewOption } from '../models/previewOption';
import { MimeUtility } from '../utils/mimeUtility';
import { ResponseFormatUtility } from '../utils/responseFormatUtility';

export class HttpResponseTextDocumentView {

    private readonly settings: SystemSettings = SystemSettings.Instance;

    protected readonly documents: TextDocument[] = [];

    public constructor() {
        workspace.onDidCloseTextDocument(e => {
            const index = this.documents.indexOf(e);
            if (index !== -1) {
                this.documents.splice(index, 1);
            }
        });
    }

    public async render(responseOrRequest: HttpResponse | HttpRequest, column?: ViewColumn) {
        const content = this.getTextDocumentContent(responseOrRequest);
        const language = this.getVSCodeDocumentLanguageId(responseOrRequest);
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

    private getTextDocumentContent(responseOrRequest: HttpResponse | HttpRequest): string {
        if (responseOrRequest instanceof HttpRequest) {
            return  `Loading ${responseOrRequest.method} ${responseOrRequest.url}`;
        }
        let content = '';
        const previewOption = this.settings.previewOption;
        if (previewOption === PreviewOption.Exchange) {
            // for add request details
            const request = responseOrRequest.request;
            content += `${request.method} ${request.url} HTTP/1.1${EOL}`;
            content += this.formatHeaders(request.headers);
            if (request.body) {
                if (typeof request.body !== 'string') {
                    request.body = 'NOTE: Request Body From Is File Not Shown';
                }
                content += `${EOL}${ResponseFormatUtility.formatBody(request.body.toString(), request.contentType, true)}${EOL}`;
            }

            content += EOL.repeat(2);
        }

        if (previewOption !== PreviewOption.Body) {
            content += `HTTP/${responseOrRequest.httpVersion} ${responseOrRequest.statusCode} ${responseOrRequest.statusMessage}${EOL}`;
            content += this.formatHeaders(responseOrRequest.headers);
        }

        if (previewOption !== PreviewOption.Headers) {
            const prefix = previewOption === PreviewOption.Body ? '' : EOL;
            content += `${prefix}${ResponseFormatUtility.formatBody(responseOrRequest.body, responseOrRequest.contentType, true)}`;
        }

        return content;
    }

    private formatHeaders(headers: RequestHeaders | ResponseHeaders): string {
        let headerString = '';
        for (const header in headers) {
            const value = headers[header] as string;
            headerString += `${header}: ${value}${EOL}`;
        }
        return headerString;
    }

    private getVSCodeDocumentLanguageId(responseOrRequest: HttpResponse | HttpRequest) {        
        if (this.settings.previewOption === PreviewOption.Body) {
            const contentType = responseOrRequest.contentType;
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