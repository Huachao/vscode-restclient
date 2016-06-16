'use strict';

import { CompletionItemProvider, TextDocument, Position, CancellationToken, CompletionItem, CompletionItemKind } from 'vscode';
import { HttpElementFactory } from './httpElementFactory';
import { ElementType } from './models/httpElement';

export class HttpCompletionItemProvider implements CompletionItemProvider {
    public provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken): CompletionItem[] {
        let completionItems: CompletionItem[] = [];

        var elements = HttpElementFactory.getHttpElements();
        elements.map(e => {
            let item = new CompletionItem(e.name);
            item.detail = `HTTP ${ElementType[e.type]}`;
            item.insertText = e.type === ElementType.Header ? `${e.name}: ` : `${e.name} `;
            item.kind = CompletionItemKind.Text;
            completionItems.push(item);
        });

        return completionItems;
    }
}