'use strict';

import { ReferenceProvider, ReferenceContext, Location, TextDocument, Position, Range, CancellationToken } from 'vscode';
import { VariableUtility } from './variableUtility';
import * as Constants from './constants';

export class CustomVariableReferenceProvider implements ReferenceProvider {
    public provideReferences(document: TextDocument, position: Position, context: ReferenceContext, token: CancellationToken): Promise<Location[]> {
        if (!VariableUtility.isVariableDefinition(document, position) && !VariableUtility.isVariableReference(document, position)) {
            return Promise.resolve(<Location[]>[]);
        }
        let documentLines = document.getText().split(/\r?\n/g);
        let wordRange = document.getWordRangeAtPosition(position);
        let selectedVariableName = document.getText(wordRange);
        let locations: Range[] = [];
        if (context.includeDeclaration) {
            let definitionLocations = this.getDefinitionRanges(documentLines, selectedVariableName);
            locations.push(...definitionLocations);
        }
        let referenceLocations = this.getReferenceRanges(documentLines, selectedVariableName);
        locations.push(...referenceLocations);
        return Promise.resolve(locations.map(location => {
            return new Location(document.uri, location);
        }));
    }

    private getDefinitionRanges(lines: string[], variable: string): Range[] {
        let locations: Range[] = [];
        for (var index = 0; index < lines.length; index++) {
            let line = lines[index];
            let match: RegExpExecArray;
            if ((match = Constants.VariableDefinitionRegex.exec(line)) &&
                match[1] === variable) {
                let startPos = line.indexOf(`@${variable}`);
                let endPos = startPos + variable.length + 1;
                locations.push(new Range(index, startPos, index, endPos));
            }
        };
        return locations;
    }

    private getReferenceRanges(lines: string[], variable: string): Range[] {
        let locations: Range[] = [];
        for (var index = 0; index < lines.length; index++) {
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
