import { CancellationToken, Hover, HoverProvider, MarkdownString, MarkedString, Position, Range, TextDocument, TextLine } from 'vscode';
import { RequestVariableProvider } from '../utils/httpVariableProviders/requestVariableProvider';
import { VariableUtility } from '../utils/variableUtility';

export class RequestVariableHoverProvider implements HoverProvider {

    public async provideHover(document: TextDocument, position: Position, token: CancellationToken): Promise<Hover | undefined> {
        if (!VariableUtility.isRequestVariableReference(document, position)) {
            return undefined;
        }

        const wordRange = document.getWordRangeAtPosition(position, /\{\{(\w+)\.(.*?)?\}\}/);
        const lineRange = document.lineAt(position);

        const fullPath = this.getRequestVariableHoverPath(wordRange!, lineRange);
        if (!fullPath) {
            return undefined;
        }
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

    private getRequestVariableHoverPath(wordRange: Range, lineRange: TextLine) {
        return wordRange && !wordRange.isEmpty
            ? lineRange.text.substring(wordRange.start.character + 2, wordRange.end.character - 2)
            : null;
    }
}