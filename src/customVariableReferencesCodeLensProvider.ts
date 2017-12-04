'use strict';

import { CodeLensProvider, TextDocument, CancellationToken, CodeLens, Command, Range, Location } from 'vscode';
import { Selector } from './selector';
import * as Constants from './constants';

export class CustomVariableReferencesCodeLensProvider implements CodeLensProvider {
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
            let [blockStart, blockEnd] = requestRange[index];

            while (blockStart <= blockEnd) {
                if (Selector.isVariableDefinitionLine(lines[blockStart])) {
                    const range = new Range(blockStart, 0, blockEnd, 0);
                    const line = lines[blockStart];
                    let match: RegExpExecArray;
                    if (match = Constants.VariableDefinitionRegex.exec(line)) {
                        const variableName = match[1];
                        const locations = this.getReferenceRanges(lines, variableName);
                        const cmd: Command = {
                            arguments: [document.uri, range.start, locations.map(loc => new Location(document.uri, loc))],
                            title: locations.length === 1 ? '1 reference' : `${locations.length} references`,
                            command: locations.length ? 'editor.action.showReferences' : '',
                        };
                        blocks.push(new CodeLens(range, cmd));
                    }
                    blockStart++;
                } else {
                    break;
                }
            }

            if (Selector.isResponseStatusLine(lines[blockStart])) {
                continue;
            }
        }

        return Promise.resolve(blocks);
    }

    private getReferenceRanges(lines: string[], variable: string): Range[] {
        let locations: Range[] = [];
        for (let index = 0; index < lines.length; index++) {
            let line = lines[index];
            if (Constants.CommentIdentifiersRegex.test(line)) {
                continue;
            }

            let regex = new RegExp(`\{\{${variable}\}\}`, 'g');
            let match: RegExpExecArray;
            while (match = regex.exec(line)) {
                let startPos = match.index + 2;
                let endPos = startPos + variable.length;
                locations.push(new Range(index, startPos, index, endPos));
                regex.lastIndex = match.index + 1;
            }
        };
        return locations;
    }

}
