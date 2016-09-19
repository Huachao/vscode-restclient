"use strict";

export class HttpElement {
    name: string;
    type: ElementType;
    prefix: string;
    description: string;

    constructor(name: string, type: ElementType, prefix: string = null, description: string = null) {
        this.name = name;
        this.type = type;
        this.prefix = prefix;
        this.description = description;
    }
}

export enum ElementType {
    Method,
    Header,
    MIME,
    GlobalVariable,
}