import * as url from 'url';
import { CancellationToken, DocumentSymbolProvider, Location, Range, SymbolInformation, SymbolKind, TextDocument, DocumentSymbol } from 'vscode';
import * as Constants from '../common/constants';
import { RequestParserFactory } from '../models/requestParserFactory';
import { Selector } from '../utils/selector';
import { VariableProcessor } from '../utils/variableProcessor';
import { getCurrentHttpFileName } from '../utils/workspaceUtility';

export class HttpDocumentSymbolProvider implements DocumentSymbolProvider {
    public async provideDocumentSymbols(document: TextDocument, token: CancellationToken): Promise<DocumentSymbol[]> {
        const symbols: DocumentSymbol[] = [];
        const allLines: string[] = document.getText().split(Constants.LineSplitterRegex);
        let sharps = 1;
        let requestRange: number[] = this.GetSharpRows(allLines, sharps);
        for (let i = 0; i < requestRange.length; i++) {
            let blockStart = requestRange[i];
            if (blockStart >= allLines.length) break;

            let blockEnd;
            if (i == requestRange.length - 1)
                blockEnd = allLines.length;
            else
                blockEnd = requestRange[i + 1] - 1;

            const line = allLines[blockStart];
            if (line == undefined) break;

            let symbol: DocumentSymbol = new DocumentSymbol(
                line,
                '',
                SymbolKind.String,
                new Range(blockStart, 0, blockStart, line.length),
                new Range(blockStart, 0, blockStart, line.length));

            let blockLines: string[] = allLines.slice(blockStart, blockEnd);
            sharps = sharps + 1;
            let sharp2Range: number[] = this.GetSharpRows(blockLines, sharps);

            let children: DocumentSymbol[] = [];
            for (let j = 0; j < sharp2Range.length; j++) {
                const blockStart2 = sharp2Range[j];

                const sharp2Line = blockLines[blockStart2];
                let child: DocumentSymbol = new DocumentSymbol(
                    sharp2Line,
                    '',
                    SymbolKind.String,
                    new Range(blockStart, 0, blockStart, sharp2Line.length),
                    new Range(blockStart, 0, blockStart, sharp2Line.length));
                children.push(child);
            }

            symbol.children = children;
            symbols.push(symbol);
        }

        return symbols;
    }

    private GetSharpRows(allLines: string[], sharps: number): number[] {
        let sharpRows: number[] = Selector.getSharpRanges(allLines, sharps, { ignoreCommentLine: false, ignoreFileVariableDefinitionLine: false });
        if (sharpRows.length == 0) {
            sharps = sharps + 1;
            if (sharps >= 10)
                return [];

            return this.GetSharpRows(allLines, sharps);
        }

        return sharpRows;
    }

    private getFileVariableSymbolInfo(line: string): [string, string] {
        const fileName = getCurrentHttpFileName();
        line = line.trim();
        return [line.substring(1, line.indexOf('=')).trim(), fileName!];
    }

    private async getRequestSymbolInfo(rawText: string, name: string | undefined): Promise<[string, string]> {
        // For request with name, return the request name and file name instead
        if (name) {
            return [name, getCurrentHttpFileName()!];
        }

        const text = await VariableProcessor.processRawRequest(rawText);
        const parser = RequestParserFactory.createRequestParser(text);
        const request = await parser.parseHttpRequest();
        const parsedUrl = url.parse(request.url);
        return [`${request.method} ${parsedUrl.path}`, parsedUrl.host || ''];
    }
}