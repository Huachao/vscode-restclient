"use strict";

import { RestClientSettings } from '../models/configurationSettings';
import { MIME } from '../models/mime';

const mime = require('mime-types');

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
        return new MIME(types[0].toLowerCase(), types[1] ? `+${types[1]}`.toLowerCase() : '', contentTypeString, charset);
    }

    public static getExtension(contentTypeString: string, defaultExtension: string = 'http'): string {
        const mimeType = MimeUtility.parse(contentTypeString);
        const contentTypeWithoutCharsets = `${mimeType.type}${mimeType.suffix}`;
        const restClientSettings = RestClientSettings.Instance;

        // Check if user has custom mapping for this content type first
        if (contentTypeWithoutCharsets in restClientSettings.mimeAndFileExtensionMapping) {
            let ext = restClientSettings.mimeAndFileExtensionMapping[contentTypeWithoutCharsets];
            ext = ext.replace(/^(\.)+/, "");
            if (ext) {
                return ext;
            }
        }
        return mime.extension(contentTypeString) || defaultExtension;
    }

    public static isBrowserSupportedImageFormat(contentTypeString: string): boolean {
        // https://en.wikipedia.org/wiki/Comparison_of_web_browsers#Image_format_support
        // For chrome supports JPEG, GIF, WebP, PNG and BMP
        if (!contentTypeString) {
            return false;
        }

        let type = MimeUtility.parse(contentTypeString).type;
        return MimeUtility.supportedImagesFormats.includes(type);
    }

    public static isJSON(contentTypeString: string): boolean {
        if (!contentTypeString) {
            return false;
        }

        const { type, suffix } = MimeUtility.parse(contentTypeString);
        return type === 'application/json' || suffix === '+json';
    }

    public static isXml(contentTypeString: string): boolean {
        if (!contentTypeString) {
            return false;
        }

        let { type, suffix } = MimeUtility.parse(contentTypeString);
        return type === 'application/xml' || type === 'text/xml' || suffix === '+xml';
    }

    public static isHtml(contentTypeString: string): boolean {
        if (!contentTypeString) {
            return false;
        }

        return MimeUtility.parse(contentTypeString).type === 'text/html';
    }

    public static isJavaScript(contentTypeString: string): boolean {
        if (!contentTypeString) {
            return false;
        }

        return MimeUtility.parse(contentTypeString).type === 'application/javascript';
    }

    public static isCSS(contentTypeString: string): boolean {
        if (!contentTypeString) {
            return false;
        }

        return MimeUtility.parse(contentTypeString).type === 'text/css';
    }

    public static isMultiPartFormData(contentTypeString: string): boolean {
        if (!contentTypeString) {
            return false;
        }

        return MimeUtility.parse(contentTypeString).type === 'multipart/form-data';
    }

    public static isFormUrlEncoded(contentTypeString: string): boolean {
        if (!contentTypeString) {
            return false;
        }

        return MimeUtility.parse(contentTypeString).type === 'application/x-www-form-urlencoded';
    }
}