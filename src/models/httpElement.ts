"use strict";

export class HttpElement {
    name: string;
    type: ElementType;

    constructor(name: string, type: ElementType) {
        this.name = name;
        this.type = type;
    }
}

export enum ElementType {
    Method,
    Header
}