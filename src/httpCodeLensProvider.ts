'use strict';

import { CodeLensProvider, TextDocument, CancellationToken, CodeLens, Command, Range } from 'vscode';
import { Selector } from './selector';
import * as Constants from './constants';

export class HttpCodeLensProvider implements CodeLensProvider {
    public static responseStatusLineRegex = /^\s*HTTP\/[\d.]+/;

    public provideCodeLenses(document: TextDocument, token: CancellationToken): Promise<CodeLens[]> {
        let blocks: CodeLens[] = [];
        let lines: string[] = document.getText().split(/\r?\n/g);
        let delimitedLines: number[] = Selector.getDelimiterRows(lines);
        delimitedLines.push(lines.length);

        let requestRange: [number, number][] = [];
        let start: number = 0;
        for (let index = 0; index < delimitedLines.length; index++) {
            let end = delimitedLines[index] - 1;
            if (start <= end) {
                requestRange.push([start, end]);
                start = delimitedLines[index] + 1;
            }
        }

        for (let index = 0; index < requestRange.length; index++) {
            let blockStart = requestRange[index][0];
            let blockEnd = requestRange[index][1];

            // get real start for current requestRange
            while (blockStart <= blockEnd) {
                if (this.isEmptyLine(lines[blockStart]) ||
                    this.isCommentLine(lines[blockStart]) ||
                    this.isVariableDefinitionLine(lines[blockStart])) {
                    blockStart++;
                } else {
                    break;
                }
            }

            if (this.isResponseStatusLine(lines[blockStart])) {
                continue;
            }

            if (blockStart <= blockEnd) {
                const range = new Range(blockStart, 0, blockEnd, 0);
                const cmd: Command = {
                    arguments: [document, range],
                    title: 'Send Request',
                    command: 'rest-client.request'
                };
                blocks.push(new CodeLens(range, cmd));
            }
        }

        return Promise.resolve(blocks);
    }

    private isCommentLine(line: string): boolean {
        return Constants.CommentIdentifiersRegex.test(line);
    }

    private isEmptyLine(line: string): boolean {
        return line.trim() === '';
    }

    private isVariableDefinitionLine(line: string): boolean {
        return Constants.VariableDefinitionRegex.test(line);
    }

    private isResponseStatusLine(line: string): boolean {
        return HttpCodeLensProvider.responseStatusLineRegex.test(line);
    }
}