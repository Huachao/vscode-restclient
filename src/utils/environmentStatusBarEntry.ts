import { languages, StatusBarAlignment, StatusBarItem, window } from 'vscode';
import { getCurrentTextDocument } from './workspaceUtility';

export class EnvironmentStatusEntry {
    private readonly environmentEntry: StatusBarItem;

    public constructor(environment: string) {
        this.environmentEntry = window.createStatusBarItem('environment', StatusBarAlignment.Right, 100);
        this.environmentEntry.command = 'rest-client.switch-environment';
        this.environmentEntry.text = environment;
        this.environmentEntry.tooltip = 'Switch REST Client Environment';
        this.environmentEntry.name = 'REST Client Environment';
        this.environmentEntry.show();

        window.onDidChangeActiveTextEditor(this.showHideStatusBar, this);
    }

    public dispose() {
        this.environmentEntry.dispose();
    }

    public update(environment: string) {
        this.environmentEntry.text = environment;
    }

    private showHideStatusBar() {
        const document = getCurrentTextDocument();
        if (document && languages.match(['http', 'plaintext'], document)) {
            this.environmentEntry.show();
        } else {
            this.environmentEntry.hide();
        }
    }
}