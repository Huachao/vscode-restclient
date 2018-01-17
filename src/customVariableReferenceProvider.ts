'use strict';

import { ReferenceProvider, ReferenceContext, Location, TextDocument, Position, Range, CancellationToken } from 'vscode';
import { VariableUtility } from './variableUtility';

export class CustomVariableReferenceProvider implements ReferenceProvider {
    public async provideReferences(document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[]> {
        if (!VariableUtility.isVariableDefinition(document, position) && !VariableUtility.isVariableReference(document, position)) {
            return;
        }
        let documentLines = document.getText().split(/\r?\n/g);
        let wordRange = document.getWordRangeAtPosition(position);
        let selectedVariableName = document.getText(wordRange);
        let locations: Range[] = [];
        if (context.includeDeclaration) {
            let definitionLocations = VariableUtility.getDefinitionRanges(documentLines, selectedVariableName);
            locations.push(...definitionLocations);
        }
        let referenceLocations = VariableUtility.getReferenceRanges(documentLines, selectedVariableName);
        locations.push(...referenceLocations);
        return locations.map(location => new Location(document.uri, location));
    }
}
