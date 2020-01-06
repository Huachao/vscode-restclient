import { CancellationToken, Hover, HoverProvider, MarkdownString, MarkedString, Position, TextDocument } from 'vscode';
import { DocumentWrapperVS } from '../utils/documentWrapperVS';
import { EnvironmentVariableProvider } from '../utils/httpVariableProviders/environmentVariableProvider';
import { FileVariableProvider } from '../utils/httpVariableProviders/fileVariableProvider';
import { VariableUtility } from '../utils/variableUtility';

export class EnvironmentOrFileVariableHoverProvider implements HoverProvider {

    public async provideHover(document: TextDocument, position: Position, token: CancellationToken): Promise<Hover | undefined> {
        if (!VariableUtility.isEnvironmentOrFileVariableReference(document, position)) {
            return undefined;
        }

        const wordRange = document.getWordRangeAtPosition(position);
        const selectedVariableName = document.getText(wordRange);

        const documentWrapper = new DocumentWrapperVS(document);
        if (await FileVariableProvider.Instance.has(selectedVariableName, documentWrapper)) {
            const { name, value, error, warning } = await FileVariableProvider.Instance.get(selectedVariableName, documentWrapper);
            if (!warning && !error) {
                const contents: MarkedString[] = [value as string, new MarkdownString(`*File Variable* \`${name}\``)];
                return new Hover(contents, wordRange);
            }

            return undefined;
        }

        if (await EnvironmentVariableProvider.Instance.has(selectedVariableName)) {
            const { name, value, error, warning } = await EnvironmentVariableProvider.Instance.get(selectedVariableName);
            if (!warning && !error) {
                const contents: MarkedString[] = [value as string, new MarkdownString(`*Environment Variable* \`${name}\``)];
                return new Hover(contents, wordRange);
            }
        }

        return undefined;
    }
}