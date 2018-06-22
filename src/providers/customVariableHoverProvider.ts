'use strict';

import { CancellationToken, Hover, HoverProvider, MarkdownString, MarkedString, Position, TextDocument } from 'vscode';
import { EnvironmentVariableProvider } from '../utils/httpVariableProvider/environmentVariableProvider';
import { FileVariableProvider } from '../utils/httpVariableProvider/fileVariableProvider';
import { VariableUtility } from '../utils/variableUtility';

export class CustomVariableHoverProvider implements HoverProvider {

    public async provideHover(document: TextDocument, position: Position, token: CancellationToken): Promise<Hover> {
        if (!VariableUtility.isVariableReference(document, position)) {
            return;
        }

        let wordRange = document.getWordRangeAtPosition(position);
        let selectedVariableName = document.getText(wordRange);

        const fileVariables = await FileVariableProvider.Instance.getAll(document);
        for (const { name, value } of fileVariables) {
            if (name === selectedVariableName) {
                const contents: MarkedString[] = [value as string, new MarkdownString(`*File Variable* \`${name}\``)];
                return new Hover(contents, wordRange);
            }
        }

        const environmentVariables = await EnvironmentVariableProvider.Instance.getAll(document);
        for (const { name, value } of environmentVariables) {
            if (name === selectedVariableName) {
                let contents: MarkedString[] = [value as string, new MarkdownString(`*Environment Variable* \`${name}\``)];
                return new Hover(contents, wordRange);
            }
        }

        return;
    }
}