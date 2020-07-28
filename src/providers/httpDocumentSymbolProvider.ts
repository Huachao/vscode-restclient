// import * as url from 'url';
import { CancellationToken, DocumentSymbolProvider, Range, SymbolKind, TextDocument, DocumentSymbol } from 'vscode';
import * as Constants from '../common/constants';
// import { RequestParserFactory } from '../models/requestParserFactory';
import { Selector } from '../utils/selector';
// import { VariableProcessor } from '../utils/variableProcessor';
// import { getCurrentHttpFileName } from '../utils/workspaceUtility';

let i;

export class HttpDocumentSymbolProvider implements DocumentSymbolProvider {
    public async provideDocumentSymbols(document: TextDocument, token: CancellationToken): Promise<DocumentSymbol[]> {
        let symbols: DocumentSymbol[] = [];
        const allLines: string[] = document.getText().split(Constants.LineSplitterRegex);
        if (allLines.length <= 0) return symbols;
        let allSharpRowIndexs: number[] = Selector.getAllSharpRanges(allLines);
        if (allSharpRowIndexs.length <= 0) return symbols;
        // let preLine = "";
        // let preSharpStr = "";
        // let childing = false;
        // let needCreat = true;
        i = -1;
        this.processTree(symbols, allLines, allSharpRowIndexs);
        return symbols;
    }

    private processTree(symbols: DocumentSymbol[], allLines: string[], allSharpRowIndexs: number[]) {
        do {
            i++;
            if (i >= allSharpRowIndexs.length) break;

            console.log('processTree i:' + i);
            let blockStart = allSharpRowIndexs[i];
            let line = allLines[blockStart];
            if (line == undefined) break;
            let [sharpStr, sharpCount] = this.GetSharpString(line);//取出前面有一个#
            let text = line.replace(sharpStr, "");//取出#后面的内容
            let symbol = new DocumentSymbol(
                text,
                '',
                SymbolKind.String,
                new Range(blockStart, 0, blockStart, line.length),
                new Range(blockStart, 0, blockStart, line.length));
            let children: DocumentSymbol[] = [];
            this.processChild(symbol, children, allLines, allSharpRowIndexs, sharpCount);
            symbols.push(symbol);
        } while (true);

        return symbols;
    }

    /**
     * 
     * @param symbol 当前级别，寻找它的孩子
     * @param allLines 
     * @param allSharpRowIndexs 
     * @param parentSharpCount 当前级别#的数量
     */
    private processChild(symbol: DocumentSymbol, children: DocumentSymbol[], allLines: string[], allSharpRowIndexs: number[], parentSharpCount: number) {
        i++;
        if (i >= allSharpRowIndexs.length) return;
        console.log('processChild i:' + i);
        let blockStart = allSharpRowIndexs[i];
        let line = allLines[blockStart];
        if (line == undefined) return;
        let [sharpStr, sharpCount] = this.GetSharpString(line);//取出前面有一个#
        let text = line.replace(sharpStr, "");//取出#后面的内容
        if (sharpCount > parentSharpCount) {
            //当前一级是上一级的子级
            text = line.replace(sharpStr, "");//取出#后面的内容
            let child: DocumentSymbol = new DocumentSymbol(
                text,
                '',
                SymbolKind.String,
                new Range(blockStart, 0, blockStart, line.length),
                new Range(blockStart, 0, blockStart, line.length));

            //判断下一级是否是当前一级的子级
            let children2: DocumentSymbol[] = [];
            this.processChild(child, children2, allLines, allSharpRowIndexs, sharpCount);

            children.push(child);
            symbol.children = children;
        }
        else if (sharpCount == parentSharpCount) {
            //当前一级和上一级的平级

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