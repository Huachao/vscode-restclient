import { CancellationToken, CodeLens, CodeLensProvider, Command, Event, Range, TextDocument } from 'vscode';
import * as Constants from '../common/constants';
import { EnvironmentController } from '../controllers/environmentController';
import { Selector } from '../utils/selector';

export class EnvironmentCodeLensProvider implements CodeLensProvider {

    readonly onDidChangeCodeLenses = EnvironmentController.onDidChangeEnvironment as unknown as Event<void>;

    public async provideCodeLenses(document: TextDocument, token: CancellationToken): Promise<CodeLens[]> {
        const blocks: CodeLens[] = [];
        const lines: string[] = document.getText().split(Constants.LineSplitterRegex);
        const requestRanges: [number, number][] = Selector.getRequestRanges(lines);

        const environment = await EnvironmentController.getCurrentEnvironment();
        const title = `Environment: ${environment.label}`;

        for (const [blockStart, blockEnd] of requestRanges) {
            const range = new Range(blockStart, 0, blockEnd, 0);
            const cmd: Command = {
                arguments: [document, range],
                title: title,
                command: 'rest-client.switch-environment'
            };
            blocks.push(new CodeLens(range, cmd));
        }

        return Promise.resolve(blocks);
    }
}