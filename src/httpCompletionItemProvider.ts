'use strict';
import { VariableUtility } from "./variableUtility"

import { CompletionItemProvider, TextDocument, Position, CancellationToken, CompletionItem, CompletionItemKind } from 'vscode';
import { HttpElementFactory } from './httpElementFactory';
import { ElementType } from './models/httpElement';

export class HttpCompletionItemProvider implements CompletionItemProvider {
    public async provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken): Promise<CompletionItem[]> {
        if (VariableUtility.isPartialRequestVariableReference(document, position)) {
            return;
        }

        let completionItems: CompletionItem[] = [];

        let elements = await HttpElementFactory.getHttpElements(document.lineAt(position).text);
        elements.map(e => {
            let item = new CompletionItem(e.name);
            item.detail = `HTTP ${ElementType[e.type]}`;
            item.documentation = e.description;
            item.insertText = e.text;
            item.kind = e.type === ElementType.SystemVariable
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
}