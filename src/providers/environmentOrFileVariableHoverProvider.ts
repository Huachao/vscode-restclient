'use strict';

import { CancellationToken, Hover, HoverProvider, MarkdownString, MarkedString, Position, TextDocument } from 'vscode';
import { EnvironmentVariableProvider } from '../utils/httpVariableProviders/environmentVariableProvider';
import { FileVariableProvider } from '../utils/httpVariableProviders/fileVariableProvider';
import { VariableUtility } from '../utils/variableUtility';

export class EnvironmentOrFileVariableHoverProvider implements HoverProvider {

    public async provideHover(document: TextDocument, position: Position, token: CancellationToken): Promise<Hover> {
        if (!VariableUtility.isEnvironmentOrFileVariableReference(document, position)) {
            return;
        }

        const wordRange = document.getWordRangeAtPosition(position);
        const selectedVariableName = document.getText(wordRange);

        if (await FileVariableProvider.Instance.has(document, selectedVariableName)) {
            const { name, value, error, warning } = await FileVariableProvider.Instance.get(document, selectedVariableName);
            if (!warning && !error) {
                const contents: MarkedString[] = [value as string, new MarkdownString(`*File Variable* \`${name}\``)];
                return new Hover(contents, wordRange);
            }

            return;
        }

        if (await EnvironmentVariableProvider.Instance.has(document, selectedVariableName)) {
            const { name, value, error, warning } = await EnvironmentVariableProvider.Instance.get(document, selectedVariableName);
            if (!warning && !error) {
                const contents: MarkedString[] = [value as string, new MarkdownString(`*Environment Variable* \`${name}\``)];
                return new Hover(contents, wordRange);
            }

            return;
        }

        return;
    }
}