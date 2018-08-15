'use strict';

import { window } from 'vscode';
import { MimeUtility } from './mimeUtility';
const pd = require('pretty-data').pd;
const beautify = require('js-beautify').js_beautify

export class ResponseFormatUtility {
    public static formatBody(body: string, contentType: string, suppressValidation: boolean): string {
        if (contentType) {
            if (MimeUtility.isJSON(contentType)) {
                if (ResponseFormatUtility.IsJsonString(body)) {
                    body = beautify(body, { indent_size: 4 })
                } else if (!suppressValidation) {
                    window.showWarningMessage('The content type of response is application/json, while response body is not a valid json string');
                }
            } else if (MimeUtility.isXml(contentType)) {
                body = pd.xml(body);
            } else if (MimeUtility.isCSS(contentType)) {
                body = pd.css(body);
            }
        }

        return body;
    }

    public static IsJsonString(data: string) {
        try {
            JSON.parse(data);
            return true;
        } catch {
            return false;
        }
    }
}