import { EOL } from 'os';
import { Range, TextEditor } from 'vscode';
import { ArrayUtility } from '../common/arrayUtility';
import * as Constants from '../common/constants';
import { VariableProcessor } from './variableProcessor';

export interface RequestRangeOptions {
    ignoreCommentLine?: boolean;
    ignoreEmptyLine?: boolean;
    ignoreFileVariableDefinitionLine?: boolean;
    ignoreResponseRange?: boolean;
}

export interface SelectedRequest {
    text: string;
    name?: string;
}

export class Selector {
    private static readonly responseStatusLineRegex = /^\s*HTTP\/[\d.]+/;

    public static async getRequest(editor: TextEditor, range: Range | null = null): Promise<SelectedRequest | null> {
        if (!editor || !editor.document) {
            return null;
        }

        let selectedText: string | null;
        if (editor.selection.isEmpty || range) {
            const activeLine = !range ? editor.selection.active.line : range.start.line;
            selectedText = Selector.getDelimitedText(editor.document.getText(), activeLine);
        } else {
            selectedText = editor.document.getText(editor.selection);
        }

        if (selectedText === null) {
            return null;
        }

        // parse request variable definition name
        const requestVariable = Selector.getRequestVariableDefinitionName(selectedText);

        // remove comment lines
        let lines: string[] = selectedText.split(Constants.LineSplitterRegex).filter(l => !Selector.isCommentLine(l));

        // remove file variables definition lines and leading empty lines
        lines = ArrayUtility.skipWhile(lines, l => Selector.isFileVariableDefinitionLine(l) || Selector.isEmptyLine(l));

        if (lines.length === 0) {
            return null;
        }

        // variables replacement
        selectedText = await VariableProcessor.processRawRequest(lines.join(EOL));

        return {
            text: selectedText,
            name: requestVariable
        };
    }

    public static getRequestRanges(lines: string[], options?: RequestRangeOptions): [number, number][] {
        options = {
                ignoreCommentLine: true,
                ignoreEmptyLine: true,
                ignoreFileVariableDefinitionLine: true,
                ignoreResponseRange: true,
            ...options};
        const requestRanges: [number, number][] = [];
        const delimitedLines = Selector.getDelimiterRows(lines);
        delimitedLines.push(lines.length);

        let prev = -1;
        for (const current of delimitedLines) {
            let start = prev + 1;
            let end = current - 1;
            while (start <= end) {
                const startLine = lines[start];
                if (options.ignoreResponseRange && Selector.isResponseStatusLine(startLine)) {
                    break;
                }

                if (options.ignoreCommentLine && Selector.isCommentLine(startLine)
                    || options.ignoreEmptyLine && Selector.isEmptyLine(startLine)
                    || options.ignoreFileVariableDefinitionLine && Selector.isFileVariableDefinitionLine(startLine)) {
                    start++;
                    continue;
                }

                const endLine = lines[end];
                if (options.ignoreCommentLine && Selector.isCommentLine(endLine)
                    || options.ignoreEmptyLine && Selector.isEmptyLine(endLine)) {
                    end--;
                    continue;
                }

                requestRanges.push([start, end]);
                break;
            }
            prev = current;
        }

        return requestRanges;
    }

    public static isCommentLine(line: string): boolean {
        return Constants.CommentIdentifiersRegex.test(line);
    }

    public static isEmptyLine(line: string): boolean {
        return line.trim() === '';
    }

    public static isRequestVariableDefinitionLine(line: string): boolean {
        return Constants.RequestVariableDefinitionRegex.test(line);
    }

    public static isFileVariableDefinitionLine(line: string): boolean {
        return Constants.FileVariableDefinitionRegex.test(line);
    }

    public static isResponseStatusLine(line: string): boolean {
        return Selector.responseStatusLineRegex.test(line);
    }

    public static getRequestVariableDefinitionName(text: string): string | undefined {
        const matched = text.match(Constants.RequestVariableDefinitionRegex);
        return matched?.[1];
    }

    private static getDelimitedText(fullText: string, currentLine: number): string | null {
        const lines: string[] = fullText.split(Constants.LineSplitterRegex);
        const delimiterLineNumbers: number[] = Selector.getDelimiterRows(lines);
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
            const start = delimiterLineNumbers[index];
            const end = delimiterLineNumbers[index + 1];
            if (start < currentLine && currentLine < end) {
                return lines.slice(start + 1, end).join(EOL);
            }
        }

        return null;
    }

    private static getDelimiterRows(lines: string[]): number[] {
        const rows: number[] = [];
        for (let index = 0; index < lines.length; index++) {
            if (lines[index].match(/^#{3,}/)) {
                rows.push(index);
            }
        }
        return rows;
    }
}