'use strict';

import { TextDocument, Position } from 'vscode';

export class VariableUtility {
    public static isVariableDefinition(document: TextDocument, position: Position): boolean {
        let wordRange = document.getWordRangeAtPosition(position);
        let lineRange = document.lineAt(position);
        if (!wordRange
            || wordRange.start.character < 1
            || lineRange.text[wordRange.start.character - 1] !== '@') {
            // not a custom variable definition syntax
            return false;
        }

        return true;
    }

    public static isVariableReference(document: TextDocument, position: Position): boolean {
        let wordRange = document.getWordRangeAtPosition(position);
        let lineRange = document.lineAt(position);
        if (!wordRange
            || wordRange.start.character < 2
            || wordRange.end.character > lineRange.range.end.character - 1
            || lineRange.text[wordRange.start.character - 1] !== '{'
            || lineRange.text[wordRange.start.character - 2] !== '{'
            || lineRange.text[wordRange.end.character] !== '}'
            || lineRange.text[wordRange.end.character + 1] !== '}') {
            // not a custom variable reference syntax
            return false;
        }

        return true;
    }
}
