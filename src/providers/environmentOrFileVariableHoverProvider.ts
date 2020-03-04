import { CancellationToken, Hover, HoverProvider, MarkdownString, MarkedString, Position, TextDocument } from 'vscode';
import { EnvironmentVariableProvider } from '../utils/httpVariableProviders/environmentVariableProvider';
import { FileVariableProvider } from '../utils/httpVariableProviders/fileVariableProvider';
import { VariableUtility } from '../utils/variableUtility';

export class EnvironmentOrFileVariableHoverProvider implements HoverProvider {

    public async provideHover(document: TextDocument, position: Position, token: CancellationToken): Promise<Hover | undefined> {
        const wordRange = VariableUtility.getEnvironmentOrFileVariableReferenceNameRange(document, position);
        if (!wordRange) {
            return undefined;
        }

        const selectedVariableName = document.getText(wordRange);

        if (await FileVariableProvider.Instance.has(selectedVariableName, document)) {
            const { name, value, error, warning } = await FileVariableProvider.Instance.get(selectedVariableName, document);
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