"use strict";

import { QuickPickItem } from 'vscode';
import { CodeSnippetClient } from './codeSnippetClient';

export class CodeSnippetClientQuickPickItem implements QuickPickItem {
    public label: string;
    public description: string;
    public detail: string;
    public rawClient: CodeSnippetClient;
}