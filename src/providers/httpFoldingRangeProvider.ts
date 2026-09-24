import { FoldingRange, FoldingRangeKind, FoldingRangeProvider, TextDocument } from 'vscode';

const RegionStartRegex = /^\s*#{3,}\s*region\b(.*)$/i;
const RegionEndRegex = /^\s*#{3,}\s*endregion\b/i;
const DelimiterRegex = /^\s*#{3,}\s*$/;
const RequestStartRegex = /^\s*(get|post|put|delete|patch|head|options|connect|trace|lock|unlock|propfind|proppatch|copy|move|mkcol|mkcalendar|acl|search|curl)\b/i;

export class HttpFoldingRangeProvider implements FoldingRangeProvider {

    public static onlyRegionsMode = false;

    public provideFoldingRanges(document: TextDocument): FoldingRange[] {
        const ranges: FoldingRange[] = [];
        const regionStack: number[] = [];
        let requestStartLine = -1;

        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i).text;

            if (RegionStartRegex.test(line)) {
                regionStack.push(i);
                if (requestStartLine !== -1) {
                    if (!HttpFoldingRangeProvider.onlyRegionsMode) {
                        ranges.push(new FoldingRange(requestStartLine, i - 1));
                    }
                    requestStartLine = -1;
                }
                continue;
            }

            if (RegionEndRegex.test(line)) {
                if (regionStack.length > 0) {
                    const startLine = regionStack.pop()!;
                    ranges.push(new FoldingRange(startLine, i, FoldingRangeKind.Region));
                }
                if (requestStartLine !== -1) {
                    if (!HttpFoldingRangeProvider.onlyRegionsMode) {
                        ranges.push(new FoldingRange(requestStartLine, i - 1));
                    }
                    requestStartLine = -1;
                }
                continue;
            }

            if (DelimiterRegex.test(line)) {
                if (requestStartLine !== -1) {
                    if (!HttpFoldingRangeProvider.onlyRegionsMode) {
                        ranges.push(new FoldingRange(requestStartLine, i));
                    }
                    requestStartLine = -1;
                }
                continue;
            }

            if (RequestStartRegex.test(line) && requestStartLine === -1) {
                requestStartLine = i;
            }
        }

        if (requestStartLine !== -1 && !HttpFoldingRangeProvider.onlyRegionsMode) {
            ranges.push(new FoldingRange(requestStartLine, document.lineCount - 1));
        }

        return ranges;
    }
}