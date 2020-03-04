import { CancellationToken, Definition, DefinitionProvider, Location, Position, TextDocument } from 'vscode';
import * as Constants from '../common/constants';
import { VariableUtility } from '../utils/variableUtility';

export class FileVariableDefinitionProvider implements DefinitionProvider {
    public async provideDefinition(document: TextDocument, position: Position, token: CancellationToken): Promise<Definition | undefined> {
        const wordRange = VariableUtility.getEnvironmentOrFileVariableReferenceNameRange(document, position);
        if (!wordRange) {
            return undefined;
        }

        const selectedVariableName = document.getText(wordRange);

        const documentLines = document.getText().split(Constants.LineSplitterRegex);
        const locations = VariableUtility.getFileVariableDefinitionRanges(documentLines, selectedVariableName);
        return locations.map(location => new Location(document.uri, location));
    }
}