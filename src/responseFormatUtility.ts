'use strict';

import { window } from 'vscode';
import { MimeUtility } from './mimeUtility';
import { format as JSONFormat } from "jsonc-parser";
import { EOL } from "os";
const pd = require('pretty-data').pd;

export class ResponseFormatUtility {
    public static FormatBody(body: string, contentType: string, suppressValidation: boolean): string {
        if (contentType) {
            let mime = MimeUtility.parse(contentType);
            let type = mime.type;
            let suffix = mime.suffix;
            if (type === 'application/json' ||
                suffix === '+json') {
                if (ResponseFormatUtility.IsJsonString(body)) {
                    const edits = JSONFormat(body, undefined, { tabSize: 2, insertSpaces: true, eol: EOL });
                    body = edits.reduceRight(
                        (prev, cur) => prev.substring(0, cur.offset) + cur.content + prev.substring(cur.offset + cur.length),
                        body);
                } else if (!suppressValidation) {
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
        } catch {
            return false;
        }
    }
}