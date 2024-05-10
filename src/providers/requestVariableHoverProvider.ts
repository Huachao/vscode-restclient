import { CancellationToken, Hover, HoverProvider, MarkdownString, Position, TextDocument } from 'vscode';
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
            const contents: MarkdownString[] = [];
            if (value) {
                if (typeof value === 'string') {
                    contents.push(new MarkdownString(value));
                } else {
                    contents.push(new MarkdownString().appendCodeblock(JSON.stringify(value, null, 2), 'json'));
                }
            }

            contents.push(new MarkdownString(`*Request Variable* \`${name}\``));

            return new Hover(contents, wordRange);
        }

        return undefined;
    }
}