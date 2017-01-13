"use strict";

import { MIME } from './models/mime';

export class MimeUtility {
    public static parse(contentTypeString: string) {
        // application/json; charset=utf-8
        // application/vnd.github.chitauri-preview+sha
        let params = contentTypeString.split(';');
        let types = params[0].trim().split('+');
        let charset = null;
        if (params.length > 1) {
            for (var i = 1; i < params.length; i++) {
                let attributes = params[i].trim().split('=', 2);
                if (attributes.length === 2 && attributes[0].toLowerCase() === 'charset') {
                    charset = attributes[1].trim();
                }
            }
        }
        return new MIME(types[0], types[1] ? `+${types[1]}` : '', contentTypeString, charset);
    }

    public static isBrowserSupportedImageFormat(contentTypeString: string): boolean {
        // https://en.wikipedia.org/wiki/Comparison_of_web_browsers#Image_format_support
        // For chrome supports JPEG, GIF, WebP, PNG and BMP
        if (!contentTypeString) {
            return false;
        }

        let type = MimeUtility.parse(contentTypeString).type;
        return type === 'image/jpeg' || type === 'image/gif' || type === 'image/webp' || type === 'image/png' || type === 'image/bmp';
    }
}