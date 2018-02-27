'use strict';

import { HoverProvider, Hover, MarkedString, TextDocument, CancellationToken, Position, Range, TextLine } from 'vscode';

import { VariableProcessor } from './variableProcessor';
import { VariableUtility } from './variableUtility';
import { RequestVariableCacheValueProcessor } from "./requestVariableCacheValueProcessor";

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
                const value = await RequestVariableCacheValueProcessor.getValueAtPath(variableValue, fullPath);
                let contents: MarkedString[] = [typeof value === "string" ? value : JSON.stringify(value), { language: 'http', value: `Request Variable: ${fullPath}` }];
                return new Hover(contents, wordRange);
            }
        }

        let contents: MarkedString[] = [{ language: 'http', value: `Warning: Request Variable ${fullPath} is not loaded in memory` }];
        return new Hover(contents, wordRange);
    }

    private getRequestVariableHoverPath(wordRange: Range, lineRange: TextLine) {
        return wordRange && !wordRange.isEmpty
            ? lineRange.text.substring(wordRange.start.character + 2, wordRange.end.character - 2)
            : null;
    }
}