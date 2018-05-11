'use strict';

import { CancellationToken, CompletionItem, CompletionItemKind, CompletionItemProvider, Position, TextDocument } from 'vscode';
import { HttpElementFactory } from '../utils/httpElementFactory';
import { ElementType } from '../models/httpElement';
import { VariableUtility } from "../utils/variableUtility";

export class HttpCompletionItemProvider implements CompletionItemProvider {
    public async provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken): Promise<CompletionItem[]> {
        if (VariableUtility.isPartialRequestVariableReference(document, position)) {
            return;
        }

        let elements = await HttpElementFactory.getHttpElements(document.lineAt(position).text);
        return elements.map(e => {
            let item = new CompletionItem(e.name);
            item.detail = `HTTP ${ElementType[e.type]}`;
            item.documentation = e.description;
            item.insertText = e.text;
            item.kind = e.type in [ElementType.SystemVariable, ElementType.EnvironmentCustomVariable, ElementType.FileCustomVariable, ElementType.RequestCustomVariable]
                ? CompletionItemKind.Variable
                : e.type === ElementType.Method
                    ? CompletionItemKind.Method
                    : e.type === ElementType.Header
                        ? CompletionItemKind.Property
                        : CompletionItemKind.Field;
            return item;
        });
    }
}