import { EOL } from 'os';
import { Range, TextEditor } from 'vscode';
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

export class Selector {
    private static readonly responseStatusLineRegex = /^\s*HTTP\/[\d.]+/;

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
            name: requestVariable,
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
            .map(([index,]) => +index);
    }

    private static getSharpRows(lines: string[], sharps: number): number[] {
        if (sharps === 1) {
            return Object.entries(lines)
                .filter(([, value]) => value.startsWith("# "))
                .map(([index,]) => +index);
        }
        else if (sharps === 2) {
            return Object.entries(lines)
                .filter(([, value]) => value.startsWith("## "))
                .map(([index,]) => +index);
        }
        else if (sharps === 3) {
            return Object.entries(lines)
                .filter(([, value]) => value.startsWith("### "))
                .map(([index,]) => +index);
        }
        else if (sharps === 4) {
            return Object.entries(lines)
                .filter(([, value]) => value.startsWith("#### "))
                .map(([index,]) => +index);
        }
        else if (sharps === 5) {
            return Object.entries(lines)
                .filter(([, value]) => value.startsWith("##### "))
                .map(([index,]) => +index);
        }
        else if (sharps === 6) {
            return Object.entries(lines)
                .filter(([, value]) => /^#{6,}/.test(value))
                .map(([index,]) => +index);
        }
        else if (sharps === 7) {
            return Object.entries(lines)
                .filter(([, value]) => /^#{7,}/.test(value))
                .map(([index,]) => +index);
        }
        else {
            return Object.entries(lines)
                .filter(([, value]) => value.startsWith("#"))
                .map(([index,]) => +index);
        }
    }


    public static getSharpRanges(lines: string[], sharps: number, options?: RequestRangeOptions): number[] {
        options = {
            ignoreCommentLine: true,
            ignoreEmptyLine: true,
            ignoreFileVariableDefinitionLine: true,
            ignoreResponseRange: true,
            ...options
        };
        const sharpLines = this.getSharpRows(lines, sharps);
        // sharpLines.push(lines.length);

        return sharpLines;
    }

    public static getAllSharpRanges(lines: string[], options?: RequestRangeOptions): number[] {
        options = {
            ignoreCommentLine: true,
            ignoreEmptyLine: true,
            ignoreFileVariableDefinitionLine: true,
            ignoreResponseRange: true,
            ...options
        };
        const sharpLines = Object.entries(lines)
            .filter(([, value]) => value.startsWith("#"))
            .map(([index,]) => +index);

        return sharpLines;
    }
}