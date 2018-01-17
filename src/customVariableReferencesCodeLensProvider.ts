'use strict';

import { CodeLensProvider, TextDocument, CancellationToken, CodeLens, Command, Range, Location } from 'vscode';
import { Selector } from './selector';
import * as Constants from './constants';
import { VariableUtility } from './variableUtility';

export class CustomVariableReferencesCodeLensProvider implements CodeLensProvider {
    public async provideCodeLenses(document: TextDocument, token: CancellationToken): Promise<CodeLens[]> {
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

        for (const range of requestRange) {
            let [blockStart, blockEnd] = range;

            while (blockStart <= blockEnd) {
                if (Selector.isVariableDefinitionLine(lines[blockStart])) {
                    const range = new Range(blockStart, 0, blockEnd, 0);
                    const line = lines[blockStart];
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
                } else {
                    break;
                }
            }
        }

        return blocks;
    }

}
