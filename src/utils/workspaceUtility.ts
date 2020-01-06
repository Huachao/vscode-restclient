import { TextDocument, window } from 'vscode';

export function getCurrentTextDocument(): TextDocument | undefined {
    return window.activeTextEditor?.document;
}
