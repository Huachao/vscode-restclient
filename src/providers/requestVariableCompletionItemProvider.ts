import { CancellationToken, CompletionItem, CompletionItemKind, CompletionItemProvider, MarkdownString, Position, TextDocument } from 'vscode';
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
    public async provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken): Promise<CompletionItem[] | undefined> {
        const wordRange = VariableUtility.getPartialRequestVariableReferencePathRange(document, position);

        let fullPath = document.getText(wordRange);

        const match = fullPath.match(/(\w+)\.(.*?)?/);
        if (!match || !this.checkIfRequestVariableDefined(document, match[1])) {
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

        return undefined;
    }

    private checkIfRequestVariableDefined(document: TextDocument, variableName: string) {
        const text = document.getText();
        const regex = new RegExp(Constants.RequestVariableDefinitionWithNameRegexFactory(variableName, "m"));
        return regex.test(text);
    }
}