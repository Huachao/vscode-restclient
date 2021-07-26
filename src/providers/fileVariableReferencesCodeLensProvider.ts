import { CancellationToken, CodeLens, CodeLensProvider, Command, Location, Range, TextDocument } from 'vscode';
import * as Constants from '../common/constants';
import { DocumentCache } from '../models/documentCache';
import { Selector } from '../utils/selector';
import { VariableUtility } from '../utils/variableUtility';

export class FileVariableReferencesCodeLensProvider implements CodeLensProvider {
    private readonly fileVariableReferenceCache = new DocumentCache<CodeLens[]>();

    public provideCodeLenses(document: TextDocument, token: CancellationToken): Promise<CodeLens[]> {
        if (this.fileVariableReferenceCache.has(document)) {
            return Promise.resolve(this.fileVariableReferenceCache.get(document)!);
        }

        const blocks: CodeLens[] = [];
        const lines: string[] = document.getText().split(Constants.LineSplitterRegex);
        const requestRanges: [number, number][] = Selector.getRequestRanges(lines, { ignoreFileVariableDefinitionLine: false });

        for (let [blockStart, blockEnd] of requestRanges) {
            for (; blockStart <= blockEnd; blockStart++) {
                const line = lines[blockStart];
                if (Selector.isCommentLine(line)) {
                    continue;
                } else if (!Selector.isFileVariableDefinitionLine(line)) {
                    break;
                }

                const range = new Range(blockStart, 0, blockEnd, 0);
                let match: RegExpExecArray | null;
                if (match = Constants.FileVariableDefinitionRegex.exec(line)) {
                    const variableName = match[1];
                    const locations = VariableUtility.getFileVariableReferenceRanges(lines, variableName);
                    const cmd: Command = {
                        arguments: [document.uri, range.start, locations.map(loc => new Location(document.uri, loc))],
                        title: locations.length === 1 ? '1 reference' : `${locations.length} references`,
                        command: locations.length ? 'editor.action.showReferences' : '',
                    };
                    blocks.push(new CodeLens(range, cmd));
                }
            }
        }

        this.fileVariableReferenceCache.set(document, blocks);

        return Promise.resolve(blocks);
    }

}
