'use strict';

import { EOL } from 'os';
import * as url from 'url';
import { CancellationToken, DocumentSymbolProvider, Location, Range, SymbolInformation, SymbolKind, TextDocument, window } from 'vscode';
import * as Constants from '../common/constants';
import { RequestParserFactory } from '../models/requestParserFactory';
import { Selector } from '../utils/selector';
import { VariableProcessor } from '../utils/variableProcessor';
import { getCurrentHttpFileName } from '../utils/workspaceUtility';

export class HttpDocumentSymbolProvider implements DocumentSymbolProvider {
    private static requestParserFactory = new RequestParserFactory();

    public async provideDocumentSymbols(document: TextDocument, token: CancellationToken): Promise<SymbolInformation[]> {
        const symbols: SymbolInformation[] = [];
        const lines: string[] = document.getText().split(Constants.LineSplitterRegex);
        const requestRange: [number, number][] = Selector.getRequestRanges(lines, { ignoreFileVariableDefinitionLine: false });

        for (let [blockStart, blockEnd] of requestRange) {
            // get real start for current requestRange
            while (blockStart <= blockEnd) {
                const line = lines[blockStart];
                if (Selector.isEmptyLine(line) ||
                    Selector.isCommentLine(line)) {
                    blockStart++;
                } else if (Selector.isVariableDefinitionLine(line)) {
                    const [name, container] = this.getVariableSymbolInfo(line);
                    symbols.push(
                        new SymbolInformation(
                            name,
                            SymbolKind.Variable,
                            container,
                            new Location(
                                document.uri,
                                new Range(blockStart, 0, blockStart, line.length))));
                    blockStart++;
                } else {
                    break;
                }
            }

            if (Selector.isResponseStatusLine(lines[blockStart])) {
                continue;
            }

            if (blockStart <= blockEnd) {
                const text = await VariableProcessor.processRawRequest(lines.slice(blockStart, blockEnd + 1).join(EOL));
                const info = this.getRequestSymbolInfo(text);
                if (!info) {
                    continue;
                }
                const [name, container] = info;
                symbols.push(
                    new SymbolInformation(
                        name,
                        SymbolKind.Method,
                        container,
                        new Location(
                            document.uri,
                            new Range(blockStart, 0, blockEnd, lines[blockEnd].length))));
            }
        }
        return symbols;
    }

    private getVariableSymbolInfo(line: string): [string, string] {
        const fileName = getCurrentHttpFileName();
        line = line.trim();
        return [line.substring(1, line.indexOf('=')).trim(), fileName!];
    }

    private getRequestSymbolInfo(text: string): [string, string] | null {
        const parser = HttpDocumentSymbolProvider.requestParserFactory.createRequestParser(text);
        const request = parser.parseHttpRequest(text, window.activeTextEditor!.document.fileName);
        if (!request) {
            return null;
        }
        const parsedUrl = url.parse(request.url);
        return [`${request.method} ${parsedUrl.path}`, parsedUrl.host || ''];
    }
}