"use strict";

import { CodeSnippetClient } from './codeSnippetClient';

export class CodeSnippetTarget {
    key: string;
    title: string;
    extname: string;
    default: string;
    clients: CodeSnippetClient[];
}