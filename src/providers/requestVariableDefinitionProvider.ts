import { CancellationToken, Definition, DefinitionProvider, Location, Position, TextDocument } from 'vscode';
import * as Constants from '../common/constants';
import { VariableUtility } from '../utils/variableUtility';

export class RequestVariableDefinitionProvider implements DefinitionProvider {
    public async provideDefinition(document: TextDocument, position: Position, token: CancellationToken): Promise<Definition | undefined> {
        const wordRange = VariableUtility.getRequestVariableReferenceNameRange(document, position);
        if (!wordRange) {
            return undefined;
        }

        const documentLines = document.getText().split(Constants.LineSplitterRegex);
        const selectedVariableName = document.getText(wordRange);

        const locations = VariableUtility.getRequestVariableDefinitionRanges(documentLines, selectedVariableName);
        return locations.map(location => new Location(document.uri, location));
    }
}