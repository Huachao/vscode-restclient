'use strict';

import { window } from 'vscode';
import { MimeUtility } from './mimeUtility';
import { isJSONString } from './misc';
const pd = require('pretty-data').pd;
const beautify = require('js-beautify').js_beautify;

export class ResponseFormatUtility {
    public static formatBody(body: string, contentType: string, suppressValidation: boolean): string {
        if (contentType) {
            if (MimeUtility.isJSON(contentType)) {
                if (isJSONString(body)) {
                    body = beautify(body, { indent_size: 2 });
                } else if (!suppressValidation) {
                    window.showWarningMessage('The content type of response is application/json, while response body is not a valid json string');
                }
            } else if (MimeUtility.isXml(contentType)) {
                body = pd.xml(body);
            } else if (MimeUtility.isCSS(contentType)) {
                body = pd.css(body);
            } else {
                // Add this for the case that the content type of response body is not very accurate #239
                if (isJSONString(body)) {
                    body = beautify(body, { indent_size: 2 });
                }
            }
        }

        return body;
    }
}