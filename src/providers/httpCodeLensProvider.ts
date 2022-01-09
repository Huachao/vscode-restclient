import { CancellationToken, CodeLens, CodeLensProvider, Command, Range, TextDocument } from 'vscode';
import * as Constants from '../common/constants';
import { EnvironmentController } from '../controllers/environmentController';
import { Selector } from '../utils/selector';

export class HttpCodeLensProvider implements CodeLensProvider {
    public async provideCodeLenses(document: TextDocument, token: CancellationToken): Promise<CodeLens[]> {
        const blocks: CodeLens[] = [];
        const lines: string[] = document.getText().split(Constants.LineSplitterRegex);
        const requestRanges: [number, number][] = Selector.getRequestRanges(lines);

        for (const [blockStart, blockEnd] of requestRanges) {
            const range = new Range(blockStart, 0, blockEnd, 0);
            const userEnvironments: any[] = await EnvironmentController.getAllEnvironment()
            if (userEnvironments.length > 0) {
                for (let i = 0; i < userEnvironments.length; i++) {
                    const element = userEnvironments[i];
                    const cmd: Command = {
                        arguments: [document, range, element.name],
                        title: `${element.name}`,
                        command: 'rest-client.request'
                    };
                    blocks.push(new CodeLens(range, cmd));
                }
            }
            else {
                const cmd: Command = {
                    arguments: [document, range],
                    title: 'Send Request',
                    command: 'rest-client.request'
                };
                blocks.push(new CodeLens(range, cmd));
            }
        }

        return Promise.resolve(blocks);
    }
}