"use strict";

import { TextEditor, Range } from 'vscode';
import { EOL } from 'os';
import * as Constants from './constants';

export class Selector {
    private static readonly responseStatusLineRegex = /^\s*HTTP\/[\d.]+/;

    public getSelectedText(editor: TextEditor, range: Range = null): string {
        if (!editor || !editor.document) {
            return null;
        }

        let selectedText: string;
        if (editor.selection.isEmpty) {
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

    public static getResponseVariableDefinitionName(line: string): string {
        const matched = line.match(Constants.ResponseVariableDefinitionRegex);
        return matched && matched.length >= 2 ? matched[1] : null;
    } 

    public static isCommentLine(line: string): boolean {
        return Constants.CommentIdentifiersRegex.test(line);
    }

    public static isEmptyLine(line: string): boolean {
        return line.trim() === '';
    }

    public static isVariableDefinitionLine(line: string): boolean {
        return Constants.VariableDefinitionRegex.test(line);
    }

    public static isResponseStatusLine(line: string): boolean {
        return Selector.responseStatusLineRegex.test(line);
    }

    private getDelimitedText(fullText: string, currentLine: number): string {
        let lines: string[] = fullText.split(/\r?\n/g);
        let delimiterLineNumbers: number[] = Selector.getDelimiterRows(lines);
        if (delimiterLineNumbers.length === 0) {
            return fullText;
        }

        // return null if cursor is in delimiter line
        if (delimiterLineNumbers.indexOf(currentLine) > -1) {
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