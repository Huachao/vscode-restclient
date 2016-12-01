"use strict";

import { QuickPickItem } from 'vscode';
import { CodeSnippetClient } from './codeSnippetClient';

export class CodeSnippetClientQuickPickItem implements QuickPickItem {
    label: string;
    description: string;
    detail: string;
    rawClient: CodeSnippetClient;
}