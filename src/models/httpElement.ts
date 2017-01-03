"use strict";

export class HttpElement {
    constructor(public name: string, public type: ElementType, public prefix: string = null, public description: string = null) {
    }
}

export enum ElementType {
    Method,
    URL,
    Header,
    MIME,
    GlobalVariable,
}