'use strict';

import { Position, Range, TextDocument, TextLine } from 'vscode';
import * as Constants from './constants';

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
        return VariableUtility.isVariableReferenceFromLine(wordRange, lineRange);
    }

    public static isRequestVariableReference(document: TextDocument, position: Position): boolean {
        let wordRange = document.getWordRangeAtPosition(position, /\{\{(\w+)\.(response|request)?(\.body(\..*?)?|\.headers(\.[\w-]+)?)?\}\}/);
        return wordRange && !wordRange.isEmpty;
    }

    public static isPartialRequestVariableReference(document: TextDocument, position: Position): boolean {
        let wordRange = document.getWordRangeAtPosition(position, /\{\{(\w+)\.(.*?)?\}\}/);
        return wordRange && !wordRange.isEmpty;
    }

    private static isVariableReferenceFromLine(wordRange: Range, lineRange: TextLine) {
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

    public static getDefinitionRanges(lines: string[], variable: string): Range[] {
        let locations: Range[] = [];
        for (const [index, line] of lines.entries()) {
            let match: RegExpExecArray;
            if ((match = Constants.VariableDefinitionRegex.exec(line)) && match[1] === variable) {
                let startPos = line.indexOf(`@${variable}`);
                let endPos = startPos + variable.length + 1;
                locations.push(new Range(index, startPos, index, endPos));
            }
        }
        return locations;
    }

    public static getReferenceRanges(lines: string[], variable: string): Range[] {
        const locations: Range[] = [];
        const regex = new RegExp(`\{\{${variable}\}\}`, 'g');
        for (const [index, line] of lines.entries()) {
            if (Constants.CommentIdentifiersRegex.test(line)) {
                continue;
            }

            regex.lastIndex = 0;

            let match: RegExpExecArray;
            while (match = regex.exec(line)) {
                let startPos = match.index + 2;
                let endPos = startPos + variable.length;
                locations.push(new Range(index, startPos, index, endPos));
                regex.lastIndex = match.index + 1;
            }
        }
        return locations;
    }
}
