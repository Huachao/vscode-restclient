'use strict';

import { CancellationToken, Location, Position, Range, ReferenceContext, ReferenceProvider, TextDocument } from 'vscode';
import * as Constants from '../common/constants';
import { VariableUtility } from '../utils/variableUtility';

export class FileVariableReferenceProvider implements ReferenceProvider {
    public async provideReferences(document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[] | undefined> {
        if (!VariableUtility.isFileVariableDefinition(document, position) && !VariableUtility.isEnvironmentOrFileVariableReference(document, position)) {
            return undefined;
        }
        const documentLines = document.getText().split(Constants.LineSplitterRegex);
        const wordRange = document.getWordRangeAtPosition(position);
        const selectedVariableName = document.getText(wordRange);
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
