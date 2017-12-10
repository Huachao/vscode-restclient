'use strict';
import { ResponseProcessor } from "./responseProcessor"
import { VariableProcessor } from "./variableProcessor"
import { VariableUtility } from "./variableUtility"

import { CompletionItemProvider, TextDocument, Position, CancellationToken, CompletionItem, CompletionItemKind } from 'vscode';
import { HttpElementFactory } from './httpElementFactory';
import { ElementType } from './models/httpElement';

export class ResponseVariableCompletionItemProvider implements CompletionItemProvider {
    public async provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken): Promise<CompletionItem[]> {
        if (!VariableUtility.isPartialResponseVariable(document, position)) {
            return [];
        }
                
        const wordRange = document.getWordRangeAtPosition(position);
        let lineRange = document.lineAt(position);

        const fullPath = VariableUtility.getResponseVariable(wordRange, lineRange, position);

        let completionItems: CompletionItem[] = [];        

        const fileResponseVariables = VariableProcessor.getResponseVariablesInFile(document);
        for (let [variableName, response] of fileResponseVariables) {
            let regex = new RegExp(`(${variableName})($|\.|\[\d+\])`);          
            if (regex.test(fullPath)) {
                const valueAtPath = ResponseProcessor.getValueAtPath(response, fullPath);
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