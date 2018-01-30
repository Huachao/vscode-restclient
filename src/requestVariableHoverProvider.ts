'use strict';
import { RequestVariableCacheValueProcessor } from "./requestVariableCacheValueProcessor"

import { HoverProvider, Hover, MarkedString, TextDocument, CancellationToken, Position } from 'vscode';
import { EnvironmentController } from './controllers/environmentController';
import { VariableProcessor } from './variableProcessor';
import { VariableUtility } from './variableUtility';

export class RequestVariableHoverProvider implements HoverProvider {

    public async provideHover(document: TextDocument, position: Position, token: CancellationToken): Promise<Hover> {
        if (!VariableUtility.isRequestVariableReference(document, position)) {
            return;
        }

        // Lookup word + optional array path
        const wordRange = document.getWordRangeAtPosition(position, /\w+(\[\d+\])*/);
        let lineRange = document.lineAt(position);
    
        const fullPath = VariableUtility.getRequestVariablePath(wordRange, lineRange, position);

        const fileRequestVariables = VariableProcessor.getRequestVariablesInFile(document);
        for (let [variableName, variableValue] of fileRequestVariables) {
            let regex = new RegExp(`(${variableName})($|\.|\[\d+\])`);            
            if (regex.test(fullPath)) {
                const value = await RequestVariableCacheValueProcessor.getValueAtPath(variableValue, fullPath);

                let contents: MarkedString[] = [JSON.stringify(value), { language: 'http', value: `Response Variable ${variableName}` }];
                return new Hover(contents, wordRange);
            }
        }

        let contents: MarkedString[] = [{ language: 'http', value: `Warning: Response Variable ${fullPath} is not loaded in memory` }];
        return new Hover(contents, wordRange);
    }
}