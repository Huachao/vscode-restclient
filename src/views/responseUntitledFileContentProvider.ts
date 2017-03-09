'use strict';

import { window, workspace, ViewColumn, TextDocument, Range, Position } from 'vscode';
import { HttpResponse } from '../models/httpResponse';
import { ResponseFormatUtility } from '../responseFormatUtility';
import { EOL } from 'os';

export class UntitledFileContentProvider {
    private static createdFiles: TextDocument[] = [];
    public static createHttpResponseUntitledFile(response: HttpResponse, createNewFile: boolean) {
        if (!createNewFile && UntitledFileContentProvider.createdFiles.length > 0) {
            let updateDocument = UntitledFileContentProvider.createdFiles.slice(-1)[0];

            // check if user already save this file
            if (updateDocument.isUntitled && updateDocument.lineCount > 0) {
                window.showTextDocument(updateDocument, ViewColumn.Two, false).then(textEditor => {
                    textEditor.edit(edit => {
                        // get previous response file Range
                        var startPosition = new Position(0, 0);
                        var endPoistion =  updateDocument.lineAt(updateDocument.lineCount - 1).range.end;
                        edit.replace(new Range(startPosition, endPoistion), UntitledFileContentProvider.formatResponse(response));
                    });
                });
                return;
            }
        }
        workspace.openTextDocument({ 'language': 'http' }).then(document => {
            UntitledFileContentProvider.createdFiles.push(document);
            window.showTextDocument(document, ViewColumn.Two, false).then(textEditor => {
                textEditor.edit(edit => {
                    edit.insert(new Position(0, 0), UntitledFileContentProvider.formatResponse(response));
                });
            });
        });
    }

    private static formatResponse(response: HttpResponse): string {
        let responseStatusLine = `HTTP/${response.httpVersion} ${response.statusCode} ${response.statusMessage}${EOL}`;
        let headers = '';
        for (var header in response.headers) {
            if (response.headers.hasOwnProperty(header)) {
                let value = response.headers[header];
                if (typeof response.headers[header] !== 'string') {
                    value = <string>response.headers[header];
                }
                headers += `${header}: ${value}${EOL}`;
            }
        }
        let body = ResponseFormatUtility.FormatBody(response.body, response.getResponseHeaderValue("content-type"));
        return `${responseStatusLine}${headers}${EOL}${body}`;
    }
}