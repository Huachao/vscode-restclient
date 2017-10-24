"use strict";

import { window, workspace } from 'vscode';

export function getWorkspaceRootPath(): string {
    let editor = window.activeTextEditor;
    if (editor && editor.document) {
        let fileUri = window.activeTextEditor.document.uri;
        let workspaceFolder = workspace.getWorkspaceFolder(fileUri);
        if (workspaceFolder) {
            return workspaceFolder.uri.fsPath;
        }
    }
}