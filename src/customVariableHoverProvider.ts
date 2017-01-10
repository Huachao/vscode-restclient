'use strict';

import {HoverProvider, Hover, MarkedString, TextDocument, CancellationToken, Position} from 'vscode';
import { EnvironmentController } from './controllers/environmentController';

export class CustomVariableHoverProvider implements HoverProvider {

    public async provideHover(document: TextDocument, position: Position, token: CancellationToken): Promise<Hover> {
        let wordRange = document.getWordRangeAtPosition(position);
        let lineRange = document.lineAt(position);
        if (!wordRange
            || wordRange.start.character < 2
            || wordRange.end.character > lineRange.range.end.character - 1
            || lineRange.text[wordRange.start.character - 1] !== '{'
            || lineRange.text[wordRange.start.character - 2] !== '{'
            || lineRange.text[wordRange.end.character] !== '}'
            || lineRange.text[wordRange.end.character + 1] !== '}') {
            // not a custom variable syntax
            return;
        }

        let selectedVariableName = document.getText(wordRange);

        let customVariables = await EnvironmentController.getCustomVariables();
        for (var variableName in customVariables) {
            if (variableName === selectedVariableName) {
                let contents: MarkedString[] = [customVariables[variableName], { language: 'http', value: `Custom Variable ${variableName}` }];
                return new Hover(contents, wordRange);
            }
        }

        return;
    }
}