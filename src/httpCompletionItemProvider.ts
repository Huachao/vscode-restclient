'use strict';

import { CompletionItemProvider, TextDocument, Position, CancellationToken, CompletionItem, CompletionItemKind } from 'vscode';
import { HttpElementFactory } from './httpElementFactory';
import { ElementType } from './models/httpElement';

export class HttpCompletionItemProvider implements CompletionItemProvider {
    public provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken): CompletionItem[] {
        let completionItems: CompletionItem[] = [];

        var elements = HttpElementFactory.getHttpElements(document.lineAt(position).text);
        elements.map(e => {
            let item = new CompletionItem(e.name);
            item.detail = `HTTP ${ElementType[e.type]}`;
            item.documentation = e.description;
            let insertText = e.type === ElementType.Header
                ? `${e.name}: `
                : (e.type === ElementType.Method
                    ? `${e.name} `
                    : `${e.name}`);
            item.insertText = this.escapeCompletionItemInsertText(insertText);
            item.kind = e.type === ElementType.GlobalVariable
                ? CompletionItemKind.Variable
                : e.type === ElementType.Method
                    ? CompletionItemKind.Method
                    : e.type === ElementType.Header
                        ? CompletionItemKind.Property
                        : CompletionItemKind.Field;
            completionItems.push(item);
        });

        return completionItems;
    }

    private escapeCompletionItemInsertText(str: string): string {
        return str.replace(/[\{\}]/g, "\\$&");
    }
}