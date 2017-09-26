"use strict";

import { Uri, extensions } from 'vscode';
import { BaseTextDocumentContentProvider } from './baseTextDocumentContentProvider';
import { RestClientSettings } from '../models/configurationSettings';
import { HttpResponse } from "../models/httpResponse";
import { MimeUtility } from '../mimeUtility';
import { ResponseFormatUtility } from '../responseFormatUtility';
import { ResponseStore } from '../responseStore';
import { PreviewOption } from '../models/previewOption';
import * as Constants from '../constants';
import * as path from 'path';

const autoLinker = require('autolinker');
const hljs = require('highlight.js');

export class HttpResponseTextDocumentContentProvider extends BaseTextDocumentContentProvider {
    private static cssFilePath: string = path.join(extensions.getExtension(Constants.ExtensionId).extensionPath, Constants.CSSFolderName, Constants.CSSFileName);

    public constructor(public settings: RestClientSettings) {
        super();
    }

    public provideTextDocumentContent(uri: Uri): string {
        if (uri) {
            let response = ResponseStore.get(uri.toString());
            if (response) {
                let innerHtml: string;
                let width = 2;
                let contentType = response.getResponseHeaderValue("content-type");
                if (contentType) {
                    contentType = contentType.trim();
                }
                if (contentType && MimeUtility.isBrowserSupportedImageFormat(contentType)) {
                    innerHtml = `<img src="data:${contentType};base64,${new Buffer(response.bodyStream).toString('base64')}">`;
                } else {
                    let code = this.highlightResponse(response);
                    width = (code.split(/\r\n|\r|\n/).length + 1).toString().length;
                    innerHtml = `<pre><code>${this.addLineNums(code)}</code></pre>`;
                }
                return `
            <head>
                <link rel="stylesheet" href="${HttpResponseTextDocumentContentProvider.cssFilePath}">
                ${this.getSettingsOverrideStyles(width)}
            </head>
            <body>
                <div>
                    ${this.addUrlLinks(innerHtml)}
                    <a id="scroll-to-top" role="button" aria-label="scroll to top" onclick="scroll(0,0)"><span class="icon"></span></a>
                </div>
            </body>`;
            }
        }
    }

    private highlightResponse(response: HttpResponse): string {
        let code = '';
        let previewOption = this.settings.previewOption;
        if (previewOption === PreviewOption.Exchange) {
            // for add request details
            let request = response.request;
            let requestNonBodyPart = `${request.method} ${request.url} HTTP/1.1
${HttpResponseTextDocumentContentProvider.formatHeaders(request.headers)}`;
            code += hljs.highlight('http', requestNonBodyPart + '\r\n').value;
            if (request.body) {
                let requestContentType = request.getRequestHeaderValue("content-type");
                if (typeof request.body !== 'string') {
                    request.body = 'NOTE: Request Body From File Not Shown';
                }
                let requestBodyPart = `${ResponseFormatUtility.FormatBody(request.body.toString(), requestContentType, true)}`;
                let bodyLanguageAlias = HttpResponseTextDocumentContentProvider.getHighlightLanguageAlias(requestContentType);
                if (bodyLanguageAlias) {
                    code += hljs.highlight(bodyLanguageAlias, requestBodyPart).value;
                } else {
                    code += hljs.highlightAuto(requestBodyPart).value;
                }
                code += '\r\n';
            }

            code += '\r\n'.repeat(2);
        }

        if (previewOption !== PreviewOption.Body) {
            let responseNonBodyPart = `HTTP/${response.httpVersion} ${response.statusCode} ${response.statusMessage}
${HttpResponseTextDocumentContentProvider.formatHeaders(response.headers)}`;
            code += hljs.highlight('http', responseNonBodyPart + (previewOption !== PreviewOption.Headers ? '\r\n' : '')).value;
        }

        if (previewOption !== PreviewOption.Headers) {
            let responseContentType = response.getResponseHeaderValue("content-type");
            let responseBodyPart = `${ResponseFormatUtility.FormatBody(response.body, responseContentType, this.settings.suppressResponseBodyContentTypeValidationWarning)}`;
            let bodyLanguageAlias = HttpResponseTextDocumentContentProvider.getHighlightLanguageAlias(responseContentType);
            if (bodyLanguageAlias) {
                code += hljs.highlight(bodyLanguageAlias, responseBodyPart).value;
            } else {
                code += hljs.highlightAuto(responseBodyPart).value;
            }
        }

        return code;
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

    private addLineNums(code): string {
        code = code.replace(/([\r\n]\s*)(<\/span>)/ig, '$2$1');

        code = this.cleanLineBreaks(code);

        code = code.split(/\r\n|\r|\n/);
        let max = (1 + code.length).toString().length;

        code = code
            .map(function(line, i) {
                return '<span class="line width-' + max + '" start="' + (1 + i) + '">' + line + '</span>';
            })
            .join('\n');
        return code;
    }

    private cleanLineBreaks(code): string {
        let openSpans = [],
            matcher = /<\/?span[^>]*>|\r\n|\r|\n/ig,
            newline = /\r\n|\r|\n/,
            closingTag = /^<\//;

        return code.replace(matcher, function(match) {
            if (newline.test(match)) {
                if (openSpans.length) {
                    return openSpans.map(() => '</span>').join('') + match + openSpans.join('');
                } else {
                    return match;
                }
            } else if (closingTag.test(match)) {
                openSpans.pop();
                return match;
            } else {
                openSpans.push(match);
                return match;
            }
        });
    }

    private addUrlLinks(innerHtml: string) {
        return innerHtml = autoLinker.link(innerHtml, {
            urls: {
                schemeMatches: true,
                wwwMatches: true,
                tldMatches: false
            },
            email: false,
            phone: false,
            stripPrefix: false,
            stripTrailingSlash: false
        });
    }

    private static formatHeaders(headers: { [key: string]: string }): string {
        let headerString = '';
        for (let header in headers) {
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

    private static getHighlightLanguageAlias(contentType: string): string {
        if (!contentType) {
            return null;
        }
        contentType = contentType.toLowerCase();
        let mime = MimeUtility.parse(contentType);
        let type = mime.type;
        let suffix = mime.suffix;
        if (type === 'application/json' || suffix === '+json') {
            return 'json';
        } else if (type === 'application/javascript') {
            return 'javascript';
        } else if (type === 'application/xml' || type === 'text/xml' || suffix === '+xml') {
            return 'xml';
        } else if (type === 'text/html') {
            return 'html';
        } else {
            return null;
        }
    }
}