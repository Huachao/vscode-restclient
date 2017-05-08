'use strict';

import { window, workspace, ViewColumn, TextDocument } from 'vscode';
import { HttpResponse } from '../models/httpResponse';
import { ResponseFormatUtility } from '../responseFormatUtility';
import { EOL } from 'os';

export class UntitledFileContentProvider {
    public static createHttpResponseUntitledFile(response: HttpResponse, createNewFile: boolean, autoSetLanguage: boolean, additionalInfo: boolean) {

        const language = autoSetLanguage ? UntitledFileContentProvider.languageFromContentType(response) : 'http';
        const content = UntitledFileContentProvider.formatResponse(response, language, additionalInfo, autoSetLanguage);
        workspace.openTextDocument({ 'language': language, 'content': content }).then(document => {
            window.showTextDocument(document, {viewColumn: ViewColumn.Two, preserveFocus: false, preview: !createNewFile}) ;
        });
    }

    private static languageFromContentType(response: HttpResponse): string {
        let contentType = response.getResponseHeaderValue("Content-Type");
        if (!contentType) return 'http';

        let types = ['xml', 'json', 'html', 'css'];
        for (let type of types) {
            if (contentType.includes(type)) return type;
        };

        return 'http';
    }

    private static formatResponse(response: HttpResponse, language: string, additionalInfo: boolean, autoSetLanguage: boolean) {
        const { responseStatusLine, headers, body } = UntitledFileContentProvider.extractStandardResponseInformation(response);
        let responseInformation;
        if (additionalInfo) {
            const formattedAdditionalInfo = UntitledFileContentProvider.formatAdditionalResponseInformation(response);
            responseInformation = `${responseStatusLine}${formattedAdditionalInfo}${headers}`;
        } else {
            responseInformation = `${responseStatusLine}${headers}`;
        }

        return autoSetLanguage ? UntitledFileContentProvider.formatResponseForLanguage(responseInformation, body, language) :
            UntitledFileContentProvider.formatResponseDefault(responseInformation, body);
    }

    private static formatResponseDefault(responseInformation: string, responseBody: string) {
        return `${responseInformation}${EOL}${responseBody}`;
    }

    private static formatResponseForLanguage(responseInformation: string, responseBody: string, language: string) {
        let commentBegin = UntitledFileContentProvider.commentBegin(language);
        let commentEnd = UntitledFileContentProvider.commentEnd(language);
        return `${commentBegin}${EOL}${responseInformation}${commentEnd}${EOL}${responseBody}`;
    }
    private static formatAdditionalResponseInformation(response: HttpResponse) {
        let requestURL = `Request: ${response.requestUrl}${EOL}`;
        let elapsedTime = `Elapsed time: ${response.elapsedMillionSeconds}ms${EOL}`;
        return `${requestURL}${elapsedTime}`;
    }

    private static extractStandardResponseInformation(response: HttpResponse) {
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
        return { responseStatusLine, headers, body };
    }

    private static commentBegin(language: string) {
        const REST_RESPONSE = 'REST Response Information:';
        let commentStyle = {
            xml: '<!-- ',
            json: '/* ',
            html: '<!-- ',
            css: '/* '
        }
        return commentStyle[language] ? commentStyle[language] + REST_RESPONSE : '';
    }

    private static commentEnd(language: string) {
        let commentStyle = {
            xml: '-->',
            json: '*/',
            html: '-->',
            css: '*/'
        }
        return commentStyle[language] ? commentStyle[language] : '';
    }
}