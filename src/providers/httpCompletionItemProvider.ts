import {
    CancellationToken,
    CompletionItem,
    CompletionItemKind,
    CompletionItemProvider,
    MarkdownString,
    Position,
    Range,
    TextDocument,
} from 'vscode';
import { EnvironmentController } from '../controllers/environmentController';
import { HttpResponse } from '../models/httpResponse';
import { ElementType } from '../models/httpElement';
import { RequestMetadata } from '../models/requestMetadata';
import { SystemSettings } from '../models/configurationSettings';
import { HttpElementFactory } from '../utils/httpElementFactory';
import { RequestVariableCache } from '../utils/requestVariableCache';
import { Selector } from '../utils/selector';
import { VariableUtility } from '../utils/variableUtility';

export class HttpCompletionItemProvider implements CompletionItemProvider {
    public async provideCompletionItems(
        document: TextDocument,
        position: Position,
        token: CancellationToken
    ): Promise<CompletionItem[] | undefined> {
        const setItems = this.provideSetCompletionItems(document, position);
        if (setItems) {
            return setItems;
        }

        if (!!VariableUtility.getPartialRequestVariableReferencePathRange(document, position)) {
            return undefined;
        }

        const elements = await HttpElementFactory.getHttpElements(
            document,
            document.lineAt(position).text
        );
        return elements.map(e => {
            const item = new CompletionItem(e.name);
            item.detail = `HTTP ${ElementType[e.type]}`;
            item.documentation = e.description;
            item.insertText = e.text;
            item.kind =
                e.type in
                [
                    ElementType.SystemVariable,
                    ElementType.EnvironmentCustomVariable,
                    ElementType.FileCustomVariable,
                    ElementType.RequestCustomVariable,
                ]
                    ? CompletionItemKind.Variable
                    : e.type === ElementType.Method
                      ? CompletionItemKind.Method
                      : e.type === ElementType.Header
                        ? CompletionItemKind.Property
                        : CompletionItemKind.Field;
            return item;
        });
    }

    private provideSetCompletionItems(
        document: TextDocument,
        position: Position
    ): CompletionItem[] | undefined {
        const line = document.lineAt(position.line).text;
        const beforeCursor = line.substring(0, position.character);

        const targetMatch = beforeCursor.match(/^\s*(?:#|\/{2})\s*@set\s+([A-Za-z_]\w*)?$/i);
        if (targetMatch) {
            const prefix = targetMatch[1] ?? '';
            const sharedVariables = this.getSharedVariableNames();
            const range = new Range(
                new Position(position.line, position.character - prefix.length),
                new Position(position.line, position.character)
            );

            return sharedVariables
                .filter(name => name.toLowerCase().startsWith(prefix.toLowerCase()))
                .map(name => {
                    const item = new CompletionItem(name, CompletionItemKind.Variable);
                    item.detail = '$shared variable';
                    item.insertText = name;
                    item.range = range;
                    return item;
                });
        }

        const sourceMatch = beforeCursor.match(
            /^\s*(?:#|\/{2})\s*@set\s+[A-Za-z_]\w*\s*=\s*(.*)$/i
        );
        if (sourceMatch) {
            const prefix = sourceMatch[1] ?? '';
            const range = new Range(
                new Position(position.line, position.character - prefix.length),
                new Position(position.line, position.character)
            );
            if (prefix === '' || prefix === 'response.') {
                const options =
                    prefix === 'response.'
                        ? ['response.headers.', 'response.body.']
                        : ['response.'];
                return options.map(option => {
                    const item = new CompletionItem(option, CompletionItemKind.Field);
                    item.detail = '@set source';
                    item.insertText = option;
                    item.range = range;
                    return item;
                });
            }

            if (/^response\.headers\.$/i.test(prefix)) {
                const response = this.getCurrentRequestCachedResponse(document, position);
                if (!response) {
                    return undefined;
                }

                const suffixRange = new Range(position, position);

                return Object.keys(response.headers).map(headerName => {
                    const item = new CompletionItem(headerName, CompletionItemKind.Field);
                    item.detail = '@set header';
                    item.documentation = new MarkdownString(
                        `Value: \`${response.headers[headerName]}\``
                    );
                    item.insertText = headerName;
                    item.range = suffixRange;
                    return item;
                });
            }

            const headerPrefixMatch = prefix.match(/^response\.headers\.(.*)$/i);
            if (headerPrefixMatch) {
                const response = this.getCurrentRequestCachedResponse(document, position);
                if (!response) {
                    return undefined;
                }

                const headerPrefix = headerPrefixMatch[1] ?? '';
                const headerPrefixRange = new Range(
                    new Position(position.line, position.character - headerPrefix.length),
                    position
                );
                return Object.keys(response.headers)
                    .filter(headerName =>
                        headerName.toLowerCase().startsWith(headerPrefix.toLowerCase())
                    )
                    .map(headerName => {
                        const item = new CompletionItem(headerName, CompletionItemKind.Field);
                        item.detail = '@set header';
                        item.documentation = new MarkdownString(
                            `Value: \`${response.headers[headerName]}\``
                        );
                        item.insertText = headerName;
                        item.range = headerPrefixRange;
                        return item;
                    });
            }

            if (/^response\.body\.$/i.test(prefix) || /^response\.body\.[^\s]*$/i.test(prefix)) {
                const response = this.getCurrentRequestCachedResponse(document, position);
                const bodyPrefixMatch = prefix.match(/^response\.body\.(.*)$/i);
                const bodyPrefix = bodyPrefixMatch?.[1] ?? '';
                const bodyPrefixRange = new Range(
                    new Position(position.line, position.character - bodyPrefix.length),
                    position
                );

                const options = ['*', '$.'];
                if (response) {
                    try {
                        const parsedBody = JSON.parse(response.body);
                        if (
                            parsedBody &&
                            typeof parsedBody === 'object' &&
                            !Array.isArray(parsedBody)
                        ) {
                            for (const key of Object.keys(parsedBody)) {
                                options.push(`$.${key}`);
                            }
                        }
                    } catch {}
                }

                return Array.from(new Set(options))
                    .filter(option => option.toLowerCase().startsWith(bodyPrefix.toLowerCase()))
                    .map(option => {
                        const item = new CompletionItem(option, CompletionItemKind.Field);
                        item.detail = '@set body path';
                        item.insertText = option;
                        item.range = bodyPrefixRange;
                        return item;
                    });
            }

            const options = ['response.headers.', 'response.body.'];
            return options
                .filter(option => option.toLowerCase().startsWith(prefix.toLowerCase()))
                .map(option => {
                    const item = new CompletionItem(option, CompletionItemKind.Field);
                    item.detail = '@set source';
                    item.insertText = option;
                    item.range = range;
                    return item;
                });
        }

        return undefined;
    }

    private getSharedVariableNames(): string[] {
        const environmentVariables = SystemSettings.Instance.environmentVariables;
        const sharedVariables =
            environmentVariables[EnvironmentController.sharedEnvironmentName] ?? {};
        return Object.keys(sharedVariables);
    }

    private getCurrentRequestCachedResponse(
        document: TextDocument,
        position: Position
    ): HttpResponse | undefined {
        const requestBlock = Selector.getDelimitedText(document.getText(), position.line);
        if (!requestBlock) {
            return;
        }

        const metadatas = Selector.parseReqMetadatas(requestBlock.split(/\r?\n/g));
        const requestName = metadatas.get(RequestMetadata.Name);
        if (!requestName) {
            return;
        }

        return RequestVariableCache.get(document, requestName) as HttpResponse | undefined;
    }
}
