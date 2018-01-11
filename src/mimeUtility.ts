"use strict";

import { MIME } from './models/mime';

export class MimeUtility {
    private static readonly supportedImagesFormats = [
        'image/jpeg',
        'image/gif',
        'image/webp',
        'image/png',
        'image/bmp'
    ];

    public static parse(contentTypeString: string) {
        // application/json; charset=utf-8
        // application/vnd.github.chitauri-preview+sha
        let params = contentTypeString.split(';');
        let types = params[0].trim().split('+');
        let charset = null;
        if (params.length > 1) {
            for (let i = 1; i < params.length; i++) {
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
        return Boolean(~MimeUtility.supportedImagesFormats.indexOf(type));
    }

    public static isMultiPartFormData(contentTypeString: string): boolean {
        if (!contentTypeString) {
            return false;
        }

        let type = MimeUtility.parse(contentTypeString).type;
        return type.toLowerCase() === 'multipart/form-data';
    }

    public static isFormUrlEncoded(contentTypeString: string): boolean {
        if (!contentTypeString) {
            return false;
        }

        let type = MimeUtility.parse(contentTypeString).type;
        return type.toLowerCase() === 'application/x-www-form-urlencoded';
    }
}