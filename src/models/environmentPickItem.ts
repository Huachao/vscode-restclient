import { QuickPickItem } from 'vscode';

export class EnvironmentPickItem implements QuickPickItem {
    public constructor(public label: string, public name: string, public description?: string) {
    }
}