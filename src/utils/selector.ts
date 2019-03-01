"use strict";

import { EOL } from 'os';
import { Range, TextEditor } from 'vscode';
import * as Constants from '../common/constants';

export class Selector {
    private static readonly responseStatusLineRegex = /^\s*HTTP\/[\d.]+/;

    public getSelectedText(editor: TextEditor, range: Range = null): string {
        if (!editor || !editor.document) {
            return null;
        }

        let selectedText: string;
        if (editor.selection.isEmpty || range) {
            let activeLine = !range ? editor.selection.active.line : range.start.line;
            selectedText = this.getDelimitedText(editor.document.getText(), activeLine);
        } else {
            selectedText = editor.document.getText(editor.selection);
        }

        return selectedText;
    }

    public static getDelimiterRows(lines: string[]) {
        let rows: number[] = [];
        for (let index = 0; index < lines.length; index++) {
            if (lines[index].match(/^#{3,}/)) {
                rows.push(index);
            }
        }
        return rows;
    }

    public static getRequestVariableDefinitionName(text: string): string {
        const matched = text.match(Constants.RequestVariableDefinitionRegex);
        return matched && matched[1];
    }

    public static isCommentLine(line: string): boolean {
        return Constants.CommentIdentifiersRegex.test(line);
    }

    public static isEmptyLine(line: string): boolean {
        return line.trim() === '';
    }

    public static isVariableDefinitionLine(line: string): boolean {
        return Constants.FileVariableDefinitionRegex.test(line);
    }

    public static isResponseStatusLine(line: string): boolean {
        return Selector.responseStatusLineRegex.test(line);
    }

    private getDelimitedText(fullText: string, currentLine: number): string {
        let lines: string[] = fullText.split(Constants.LineSplitterRegex);
        let delimiterLineNumbers: number[] = Selector.getDelimiterRows(lines);
        if (delimiterLineNumbers.length === 0) {
            return fullText;
        }

        // return null if cursor is in delimiter line
        if (delimiterLineNumbers.includes(currentLine)) {
            return null;
        }

        if (currentLine < delimiterLineNumbers[0]) {
            return lines.slice(0, delimiterLineNumbers[0]).join(EOL);
        }

        if (currentLine > delimiterLineNumbers[delimiterLineNumbers.length - 1]) {
            return lines.slice(delimiterLineNumbers[delimiterLineNumbers.length - 1] + 1).join(EOL);
        }

        for (let index = 0; index < delimiterLineNumbers.length - 1; index++) {
            let start = delimiterLineNumbers[index];
            let end = delimiterLineNumbers[index + 1];
            if (start < currentLine && currentLine < end) {
                return lines.slice(start + 1, end).join(EOL);
            }
        }
    }
}