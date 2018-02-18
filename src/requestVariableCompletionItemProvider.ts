'use strict';

import { CompletionItemProvider, TextDocument, Position, CancellationToken, CompletionItem, CompletionItemKind, Range, TextLine } from 'vscode';

import { RequestVariableCacheValueProcessor } from "./requestVariableCacheValueProcessor";
import { VariableProcessor } from "./variableProcessor";
import { VariableUtility } from "./variableUtility";

const firstPartRegex: RegExp = /^(\w+)\.$/;
const secondPartRegex: RegExp = /^(\w+)\.(request|response)\.$/;

export class RequestVariableCompletionItemProvider implements CompletionItemProvider {
    public async provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken): Promise<CompletionItem[]> {
        if (!VariableUtility.isPartialRequestVariableReference(document, position)) {
            return [];
        }

        const wordRange = document.getWordRangeAtPosition(position, /\{\{(\w+)\.(.*?)?\}\}/);
        let lineRange = document.lineAt(position);

        let fullPath = this.getRequestVariableCompletionPath(wordRange, lineRange, position);

        if (!fullPath) {
            return undefined;
        }

        if (firstPartRegex.test(fullPath)) {
            return [
                new CompletionItem("request", CompletionItemKind.Field),
                new CompletionItem("response", CompletionItemKind.Field),
            ];
        } else if (secondPartRegex.test(fullPath)) {
            return [
                new CompletionItem("body", CompletionItemKind.Field),
                new CompletionItem("headers", CompletionItemKind.Field),
            ];
        }

        let completionItems: CompletionItem[] = [];

        const fileRequestVariables = VariableProcessor.getRequestVariablesInFile(document);
        for (let [variableName, variableValue] of fileRequestVariables) {
            let regex = new RegExp(`(${variableName})\.(request|response)\.(body|headers)\..*`);
            if (regex.test(fullPath)) {
                // Remove last dot if present
                fullPath =
                    fullPath.charAt(fullPath.length - 1) === "."
                        ? fullPath.substring(0, fullPath.length - 1)
                        : fullPath;

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

    private getRequestVariableCompletionPath(wordRange: Range, lineRange: TextLine, position: Position) {
        // Look behind for start of variable or first dot
        let isFirst = false;
        let index = position.character;
        let forwardIndex = position.character;
        for (; index >= 0; index--) {
            if (lineRange.text[index - 1] === "{" && lineRange.text[index - 2] === "{") {
                isFirst = true;
                // Is first word, find end of word
                for (; forwardIndex <= wordRange.end.character; forwardIndex++) {
                    if (lineRange.text[forwardIndex] === ".") {
                        break;
                    }
                }
                break;
            }
            if (lineRange.text[index - 1] === ".") {
                break;
            }
        }

        if (isFirst) {
            return lineRange.text.substring(index, forwardIndex);
        } else {
            return lineRange.text.substring(wordRange.start.character + 2, index);
        }
    }
}