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
}