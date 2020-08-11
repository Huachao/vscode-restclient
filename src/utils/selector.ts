import { EOL } from 'os';
import { Position, Range, TextDocument, TextEditor } from 'vscode';
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
    warnBeforeSend: boolean;
}

export interface SelectedRange {
    range: Range;
    name: string;
}

export class Selector {
    private static readonly responseStatusLineRegex = /^\s*HTTP\/[\d.]+/;

    public static getAllRequests(document: TextDocument): SelectedRange[] | null {

        const selectedText = document.getText();

        // parse actual request lines
        const rawLines = selectedText.split(Constants.LineSplitterRegex);
        const requestRanges = this.getRequestRanges(rawLines);
        if (!requestRanges) {
            return null;
        }

        const resRanges: SelectedRange[] = [];

        for (const requestRange of requestRanges) {
            const start: Position = new Position(requestRange[0], 0);
            const end: Position = new Position(requestRange[1] + 1, 0);
            const range: Range = new Range(start, end);

            const rangeText = document.getText(range);
            const rawRangeText = rangeText.split(Constants.LineSplitterRegex).filter(l => !this.isCommentLine(l));
            const requestVariable = this.getRequestVariableDefinitionName(rangeText);
            const name = requestVariable ? requestVariable : rawRangeText[0];

            resRanges.push({ range: range, name: name });
        }
        return resRanges;
    }

    public static async getRequest(editor: TextEditor, range: Range | null = null): Promise<SelectedRequest | null> {
        if (!editor.document) {
            return null;
        }

        let selectedText: string | null;
        if (editor.selection.isEmpty || range) {
            const activeLine = range?.start.line ?? editor.selection.active.line;
            selectedText = this.getDelimitedText(editor.document.getText(), activeLine);
        } else {
            selectedText = editor.document.getText(editor.selection);
        }

        return this.createRequest(selectedText);
    }

    public static async createRequest(selectedText: string | null): Promise<SelectedRequest | null> {
        if (selectedText === null) {
            return null;
        }

        // parse request variable definition name
        const requestVariable = this.getRequestVariableDefinitionName(selectedText);

        // parse #@note comment
        const warnBeforeSend = this.hasNoteComment(selectedText);

        // parse actual request lines
        const rawLines = selectedText.split(Constants.LineSplitterRegex).filter(l => !this.isCommentLine(l));
        const requestRange = this.getRequestRanges(rawLines)[0];
        if (!requestRange) {
            return null;
        }

        selectedText = rawLines.slice(requestRange[0], requestRange[1] + 1).join(EOL);

        // variables replacement
        selectedText = await VariableProcessor.processRawRequest(selectedText);

        return {
            text: selectedText,
            name: requestVariable ? requestVariable : rawLines[0],
            warnBeforeSend
        };
    }


    public static getRequestRanges(lines: string[], options?: RequestRangeOptions): [number, number][] {
        options = {
            ignoreCommentLine: true,
            ignoreEmptyLine: true,
            ignoreFileVariableDefinitionLine: true,
            ignoreResponseRange: true,
            ...options
        };
        const requestRanges: [number, number][] = [];
        const delimitedLines = this.getDelimiterRows(lines);
        delimitedLines.push(lines.length);

        let prev = -1;
        for (const current of delimitedLines) {
            let start = prev + 1;
            let end = current - 1;
            while (start <= end) {
                const startLine = lines[start];
                if (options.ignoreResponseRange && this.isResponseStatusLine(startLine)) {
                    break;
                }

                if (options.ignoreCommentLine && this.isCommentLine(startLine)
                    || options.ignoreEmptyLine && this.isEmptyLine(startLine)
                    || options.ignoreFileVariableDefinitionLine && this.isFileVariableDefinitionLine(startLine)) {
                    start++;
                    continue;
                }

                const endLine = lines[end];
                if (options.ignoreCommentLine && this.isCommentLine(endLine)
                    || options.ignoreEmptyLine && this.isEmptyLine(endLine)) {
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
        return this.responseStatusLineRegex.test(line);
    }

    public static getRequestVariableDefinitionName(text: string): string | undefined {
        const matched = text.match(Constants.RequestVariableDefinitionRegex);
        return matched?.[1];
    }

    public static hasNoteComment(text: string): boolean {
        return Constants.NoteCommentRegex.test(text);
    }

    private static getDelimitedText(fullText: string, currentLine: number): string | null {
        const lines: string[] = fullText.split(Constants.LineSplitterRegex);
        const delimiterLineNumbers: number[] = this.getDelimiterRows(lines);
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
        return Object.entries(lines)
            .filter(([, value]) => /^#{3,}/.test(value))
            .map(([index, ]) => +index);
    }
}