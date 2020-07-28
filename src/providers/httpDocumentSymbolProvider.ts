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
        // let sharps = 10;
        let allSharpRowIndexs: number[] = Selector.getAllSharpRanges(allLines);
        // let preLine = "";
        // let preSharpStr = "";
        // let childing = false;
        // let needCreat = true;
        let symbol;
        let i = -1;
        do {
            i++;
            if (i >= allSharpRowIndexs.length) break;

            let blockStart = allSharpRowIndexs[i];

            let line = allLines[allSharpRowIndexs[i]];
            if (line == undefined) break;
            let [sharpStr, sharpCount] = this.GetSharpString(line);//取出前面有一个#
            let text = line.replace(sharpStr, "");//取出#后面的内容
            symbol = new DocumentSymbol(
                text,
                '',
                SymbolKind.String,
                new Range(blockStart, 0, blockStart, line.length),
                new Range(blockStart, 0, blockStart, line.length));
            let children: DocumentSymbol[] = [];

            blockStart = allSharpRowIndexs[i];
            line = allLines[blockStart];
            let [sharpStr2, sharpCount2] = this.GetSharpString(line);//取出前面有一个#
            if (sharpCount2 > sharpCount) {
                //上一级的子级
                text = line.replace(sharpStr2, "");//取出#后面的内容
                let child: DocumentSymbol = new DocumentSymbol(
                    text,
                    '',
                    SymbolKind.String,
                    new Range(blockStart, 0, blockStart, line.length),
                    new Range(blockStart, 0, blockStart, line.length));
                let children3: DocumentSymbol[] = [];
                do {
                    i++;
                    if (i >= allSharpRowIndexs.length) break;

                    blockStart = allSharpRowIndexs[i];
                    line = allLines[blockStart];
                    let [sharpStr3, sharpCount3] = this.GetSharpString(line);//取出前面有一个#
                    if (sharpCount3 > sharpCount2) {
                        //上一级的子级
                        text = line.replace(sharpStr3, "");//取出#后面的内容
                        let child3: DocumentSymbol = new DocumentSymbol(
                            text,
                            '',
                            SymbolKind.String,
                            new Range(blockStart, 0, blockStart, line.length),
                            new Range(blockStart, 0, blockStart, line.length));


                        children3.push(child3);
                        sharpCount2 = sharpCount3;
                        sharpStr2 = sharpStr3;
                    }
                    else {
                        break;
                    }
                } while (true);
                child.children = children3;

                children.push(child);

                sharpCount = sharpCount2;
                sharpStr = sharpStr2;
            }
            else {
                symbol.children = children;
                symbols.push(symbol);
            }

        } while (true);


        return symbols;
    }

    private processTree(symbols: DocumentSymbol[], allLines: string[], allSharpRowIndexs: number[], i: number) {
        do {
            i++;
            if (i >= allSharpRowIndexs.length) break;

            let blockStart = allSharpRowIndexs[i];

            let line = allLines[allSharpRowIndexs[i]];
            if (line == undefined) break;
            let [sharpStr, sharpCount] = this.GetSharpString(line);//取出前面有一个#
            let text = line.replace(sharpStr, "");//取出#后面的内容
            let symbol = new DocumentSymbol(
                text,
                '',
                SymbolKind.String,
                new Range(blockStart, 0, blockStart, line.length),
                new Range(blockStart, 0, blockStart, line.length));
            this.processChild(symbol, allLines, allSharpRowIndexs, i);
            symbols.push(symbol);
        } while (true);

        return symbols;
    }


    private processChild(symbol: DocumentSymbol, allLines: string[], allSharpRowIndexs: number[], i: number) {
        i++;
        if (i >= allSharpRowIndexs.length) return;

        let blockStart = allSharpRowIndexs[i];

        let line = allLines[allSharpRowIndexs[i]];
        if (line == undefined) return;
        let [sharpStr, sharpCount] = this.GetSharpString(line);//取出前面有一个#
        let text = line.replace(sharpStr, "");//取出#后面的内容

        blockStart = allSharpRowIndexs[i];
        line = allLines[blockStart];
        let [sharpStr2, sharpCount2] = this.GetSharpString(line);//取出前面有一个#
        let children: DocumentSymbol[] = [];
        if (sharpCount2 > sharpCount) {
            //上一级的子级
            text = line.replace(sharpStr2, "");//取出#后面的内容
            let child: DocumentSymbol = new DocumentSymbol(
                text,
                '',
                SymbolKind.String,
                new Range(blockStart, 0, blockStart, line.length),
                new Range(blockStart, 0, blockStart, line.length));


            this.processChild(child, allLines, allSharpRowIndexs, i);

            children.push(child);
            symbol.children = children;
        }
        else {
            i--;
            return;
        }
    }

    // private GetSharpRows(allLines: string[], sharps: number): number[] {
    //     let sharpRows: number[] = Selector.getSharpRanges(allLines, sharps, { ignoreCommentLine: false, ignoreFileVariableDefinitionLine: false });
    //     if (sharpRows.length == 0) {
    //         sharps = sharps + 1;
    //         if (sharps >= 10)
    //             return [];

    //         return this.GetSharpRows(allLines, sharps);
    //     }

    //     return sharpRows;
    // }

    // private getFileVariableSymbolInfo(line: string): [string, string] {
    //     const fileName = getCurrentHttpFileName();
    //     line = line.trim();
    //     return [line.substring(1, line.indexOf('=')).trim(), fileName!];
    // }

    // private async getRequestSymbolInfo(rawText: string, name: string | undefined): Promise<[string, string]> {
    //     // For request with name, return the request name and file name instead
    //     if (name) {
    //         return [name, getCurrentHttpFileName()!];
    //     }

    //     const text = await VariableProcessor.processRawRequest(rawText);
    //     const parser = RequestParserFactory.createRequestParser(text);
    //     const request = await parser.parseHttpRequest();
    //     const parsedUrl = url.parse(request.url);
    //     return [`${request.method} ${parsedUrl.path}`, parsedUrl.host || ''];
    // }


    /**
     * 获取字符串最前面的#，如###test，输出###
     * @param line 
     */
    private GetSharpString(line: string): [string, number] {
        let sharp: string = "";
        for (let index = 0; index < line.length; index++) {
            const element = line.charAt(index);
            if (element != "#")
                return [sharp, index];

            sharp = sharp + "#";
        }
        return ["", 0];
    }
}