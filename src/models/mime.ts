"use strict";

export class MIME {
    type: string;
    suffix: string;
    raw: string;

    constructor(type: string, suffix: string, raw: string) {
        this.type =type;
        this.suffix = suffix;
        this.raw = raw;
    }
}