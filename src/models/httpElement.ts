"use strict";

import { SnippetString } from 'vscode';

export class HttpElement {

    public text: string | SnippetString;

    public constructor(public name: string, public type: ElementType, public prefix: string = null, public description: string = null, text: string | SnippetString = null) {
        this.text = text;
        if (!this.text) {
            this.text = name;
        }

        if (typeof this.text === 'string') {
            if (type === ElementType.Header) {
                this.text = `${this.text}: `;
            } else if (type === ElementType.Method) {
                this.text = `${this.text} `;
            }
            this.text = this.text.replace(/[\{\}]/g, "\\$&");;
        }

        if (type === ElementType.SystemVariable) {
            this.name = name.substr(1);
        }
    }
}

export enum ElementType {
    Method,
    URL,
    Header,
    MIME,
    Authentication,
    SystemVariable,
    EnvironmentCustomVariable,
    FileCustomVariable
}