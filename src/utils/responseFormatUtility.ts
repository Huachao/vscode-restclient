'use strict';

import { applyEdits, format as JSONFormat } from "jsonc-parser";
import { EOL } from "os";
import { window } from 'vscode';
import { MimeUtility } from './mimeUtility';
const pd = require('pretty-data').pd;

export class ResponseFormatUtility {
    public static FormatBody(body: string, contentType: string, suppressValidation: boolean): string {
        if (contentType) {
            if (MimeUtility.isJSON(contentType)) {
                if (ResponseFormatUtility.IsJsonString(body)) {
                    const edits = JSONFormat(body, undefined, { tabSize: 2, insertSpaces: true, eol: EOL });
                    body = applyEdits(body, edits);
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