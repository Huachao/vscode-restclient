'use strict';

import { CancellationToken, Definition, DefinitionProvider, Location, Position, TextDocument } from 'vscode';
import * as Constants from '../common/constants';
import { VariableUtility } from '../utils/variableUtility';

export class FileVariableDefinitionProvider implements DefinitionProvider {
    public async provideDefinition(document: TextDocument, position: Position, token: CancellationToken): Promise<Definition> {
        if (!VariableUtility.isEnvironmentOrFileVariableReference(document, position)) {
            return;
        }

        const documentLines = document.getText().split(Constants.LineSplitterRegex);

        const wordRange = document.getWordRangeAtPosition(position);
        const selectedVariableName = document.getText(wordRange);

        const locations = VariableUtility.getFileVariableDefinitionRanges(documentLines, selectedVariableName);
        return locations.map(location => new Location(document.uri, location));
    }
}