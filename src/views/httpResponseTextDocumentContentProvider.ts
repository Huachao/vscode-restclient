"use strict";

import { TextDocumentContentProvider, EventEmitter, Event, Uri } from 'vscode';
import { HttpResponse } from '../models/httpResponse'
import { MimeUtility } from '../mimeUtility'

export class HttpResponseTextDocumentContentProvider implements TextDocumentContentProvider  {
    private static _tagsToReplace = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
    };

    private _onDidChange = new EventEmitter<Uri>();
    response: HttpResponse;

    constructor(response: HttpResponse) {
        this.response = response;
    }

    public provideTextDocumentContent(uri: Uri): string {
        if (this.response) {
            return `
            <head>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/9.4.0/styles/github.min.css">
                <script src="https://cdn.jsdelivr.net/highlight.js/9.4.0/highlight.min.js"></script>
            </head>
            <body>
                <script>hljs.initHighlightingOnLoad();</script>
                <div>
                <pre><code class="http" style="background-color: white">
HTTP/${this.response.httpVersion} <b>${this.response.statusCode} ${this.response.statusMessage}</b> <i>${this.response.elapsedMillionSeconds}ms</i>
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
                var value = headers[header];
                headerString += `${header}: ${value}\n`;
            }
        }
        return headerString;
    }

    private static formatBody(body: string, contentType: string): string {
        if (contentType) {
            let type = MimeUtility.parse(contentType).type;
            if (type === 'application/json') {
                return JSON.stringify(JSON.parse(body), null, 4);
            }
        }

        return HttpResponseTextDocumentContentProvider.escase(body);
    }

    private static escase(data: string): string {
        return data.replace(/[&<>]/g, function(tag) {
            return HttpResponseTextDocumentContentProvider._tagsToReplace[tag] || tag;
    });
    }
}