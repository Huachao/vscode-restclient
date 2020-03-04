import { CancellationToken, Hover, HoverProvider, MarkdownString, MarkedString, Position, TextDocument } from 'vscode';
import { RequestVariableProvider } from '../utils/httpVariableProviders/requestVariableProvider';
import { VariableUtility } from '../utils/variableUtility';

export class RequestVariableHoverProvider implements HoverProvider {

    public async provideHover(document: TextDocument, position: Position, token: CancellationToken): Promise<Hover | undefined> {
        const wordRange = VariableUtility.getRequestVariableReferencePathRange(document, position);
        if (!wordRange) {
            return undefined;
        }

        const fullPath = document.getText(wordRange);

        const { name, value, warning, error } = await RequestVariableProvider.Instance.get(fullPath, document);
        if (!error && !warning) {
            const contents: MarkedString[] = [];
            if (value) {
                contents.push(typeof value === 'string' ? value : { language: 'json', value: JSON.stringify(value, null, 2) });
            }

            contents.push(new MarkdownString(`*Request Variable* \`${name}\``));

            return new Hover(contents, wordRange);
        }

        return undefined;
    }
}