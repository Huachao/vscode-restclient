import * as path from 'path';
import { TextDocument, window } from 'vscode';

export function getCurrentHttpFileName(): string | undefined {
    const document = getCurrentTextDocument();
    if (document) {
        const filePath = document.fileName;
        return path.basename(filePath, path.extname(filePath));
    }
}

export function getCurrentTextDocument(): TextDocument | undefined {
    return window.activeTextEditor?.document;
}