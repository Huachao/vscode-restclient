import { EOL } from 'os';
import { Position, Range, TextDocument, TextEditor, window } from 'vscode';
import * as Constants from '../common/constants';
import { fromString as ParseReqMetaKey, RequestMetadata } from '../models/requestMetadata';
import { SelectedRequest } from '../models/SelectedRequest';
import { VariableProcessor } from './variableProcessor';

export interface RequestRangeOptions {
    ignoreCommentLine?: boolean;
    ignoreEmptyLine?: boolean;
    ignoreFileVariableDefinitionLine?: boolean;
    ignoreResponseRange?: boolean;
}

interface PromptVariableDefinition {
    name: string;
    description?: string;
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
            if (editor.document.languageId === 'markdown') {
                selectedText = null;

                for (const r of Selector.getMarkdownRestSnippets(editor.document)) {
                    const snippetRange = new Range(r.start.line + 1, 0, r.end.line, 0);
                    if (snippetRange.contains(new Position(activeLine, 0))) {
                        selectedText = editor.document.getText(snippetRange);
                    }
                }
            } else {
                selectedText = this.getDelimitedText(editor.document.getText(), activeLine);
            }
        } else {
            selectedText = editor.document.getText(editor.selection);
        }

        if (selectedText === null) {
            return null;
        }

        // convert request text into lines
        const lines = selectedText.split(Constants.LineSplitterRegex);

        // parse request metadata
        const metadatas = this.parseReqMetadatas(lines);

        // process #@prompt comment metadata
        const promptVariablesDefinitions = this.parsePromptMetadataForVariableDefinitions(metadatas.get(RequestMetadata.Prompt));
        const promptVariables = await this.promptForInput(promptVariablesDefinitions);
        if (!promptVariables) {
            return null;
        }

        // parse actual request lines
        const rawLines = lines.filter((l) => !this.isCommentLine(l));
        const requestRange = this.getRequestRanges(rawLines)[0];
        if (!requestRange) {
            return null;
        }

        selectedText = rawLines.slice(requestRange[0], requestRange[1] + 1).join(EOL);

        // variables replacement
        selectedText = await VariableProcessor.processRawRequest(selectedText, promptVariables);

        return {
            text: selectedText,
            metadatas: metadatas,
        };
    }

    public static parseReqMetadatas(lines: string[]): Map<RequestMetadata, string | undefined> {
        const metadatas = new Map<RequestMetadata, string | undefined>();
        for (const line of lines) {
            if (this.isEmptyLine(line) || this.isFileVariableDefinitionLine(line)) {
                continue;
            }

            if (!this.isCommentLine(line)) {
                // find the first request line
                break;
            }

            // here must be a comment line
            const matched = line.match(Constants.RequestMetadataRegex);
            if (!matched) {
                continue;
            }

            const metaKey = matched[1];
            const metaValue = matched[2];
            const metadata = ParseReqMetaKey(metaKey);
            if (metadata) {
                if (metadata === RequestMetadata.Prompt) {
                    this.handlePromptMetadata(metadatas, line);
                } else {
                    metadatas.set(metadata, metaValue || undefined);
                }
            }
        }
        return metadatas;
    }

    public static getRequestRanges(lines: string[], options?: RequestRangeOptions): [number, number][] {
        options = {
            ignoreCommentLine: true,
            ignoreEmptyLine: true,
            ignoreFileVariableDefinitionLine: true,
            ignoreResponseRange: true,
            ...options,
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

                if (
                    (options.ignoreCommentLine && this.isCommentLine(startLine)) ||
                    (options.ignoreEmptyLine && this.isEmptyLine(startLine)) ||
                    (options.ignoreFileVariableDefinitionLine && this.isFileVariableDefinitionLine(startLine))
                ) {
                    start++;
                    continue;
                }

                const endLine = lines[end];
                if (
                    (options.ignoreCommentLine && this.isCommentLine(endLine)) ||
                    (options.ignoreEmptyLine && this.isEmptyLine(endLine))
                ) {
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

    public static getPrompVariableDefinition(text: string): PromptVariableDefinition | undefined {
        const matched = text.match(Constants.PromptCommentRegex);
        if (matched) {
            const name = matched[1];
            const description = matched[2];
            return { name, description };
        }
    }

    public static parsePromptMetadataForVariableDefinitions(text: string | undefined): PromptVariableDefinition[] {
        const varDefs: PromptVariableDefinition[] = [];
        const parsedDefs = JSON.parse(text || '[]');
        if (Array.isArray(parsedDefs)) {
            for (const parsedDef of parsedDefs) {
                varDefs.push({
                    name: parsedDef['name'],
                    description: parsedDef['description'],
                });
            }
        }

        return varDefs;
    }

    public static getDelimitedText(fullText: string, currentLine: number): string | null {
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
            .map(([index]) => +index);
    }

    public static *getMarkdownRestSnippets(document: TextDocument): Generator<Range> {
        const snippetStartRegx = new RegExp('^```(' + ['http', 'rest'].join('|') + ')$');
        const snippetEndRegx = /^\`\`\`$/;

        let snippetStart: number | null = null;
        for (let i = 0; i < document.lineCount; i++) {
            const lineText = document.lineAt(i).text;

            const matchEnd = lineText.match(snippetEndRegx);
            if (snippetStart !== null && matchEnd) {
                const snippetEnd = i;

                const range = new Range(snippetStart, 0, snippetEnd, 0);
                yield range;

                snippetStart = null;
            } else {
                const matchStart = lineText.match(snippetStartRegx);
                if (matchStart) {
                    snippetStart = i;
                }
            }
        }
    }

    private static handlePromptMetadata(metadatas: Map<RequestMetadata, string | undefined>, text: string) {
        const promptVarDef = this.getPrompVariableDefinition(text);
        if (promptVarDef) {
            const varDefs = this.parsePromptMetadataForVariableDefinitions(metadatas.get(RequestMetadata.Prompt));
            varDefs.push(promptVarDef);
            metadatas.set(RequestMetadata.Prompt, JSON.stringify(varDefs));
        }
    }

    private static async promptForInput(defs: PromptVariableDefinition[]): Promise<Map<string, string> | null> {
        const promptVariables = new Map<string, string>();
        for (const { name, description } of defs) {
            // In name resembles some kind of password prompt, enable password InputBox option
            const passwordPromptNames = ['password', 'Password', 'PASSWORD', 'passwd', 'Passwd', 'PASSWD', 'pass', 'Pass', 'PASS'];
            let password = false;
            if (passwordPromptNames.includes(name)) {
                password = true;
            }
            const value = await window.showInputBox({
                prompt: `Input value for "${name}"`,
                placeHolder: description,
                password: password,
            });
            if (value !== undefined) {
                promptVariables.set(name, value);
            } else {
                return null;
            }
        }
        return promptVariables;
    }
}
