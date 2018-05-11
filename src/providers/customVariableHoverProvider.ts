'use strict';

import { CancellationToken, Hover, HoverProvider, MarkdownString, MarkedString, Position, TextDocument } from 'vscode';
import { EnvironmentController } from '../controllers/environmentController';
import { VariableUtility } from '../utils/variableUtility';
import { VariableProcessor } from '../utils/variableProcessor';

export class CustomVariableHoverProvider implements HoverProvider {

    public async provideHover(document: TextDocument, position: Position, token: CancellationToken): Promise<Hover> {
        if (!VariableUtility.isVariableReference(document, position)) {
            return;
        }

        let wordRange = document.getWordRangeAtPosition(position);
        let selectedVariableName = document.getText(wordRange);

        let fileCustomVariables = VariableProcessor.getCustomVariablesInCurrentFile();
        for (let [variableName, variableValue] of fileCustomVariables) {
            if (variableName === selectedVariableName) {
                let contents: MarkedString[] = [variableValue, new MarkdownString(`*File Variable* \`${variableName}\``)];
                return new Hover(contents, wordRange);
            }
        }

        let environmentCustomVariables = await EnvironmentController.getCustomVariables();
        for (let [variableName, variableValue] of environmentCustomVariables) {
            if (variableName === selectedVariableName) {
                let contents: MarkedString[] = [variableValue, new MarkdownString(`*Environment Variable* \`${variableName}\``)];
                return new Hover(contents, wordRange);
            }
        }

        return;
    }
}