'use strict';

import { CancellationToken, Hover, HoverProvider, MarkdownString, MarkedString, Position, Range, TextDocument, TextLine } from 'vscode';
import { RequestVariableCacheValue } from '../models/requestVariableCacheValue';
import { ResolveState } from "../models/requestVariableResolveResult";
import { RequestVariableProvider } from '../utils/httpVariableProvider/requestVariableProvider';
import { RequestVariableCacheValueProcessor } from "../utils/requestVariableCacheValueProcessor";
import { VariableUtility } from '../utils/variableUtility';

export class RequestVariableHoverProvider implements HoverProvider {

    public async provideHover(document: TextDocument, position: Position, token: CancellationToken): Promise<Hover> {
        if (!VariableUtility.isRequestVariableReference(document, position)) {
            return;
        }

        const wordRange = document.getWordRangeAtPosition(position, /\{\{(\w+)\.(.*?)?\}\}/);
        let lineRange = document.lineAt(position);

        const fullPath = this.getRequestVariableHoverPath(wordRange, lineRange);
        const requestVariables = await RequestVariableProvider.Instance.getAll(document);
        for (let { name, value: v } of requestVariables) {
            let regex = new RegExp(`(${name})\.(.*?)?`);
            if (regex.test(fullPath)) {
                const result = await RequestVariableCacheValueProcessor.resolveRequestVariable(v as RequestVariableCacheValue, fullPath);
                if (result.state !== ResolveState.Success) {
                    continue;
                }

                const { value } = result;
                const contents: MarkedString[] = [];
                if (value) {
                    contents.push(typeof value !== "object" ? value : { language: 'json', value: JSON.stringify(value, null, 2) });
                }

                contents.push(new MarkdownString(`*Request Variable* \`${fullPath}\``));

                return new Hover(contents, wordRange);
            }
        }

        return;
    }

    private getRequestVariableHoverPath(wordRange: Range, lineRange: TextLine) {
        return wordRange && !wordRange.isEmpty
            ? lineRange.text.substring(wordRange.start.character + 2, wordRange.end.character - 2)
            : null;
    }
}