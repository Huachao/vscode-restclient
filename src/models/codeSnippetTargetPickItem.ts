"use strict";

import { QuickPickItem } from 'vscode';
import { CodeSnippetTarget } from './codeSnippetTarget';

export class CodeSnippetTargetQuickPickItem implements QuickPickItem {
    public label: string;
    public description: string;
    public detail: string;
    public rawTarget: CodeSnippetTarget;
}