import { CancellationToken, Location, Position, Range, ReferenceContext, ReferenceProvider, TextDocument } from 'vscode';
import * as Constants from '../common/constants';
import { VariableUtility } from '../utils/variableUtility';

export class FileVariableReferenceProvider implements ReferenceProvider {
    public async provideReferences(document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[] | undefined> {
        const wordRange = VariableUtility.getEnvironmentOrFileVariableReferenceNameRange(document, position)
            || VariableUtility.getFileVariableDefinitionNameRange(document, position);
        if (!wordRange) {
            return undefined;
        }

        const selectedVariableName = document.getText(wordRange);
        const documentLines = document.getText().split(Constants.LineSplitterRegex);
        const locations: Range[] = [];
        if (context.includeDeclaration) {
            const definitionLocations = VariableUtility.getFileVariableDefinitionRanges(documentLines, selectedVariableName);
            locations.push(...definitionLocations);
        }
        const referenceLocations = VariableUtility.getFileVariableReferenceRanges(documentLines, selectedVariableName);
        locations.push(...referenceLocations);
        return locations.map(location => new Location(document.uri, location));
    }
}
