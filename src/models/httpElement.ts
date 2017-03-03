"use strict";

import { SnippetString } from 'vscode';

export class HttpElement {
    public constructor(public name: string, public type: ElementType, public prefix: string = null, public description: string = null, public text: string | SnippetString = null) {
    }
}

export enum ElementType {
    Method,
    URL,
    Header,
    MIME,
    SystemVariable,
    CustomVariable,
}