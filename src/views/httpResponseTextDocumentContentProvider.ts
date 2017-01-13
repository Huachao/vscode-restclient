"use strict";

import { Uri, window, extensions } from 'vscode';
import { BaseTextDocumentContentProvider } from './baseTextDocumentContentProvider';
import { RestClientSettings } from '../models/configurationSettings';
import { HttpResponse } from '../models/httpResponse';
import { MimeUtility } from '../mimeUtility';
import * as Constants from '../constants';
import * as path from 'path';

const hljs = require('highlight.js');
const codeHighlightLinenums = require('code-highlight-linenums');

var pd = require('pretty-data').pd;

export class HttpResponseTextDocumentContentProvider extends BaseTextDocumentContentProvider {
    private static cssFilePath: string = path.join(extensions.getExtension(Constants.ExtensionId).extensionPath, Constants.CSSFolderName, Constants.CSSFileName);

    public constructor(public response: HttpResponse, public settings: RestClientSettings) {
        super();
    }

    public provideTextDocumentContent(uri: Uri): string {
        if (this.response) {
            let innerHtml: string;
            let width = 2;
            let contentType = this.response.getResponseHeaderValue("content-type");
            if (contentType) {
                contentType = contentType.trim();
            }
            if (contentType && MimeUtility.isBrowserSupportedImageFormat(contentType)) {
                innerHtml = `<img src="${this.response.requestUrl}">`;
            } else {
                let code = `HTTP/${this.response.httpVersion} ${this.response.statusCode} ${this.response.statusMessage}
${HttpResponseTextDocumentContentProvider.formatHeaders(this.response.headers)}
${HttpResponseTextDocumentContentProvider.formatBody(this.response.body, this.response.getResponseHeaderValue("content-type"))}`;
                width = (code.split(/\r\n|\r|\n/).length + 1).toString().length;
                innerHtml = `<pre><code class="http">${codeHighlightLinenums(code, { hljs: hljs, lang: 'http', start: 1 })}</code></pre>`;
            }
            return `
            <head>
                <link rel="stylesheet" href="${HttpResponseTextDocumentContentProvider.cssFilePath}">
                ${this.getSettingsOverrideStyles(width)}
            </head>
            <body>
                <div>
                    ${innerHtml}
                </div>
            </body>`;
        }
    }

    private getSettingsOverrideStyles(width: number): string {
        return [
            '<style>',
            'code {',
            this.settings.fontFamily ? `font-family: ${this.settings.fontFamily};` : '',
            this.settings.fontSize ? `font-size: ${this.settings.fontSize}px;` : '',
            this.settings.fontWeight ? `font-weight: ${this.settings.fontWeight};` : '',
            '}',
            'code .line {',
            `padding-left: calc(${width}ch + 18px );`,
            '}',
            'code .line:before {',
            `width: ${width}ch;`,
            `margin-left: calc(-${width}ch + -27px );`,
            '}',
            '</style>'].join('\n');
    }

    private static formatHeaders(headers: { [key: string]: string }): string {
        let headerString = '';
        for (var header in headers) {
            if (headers.hasOwnProperty(header)) {
                let value = headers[header];
                if (typeof headers[header] !== 'string') {
                    value = <string>headers[header];
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
                    body = JSON.stringify(JSON.parse(body), null, 2);
                } else {
                    window.showWarningMessage('The content type of response is application/json, while response body is not a valid json string');
                }
            } else if (type === 'application/xml' || type === 'text/xml') {
                body = pd.xml(body);
            } else if (type === 'text/css') {
                body = pd.css(body);
            }
        }

        return body;
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