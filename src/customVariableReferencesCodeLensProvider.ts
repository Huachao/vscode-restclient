'use strict';

import { CancellationToken, CodeLens, CodeLensProvider, Command, Location, Range, TextDocument } from 'vscode';
import * as Constants from './constants';
import { Selector } from './selector';
import { VariableUtility } from './variableUtility';

export class CustomVariableReferencesCodeLensProvider implements CodeLensProvider {
    public provideCodeLenses(document: TextDocument, token: CancellationToken): Promise<CodeLens[]> {
        let blocks: CodeLens[] = [];
        let lines: string[] = document.getText().split(/\r?\n/g);
        let delimitedLines: number[] = Selector.getDelimiterRows(lines);
        delimitedLines.push(lines.length);

        let requestRange: [number, number][] = [];
        let start: number = 0;
        for (const current of delimitedLines) {
            let end = current - 1;
            if (start <= end) {
                requestRange.push([start, end]);
                start = current + 1;
            }
        }

        for (let [blockStart, blockEnd] of requestRange) {
            while (blockStart <= blockEnd) {
                const line = lines[blockStart];
                if (Selector.isVariableDefinitionLine(line)) {
                    const range = new Range(blockStart, 0, blockEnd, 0);
                    let match: RegExpExecArray;
                    if (match = Constants.VariableDefinitionRegex.exec(line)) {
                        const variableName = match[1];
                        const locations = VariableUtility.getReferenceRanges(lines, variableName);
                        const cmd: Command = {
                            arguments: [document.uri, range.start, locations.map(loc => new Location(document.uri, loc))],
                            title: locations.length === 1 ? '1 reference' : `${locations.length} references`,
                            command: locations.length ? 'editor.action.showReferences' : '',
                        };
                        blocks.push(new CodeLens(range, cmd));
                    }
                    blockStart++;
                } else if (!line.trim()) {
                    blockStart++;
                } else {
                    break;
                }
            }
        }

        return Promise.resolve(blocks);
    }

}
