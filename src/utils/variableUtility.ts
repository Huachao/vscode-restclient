import { Position, Range, TextDocument, TextLine } from 'vscode';
import * as Constants from '../common/constants';
import { Selector } from './selector';

export class VariableUtility {
    public static isFileVariableDefinition(document: TextDocument, position: Position): boolean {
        const wordRange = document.getWordRangeAtPosition(position);
        const lineRange = document.lineAt(position);
        if (!wordRange
            || wordRange.start.character < 1
            || lineRange.text[wordRange.start.character - 1] !== '@') {
            // not a custom variable definition syntax
            return false;
        }

        return true;
    }

    public static isEnvironmentOrFileVariableReference(document: TextDocument, position: Position): boolean {
        const wordRange = document.getWordRangeAtPosition(position);
        if (wordRange === undefined) {
            return false;
        }
        const lineRange = document.lineAt(position);
        return VariableUtility.isVariableReferenceFromLine(wordRange, lineRange);
    }

    public static isRequestVariableReference(document: TextDocument, position: Position): boolean {
        const wordRange = document.getWordRangeAtPosition(position, /\{\{(\w+)\.(response|request)?(\.body(\..*?)?|\.headers(\.[\w-]+)?)?\}\}/);
        return wordRange ? !wordRange.isEmpty : false;
    }

    public static isPartialRequestVariableReference(document: TextDocument, position: Position): boolean {
        const wordRange = document.getWordRangeAtPosition(position, /\{\{(\w+)\.(.*?)?\}\}/);
        return wordRange ? !wordRange.isEmpty : false;
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

    public static getFileVariableDefinitionRanges(lines: string[], variable: string): Range[] {
        const locations: Range[] = [];
        for (const [index, line] of lines.entries()) {
            let match: RegExpExecArray | null;
            if ((match = Constants.FileVariableDefinitionRegex.exec(line)) && match[1] === variable) {
                const startPos = line.indexOf(`@${variable}`);
                const endPos = startPos + variable.length + 1;
                locations.push(new Range(index, startPos, index, endPos));
            }
        }
        return locations;
    }

    public static getRequestVariableDefinitionRanges(lines: string[], variable: string): Range[] {
        const locations: Range[] = [];
        for (const [index, line] of lines.entries()) {
            let match: RegExpExecArray | null;
            if ((match = Constants.RequestVariableDefinitionRegex.exec(line)) && match[1] === variable) {
                const startPos = line.indexOf(`${variable}`);
                const endPos = startPos + variable.length + 1;
                locations.push(new Range(index, startPos, index, endPos));
            }
        }
        return locations;
    }

    public static getFileVariableReferenceRanges(lines: string[], variable: string): Range[] {
        const locations: Range[] = [];
        const regex = new RegExp(`{{${variable}}}`, 'g');
        for (const [index, line] of lines.entries()) {
            if (Selector.isCommentLine(line)) {
                continue;
            }

            regex.lastIndex = 0;

            let match: RegExpExecArray | null;
            while (match = regex.exec(line)) {
                const startPos = match.index + 2;
                const endPos = startPos + variable.length;
                locations.push(new Range(index, startPos, index, endPos));
                regex.lastIndex = match.index + 1;
            }
        }
        return locations;
    }
}
