'use strict';
import { RequestVariableCacheValueProcessor } from "./requestVariableCacheValueProcessor"
import { VariableProcessor } from "./variableProcessor"
import { VariableUtility } from "./variableUtility"

import { CompletionItemProvider, TextDocument, Position, CancellationToken, CompletionItem, CompletionItemKind } from 'vscode';
import { HttpElementFactory } from './httpElementFactory';
import { ElementType } from './models/httpElement';

export class RequestVariableCompletionItemProvider implements CompletionItemProvider {
    public async provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken): Promise<CompletionItem[]> {
        if (!VariableUtility.isPartialRequestVariableReference(document, position)) {
            return [];
        }
                
        const wordRange = document.getWordRangeAtPosition(position);
        let lineRange = document.lineAt(position);

        const fullPath = VariableUtility.getRequestVariablePath(wordRange, lineRange, position);

        let completionItems: CompletionItem[] = [];        

        const fileRequestVariables = VariableProcessor.getRequestVariablesInFile(document);
        for (let [variableName, variableValue] of fileRequestVariables) {
            let regex = new RegExp(`(${variableName})($|\.|\[\d+\])`);          
            if (regex.test(fullPath)) {
                const valueAtPath = RequestVariableCacheValueProcessor.getValueAtPath(variableValue, fullPath);
                if (valueAtPath) {
                    let props = Object.getOwnPropertyNames(valueAtPath);
                    
                    completionItems = props.map(p => {
                        let item = new CompletionItem(p);
                        item.detail = `(property) ${p}`;
                        item.documentation = p;
                        item.insertText = p;
                        item.kind = CompletionItemKind.Field;
                        return item;
                    });
                }
            }
        }

        return completionItems;
    }
}