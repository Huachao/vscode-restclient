import { QuickPickItem } from 'vscode';

export interface EnvironmentPickItem extends QuickPickItem {
    name: string;
}