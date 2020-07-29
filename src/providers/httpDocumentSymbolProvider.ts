import { CancellationToken, DocumentSymbolProvider, Range, SymbolKind, TextDocument, DocumentSymbol } from 'vscode';
import * as Constants from '../common/constants';
import { Selector } from '../utils/selector';

export class HttpDocumentSymbolProvider implements DocumentSymbolProvider {
    public async provideDocumentSymbols(document: TextDocument, token: CancellationToken): Promise<DocumentSymbol[]> {
        let symbols: DocumentSymbol[] = [];
        const allLines: string[] = document.getText().split(Constants.LineSplitterRegex);
        if (allLines.length <= 0) return symbols;
        let allSharpRowIndexs: number[] = Selector.getAllSharpRanges(allLines);
        if (allSharpRowIndexs.length <= 0) return symbols;
        for (let i = 0; i < allSharpRowIndexs.length; i++) {
            console.log('i:' + i);
            let blockStart = allSharpRowIndexs[i];
            let line = allLines[blockStart];
            if (line == undefined) break;
            let [sharpStr1, sharpCount1] = this.GetSharpString(line);//取出前面有一个#
            let text = line.replace(sharpStr1, "");//取出#后面的内容
            let symbol1 = new DocumentSymbol(
                text,
                '',
                SymbolKind.String,
                new Range(blockStart, 0, blockStart, line.length),
                new Range(blockStart, 0, blockStart, line.length));
            let child1Count = this.GetChildRows(allLines, allSharpRowIndexs, sharpCount1, i);
            let symbol1Children: DocumentSymbol[] = [];
            for (let j = 0; j < child1Count; j++) {
                i++;
                if (i >= allSharpRowIndexs.length) break;
                console.log('i:' + i);
                blockStart = allSharpRowIndexs[i];
                line = allLines[blockStart];
                if (line == undefined) break;
                let [sharpStr11, sharpCount11] = this.GetSharpString(line);//取出前面有一个#
                let text = line.replace(sharpStr11, "");//取出#后面的内容
                let symbol11: DocumentSymbol = new DocumentSymbol(
                    text,
                    '',
                    SymbolKind.String,
                    new Range(blockStart, 0, blockStart, line.length),
                    new Range(blockStart, 0, blockStart, line.length));

                let child2Count = this.GetChildRows(allLines, allSharpRowIndexs, sharpCount11, i);
                let symbol11Children: DocumentSymbol[] = [];
                for (let k = 0; k < child2Count; k++) {
                    i++;
                    j++;
                    if (i >= allSharpRowIndexs.length) break;
                    console.log('i:' + i);
                    blockStart = allSharpRowIndexs[i];
                    line = allLines[blockStart];
                    if (line == undefined) break;
                    let [sharpStr111, sharpCount111] = this.GetSharpString(line);//取出前面有一个#
                    let text = line.replace(sharpStr111, "");//取出#后面的内容
                    let symbol111: DocumentSymbol = new DocumentSymbol(
                        text,
                        '',
                        SymbolKind.String,
                        new Range(blockStart, 0, blockStart, line.length),
                        new Range(blockStart, 0, blockStart, line.length));
                    let child3Count = this.GetChildRows(allLines, allSharpRowIndexs, sharpCount111, i);
                    let symbol111Children: DocumentSymbol[] = [];
                    for (let l = 0; l < child3Count; l++) {
                        i++;
                        j++;
                        k++;
                        if (i >= allSharpRowIndexs.length) break;
                        console.log('i:' + i);
                        blockStart = allSharpRowIndexs[i];
                        line = allLines[blockStart];
                        if (line == undefined) break;
                        let [sharpStr1111, sharpCount1111] = this.GetSharpString(line);//取出前面有一个#
                        let text = line.replace(sharpStr1111, "");//取出#后面的内容
                        let symbol1111: DocumentSymbol = new DocumentSymbol(
                            text,
                            '',
                            SymbolKind.String,
                            new Range(blockStart, 0, blockStart, line.length),
                            new Range(blockStart, 0, blockStart, line.length));

                        symbol111Children.push(symbol1111);
                    }//process children3

                    symbol111.children = symbol111Children;
                    symbol11Children.push(symbol111);
                }//process children2

                symbol11.children = symbol11Children;
                symbol1Children.push(symbol11);
            }//process children1
            symbol1.children = symbol1Children;
            symbols.push(symbol1);
        }
        return symbols;
    }

    /**
     * 得到当前一级其后所有的子级，直到遇到比当前级大的
     * @param allLines 
     * @param allSharpRowIndexs 
     * @param parentSharpCount 
     */
    private GetChildRows(allLines: string[], allSharpRowIndexs: number[], parentSharpCount: number, i: number): number {
        if (i >= allSharpRowIndexs.length - 1) return 0;
        //i表示当前行，从i+1后开始
        let childCount = 0;
        for (let j = i + 1; j < allSharpRowIndexs.length; j++) {
            let blockStart = allSharpRowIndexs[j];
            let line = allLines[blockStart];
            if (line == undefined) return childCount;
            let [sharpStr, sharpCount] = this.GetSharpString(line);//取出前面有一个#
            if (sharpCount <= parentSharpCount) {
                //当前#数小于等于父级的#数，说明当前一级不是上一级的子级，本函数结束计算，返回结果
                return childCount;
            }

            //当前#数大于父级的#数，说明当前一级是上一级的子级
            childCount++;
        }
        return childCount;
    }

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