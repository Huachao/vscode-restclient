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
        let symbols: SymbolInformation[] = [];
        let lines: string[] = document.getText().split(Constants.LineSplitterRegex);
        let delimitedLines: number[] = Selector.getDelimiterRows(lines);
        delimitedLines.push(lines.length);

        let requestRange: [number, number][] = [];
        let start: number = 0;
        for (let index = 0; index < delimitedLines.length; index++) {
            let end = delimitedLines[index] - 1;
            while (start < end) {
                let line = lines[end];
                if (Selector.isEmptyLine(line) || Selector.isCommentLine(line)) {
                    end--;
                } else {
                    break;
                }
            }
            if (start <= end) {
                requestRange.push([start, end]);
                start = delimitedLines[index] + 1;
            }
        }

        for (let [blockStart, blockEnd] of requestRange) {
            // get real start for current requestRange
            while (blockStart <= blockEnd) {
                let line = lines[blockStart];
                if (Selector.isEmptyLine(line) ||
                    Selector.isCommentLine(line)) {
                    blockStart++;
                } else if (Selector.isVariableDefinitionLine(line)) {
                    let [name, container] = this.getVariableSymbolInfo(line);
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
                const [name, container] = this.getRequestSymbolInfo(text);
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
        let fileName = getCurrentHttpFileName();
        line = line.trim();
        return [line.substring(1, line.indexOf('=')).trim(), fileName];
    }

    private getRequestSymbolInfo(text: string): [string, string] {
        let parser = HttpDocumentSymbolProvider.requestParserFactory.createRequestParser(text);
        let request = parser.parseHttpRequest(text, window.activeTextEditor.document.fileName);
        let parsedUrl = url.parse(request.url);
        return [`${request.method} ${parsedUrl.path}`, parsedUrl.host || ''];
    }
}