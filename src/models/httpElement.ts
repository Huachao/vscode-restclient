import { MarkdownString, SnippetString } from 'vscode';

export class HttpElement {

    public constructor(public name: string, public type: ElementType, public prefix?: string | null, public description?: string | MarkdownString, public text?: string | SnippetString) {
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
            this.text = this.text.replace(/[\{\}]/g, "\\$&");
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
    FileCustomVariable,
    RequestCustomVariable
}