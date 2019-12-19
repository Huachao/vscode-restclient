import { CancellationToken, CompletionItem, CompletionItemKind, CompletionItemProvider, MarkdownString, Position, Range, TextDocument, TextLine } from 'vscode';
import * as Constants from "../common/constants";
import { ElementType } from "../models/httpElement";
import { ResolveState, ResolveWarningMessage } from "../models/httpVariableResolveResult";
import { RequestVariableCacheValue } from '../models/requestVariableCacheValue';
import { RequestVariableProvider } from '../utils/httpVariableProviders/requestVariableProvider';
import { RequestVariableCacheValueProcessor } from "../utils/requestVariableCacheValueProcessor";
import { VariableUtility } from "../utils/variableUtility";


const firstPartRegex: RegExp = /^(\w+)\.$/;
const secondPartRegex: RegExp = /^(\w+)\.(request|response)\.$/;

export class RequestVariableCompletionItemProvider implements CompletionItemProvider {
    public async provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken): Promise<CompletionItem[]> {
        if (!VariableUtility.isPartialRequestVariableReference(document, position)) {
            return [];
        }


        const wordRange = document.getWordRangeAtPosition(position, /\{\{(\w+)\.(.*?)?\}\}/);
        const lineRange = document.lineAt(position);

        let fullPath = this.getRequestVariableCompletionPath(wordRange!, lineRange, position);

        if (!fullPath) {
            return [];
        }

        const match = fullPath.match(/(\w+)\.(.*?)?/);
        if (!match || !this.checkIfRequestVariableDefined(document, match[1])) {
            return [];
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

        const requestVariables = await RequestVariableProvider.Instance.getAll(document);
        for (const { name, value } of requestVariables) {
            // Only add completion items for headers
            const regex = new RegExp(`^(${name}).(?:request|response).headers.$`);
            if (regex.test(fullPath)) {
                // Remove last dot if present
                fullPath = fullPath.replace(/\.$/, '');

                const result = RequestVariableCacheValueProcessor.resolveRequestVariable(value as RequestVariableCacheValue, fullPath);
                if (result.state === ResolveState.Warning && result.message === ResolveWarningMessage.MissingHeaderName) {
                    const {value} = result;
                    return Object.keys(value).map(p => {
                        const item = new CompletionItem(p);
                        item.detail = `HTTP ${ElementType[ElementType.RequestCustomVariable]}`;
                        item.documentation = new MarkdownString(`Value: \`${value[p]}\``);
                        item.insertText = p;
                        item.kind = CompletionItemKind.Field;
                        return item;
                    });
                }
            }
        }

        return [];
    }

    private checkIfRequestVariableDefined(document: TextDocument, variableName: string) {
        const text = document.getText();
        const regex = new RegExp(Constants.RequestVariableDefinitionWithNameRegexFactory(variableName, "m"));
        return regex.test(text);
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