"use strict";

import { TextDocumentContentProvider, EventEmitter, Event, Uri, window, extensions } from 'vscode';
import { HttpResponse } from '../models/httpResponse'
import { MimeUtility } from '../mimeUtility'
import * as Constants from '../constants'
import * as path from 'path'

var pd = require('pretty-data').pd;

export class HttpResponseTextDocumentContentProvider implements TextDocumentContentProvider {
    private static _tagsToReplace = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
    };

    private static cssFilePath: string = path.join(extensions.getExtension(Constants.ExtensionId).extensionPath, Constants.CSSFolderName, Constants.CSSFileName);

    private _onDidChange = new EventEmitter<Uri>();
    response: HttpResponse;

    constructor(response: HttpResponse) {
        this.response = response;
    }

    public provideTextDocumentContent(uri: Uri): string {
        if (this.response) {
            return `
            <head>
                <link rel="stylesheet" href="${HttpResponseTextDocumentContentProvider.cssFilePath}">
                <script src="https://cdn.jsdelivr.net/highlight.js/9.4.0/highlight.min.js"></script>
            </head>
            <body>
                <script>hljs.initHighlightingOnLoad();</script>
                <div>
                <pre><code class="http">HTTP/${this.response.httpVersion} <b>${this.response.statusCode} ${this.response.statusMessage}</b> <i>${this.response.elapsedMillionSeconds}ms</i>
${HttpResponseTextDocumentContentProvider.formatHeaders(this.response.headers)}
${HttpResponseTextDocumentContentProvider.formatBody(this.response.body, this.response.headers['content-type'])}
</code></pre>
</div>
            </body>`;
        }
    }

    get onDidChange(): Event<Uri> {
        return this._onDidChange.event;
    }

    public update(uri: Uri) {
        this._onDidChange.fire(uri);
    }

    private static formatHeaders(headers: { [key: string]: string }): string {
        let headerString = '';
        for (var header in headers) {
            if (headers.hasOwnProperty(header)) {
                let value = headers[header];
                if (typeof headers[header] === 'string') {
                    value = HttpResponseTextDocumentContentProvider.escape(<string>headers[header]);
                }
                headerString += `${header}: ${value}\n`;
            }
        }
        return headerString;
    }

    private static formatBody(body: string, contentType: string): string {
        if (contentType) {
            let type = MimeUtility.parse(contentType).type;
            if (type === 'application/json') {
                if (HttpResponseTextDocumentContentProvider.isJsonString(body)) {
                    body = JSON.stringify(JSON.parse(body), null, 4);
                 } else {
                    window.showWarningMessage('The content type of response is application/json, while response body is not a valid json string');
                 }
            } else if (type === 'application/xml') {
                body = pd.xml(body);
            }
        }

        return HttpResponseTextDocumentContentProvider.escape(body);
    }

    private static escape(data: string): string {
        return data.replace(/[&<>]/g, function (tag) {
            return HttpResponseTextDocumentContentProvider._tagsToReplace[tag] || tag;
        });
    }

    private static isJsonString(data: string) {
        try {
            JSON.parse(data);
            return true;
        } catch (e) {
            return false;
        }
    }
}