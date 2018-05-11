'use strict';

import { EOL } from 'os';
import * as url from 'url';
import { CancellationToken, DocumentSymbolProvider, Location, Range, SymbolInformation, SymbolKind, TextDocument, window } from 'vscode';
import { ArrayUtility } from "../common/arrayUtility";
import { RequestParserFactory } from '../models/requestParserFactory';
import { Selector } from '../utils/selector';
import { getCurrentHttpFileName } from '../utils/workspaceUtility';
import { VariableProcessor } from '../utils/variableProcessor';

export class HttpDocumentSymbolProvider implements DocumentSymbolProvider {
    private static requestParserFactory = new RequestParserFactory();

    public async provideDocumentSymbols(document: TextDocument, token: CancellationToken): Promise<SymbolInformation[]> {
        let symbols: SymbolInformation[] = [];
        let lines: string[] = document.getText().split(/\r?\n/g);
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

        for (let index = 0; index < requestRange.length; index++) {
            let [blockStart, blockEnd] = requestRange[index];

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
                let text = await VariableProcessor.processRawRequest(this.getRequestLines(lines.slice(blockStart, blockEnd + 1)).join(EOL));
                let [name, container] = this.getRequestSymbolInfo(text);
                symbols.push(
                    new SymbolInformation(
                        name,
                        SymbolKind.Method,
                        container,
                        new Location(
                            document.uri,
                            new Range(blockStart, 0, blockEnd, 0))));
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
        return [`${request.method} ${parsedUrl.path}`, parsedUrl.host];
    }

    private getRequestLines(lines: string[]): string[] {
        if (lines.length <= 1) {
            return lines;
        }

        let end = ArrayUtility.firstIndexOf(lines, val => val.trim()[0] !== '?' && val.trim()[0] !== '&', 1);
        return lines.slice(0, end);
    }

}