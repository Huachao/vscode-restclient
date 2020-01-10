import { languages, Position, Range, TextDocument, ViewColumn, window, workspace } from 'vscode';
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
        const content = ResponseFormatUtility.getTextDocumentContent(response);
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

    private getVSCodeDocumentLanguageId(response: HttpResponse) {
        if (this.settings.previewOption === PreviewOption.Body) {
            const contentType = response.contentType;
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