'use strict';

import { CancellationToken, Hover, HoverProvider, MarkdownString, MarkedString, Position, Range, TextDocument, TextLine } from 'vscode';
import { ResolveState } from "../models/requestVariableResolveResult";
import { RequestVariableCacheValueProcessor } from "../utils/requestVariableCacheValueProcessor";
import { VariableUtility } from '../utils/variableUtility';
import { VariableProcessor } from '../utils/variableProcessor';

export class RequestVariableHoverProvider implements HoverProvider {

    public async provideHover(document: TextDocument, position: Position, token: CancellationToken): Promise<Hover> {
        if (!VariableUtility.isRequestVariableReference(document, position)) {
            return;
        }

        const wordRange = document.getWordRangeAtPosition(position, /\{\{(\w+)\.(.*?)?\}\}/);
        let lineRange = document.lineAt(position);

        const fullPath = this.getRequestVariableHoverPath(wordRange, lineRange);
        const fileRequestVariables = VariableProcessor.getRequestVariablesInFile(document);
        for (let [variableName, variableValue] of fileRequestVariables) {
            let regex = new RegExp(`(${variableName})\.(.*?)?`);
            if (regex.test(fullPath)) {
                const result = await RequestVariableCacheValueProcessor.resolveRequestVariable(variableValue, fullPath);
                if (result.state !== ResolveState.Success) {
                    continue;
                }

                const {value} = result;
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