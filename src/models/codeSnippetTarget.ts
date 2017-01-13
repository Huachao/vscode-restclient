"use strict";

import { CodeSnippetClient } from './codeSnippetClient';

export class CodeSnippetTarget {
    public key: string;
    public title: string;
    public extname: string;
    public default: string;
    public clients: CodeSnippetClient[];
}