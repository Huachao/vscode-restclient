"use strict";

import { MIME } from './models/mime'

export class MimeUtility {
    static parse(contentTypeString: string) {
        // application/json; charset=utf-8
        // application/vnd.github.chitauri-preview+sha
        let params = contentTypeString.split(';');
        let types = params[0].trim().split('+');
        return new MIME(types[0], types[1] ? `+${types[1]}` : '', contentTypeString);
    }

    static isBrowerSupportedImageFormat(contentTypeString: string): boolean {
        // https://en.wikipedia.org/wiki/Comparison_of_web_browsers#Image_format_support
        // For chrome supports JPEG, GIF, WebP, PNG and BMP
        let type = MimeUtility.parse(contentTypeString).type;
        if (type === 'image/jpeg' || type === 'image/gif' || type === 'image/webp' || type === 'image/png' || type === 'image/bmp') {
            return true;
        } else {
            return false;
        }
    }
}