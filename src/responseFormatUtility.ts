'use strict'

import { window } from 'vscode';
import { MimeUtility } from './mimeUtility';
var pd = require('pretty-data').pd;

export class ResponseFormatUtility {
    public static FormatBody(body: string, contentType: string): string {
        if (contentType) {
            let mime = MimeUtility.parse(contentType);
            let type = mime.type;
            let suffix = mime.suffix;
            if (type === 'application/json' ||
                suffix === '+json') {
                if (ResponseFormatUtility.IsJsonString(body)) {
                    body = JSON.stringify(JSON.parse(body), null, 2);
                } else {
                    window.showWarningMessage('The content type of response is application/json, while response body is not a valid json string');
                }
            } else if (type === 'application/xml' ||
                type === 'text/xml' ||
                (type === 'application/atom' && suffix === '+xml')) {
                body = pd.xml(body);
            } else if (type === 'text/css') {
                body = pd.css(body);
            }
        }

        return body;
    }

    public static IsJsonString(data: string) {
        try {
            JSON.parse(data);
            return true;
        } catch (e) {
            return false;
        }
    }
}