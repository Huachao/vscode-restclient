import * as path from 'path';
import { TextDocument, window, workspace } from 'vscode';

export function getWorkspaceRootPath(): string | undefined {
    const document = getCurrentTextDocument();
    if (document) {
        const fileUri = document.uri;
        const workspaceFolder = workspace.getWorkspaceFolder(fileUri);
        if (workspaceFolder) {
            return workspaceFolder.uri.toString();
        }
    }
}

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