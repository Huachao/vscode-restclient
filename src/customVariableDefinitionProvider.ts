'use strict';

import { DefinitionProvider, Definition, TextDocument, CancellationToken, Position, Location, Range } from 'vscode';
import { VariableUtility } from './variableUtility';
import * as Constants from './constants';

export class CustomVariableDefinitionProvider implements DefinitionProvider {
    public provideDefinition(document: TextDocument, position: Position, token: CancellationToken): Promise<Definition> {
        if (!VariableUtility.isVariableReference(document, position)) {
            return Promise.resolve(null);
        }

        let documentLines = document.getText().split(/\r?\n/g);

        let wordRange = document.getWordRangeAtPosition(position);
        let selectedVariableName = document.getText(wordRange);

        let locations = this.getDefinitionRanges(documentLines, selectedVariableName);
        return Promise.resolve(locations.map(location => {
            return new Location(document.uri, location);
        }));
    }

    private getDefinitionRanges(lines: string[], variable: string): Range[] {
        let locations: Range[] = [];
        for (let index = 0; index < lines.length; index++) {
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
}