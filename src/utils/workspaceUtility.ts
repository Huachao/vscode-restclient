"use strict";

import * as path from 'path';
import { window, workspace } from 'vscode';

export function getWorkspaceRootPath(): string {
    let editor = window.activeTextEditor;
    if (editor && editor.document) {
        let fileUri = window.activeTextEditor.document.uri;
        let workspaceFolder = workspace.getWorkspaceFolder(fileUri);
        if (workspaceFolder) {
            return workspaceFolder.uri.toString();
        }
    }
}

export function getCurrentHttpFileName(): string {
    let editor = window.activeTextEditor;
    if (editor && editor.document) {
        let filePath = window.activeTextEditor.document.fileName;
        return path.basename(filePath, path.extname(filePath));
    }
}