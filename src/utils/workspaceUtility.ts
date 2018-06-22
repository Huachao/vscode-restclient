"use strict";

import * as path from 'path';
import { TextDocument, window, workspace } from 'vscode';

export function getWorkspaceRootPath(): string {
    const document = getCurrentTextDocument();
    if (document) {
        let fileUri = document.uri;
        let workspaceFolder = workspace.getWorkspaceFolder(fileUri);
        if (workspaceFolder) {
            return workspaceFolder.uri.toString();
        }
    }
}

export function getCurrentHttpFileName(): string {
    const document = getCurrentTextDocument();
    if (document) {
        let filePath = document.fileName;
        return path.basename(filePath, path.extname(filePath));
    }
}

export function getCurrentTextDocument(): TextDocument {
    const editor = window.activeTextEditor;
    return editor && editor.document;
}