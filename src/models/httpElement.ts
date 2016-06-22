"use strict";

export class HttpElement {
    name: string;
    type: ElementType;
    prefix: string;

    constructor(name: string, type: ElementType, prefix: string = null) {
        this.name = name;
        this.type = type;
        this.prefix = prefix;
    }
}

export enum ElementType {
    Method,
    Header,
    MIME,
}