"use strict";

import { QuickPickItem } from 'vscode';
import { CodeSnippetTarget } from './codeSnippetTarget'

export class CodeSnippetTargetQuickPickItem implements QuickPickItem {
    label: string;
    description: string;
    detail: string;
    rawTarget: CodeSnippetTarget;
}