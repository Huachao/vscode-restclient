import { Position, Range, TextDocument } from 'vscode';
import * as Constants from '../common/constants';
import { Selector } from './selector';

export class VariableUtility {
    private static readonly environmentOrFileVariableReferenceRegex = /\{{2}[^{}]+\}{2}/;

    private static readonly fileVariableDefinitionRegex = /@([^\s=]+)\s*=/;

    private static readonly requestVariableReferenceRegex = /\{{2}(\w+)\.(response|request)?(\.body(\..*?)?|\.headers(\.[\w-]+)?)?\}{2}/;

    private static readonly partialRequestVariableReferenceRegex = /\{{2}(\w+)\.(.*?)?\}{2}/;


    public static getEnvironmentOrFileVariableReferenceNameRange(document: TextDocument, position: Position): Range | undefined {
        const wordRange = document.getWordRangeAtPosition(position, this.environmentOrFileVariableReferenceRegex);
        if (!wordRange) {
            return undefined;
        }

        // Remove leading and trailing curly braces
        const start = wordRange.start.with({ character: wordRange.start.character + 2 });
        const end = wordRange.end.with({ character: wordRange.end.character - 2 });
        return wordRange.with(start, end);
    }

    public static getFileVariableDefinitionNameRange(document: TextDocument, position: Position): Range | undefined {
        const wordRange = document.getWordRangeAtPosition(position, this.fileVariableDefinitionRegex);
        if (!wordRange) {
            return undefined;
        }

        const fullName = document.getText(wordRange);
        const index = fullName.search(/[\s=]/);

        // Adjust the range from the character after @ until the whitespaces
        const start = wordRange.start.with({ character: wordRange.start.character + 1 });
        const end = wordRange.start.with({ character: wordRange.start.character + index });
        return wordRange.with(start, end);
    }

    public static getRequestVariableReferenceNameRange(document: TextDocument, position: Position): Range | undefined {
        const wordRange = document.getWordRangeAtPosition(position, this.requestVariableReferenceRegex);
        if (!wordRange) {
            return undefined;
        }

        const fullName = document.getText(wordRange);
        const index = fullName.search(/\./);

        // Adjust the range from the character after {{ until the dot
        const start = wordRange.start.with({ character: wordRange.start.character + 2 });
        const end = wordRange.start.with({ character: wordRange.start.character + index });
        return wordRange.with(start, end);
    }

    public static getRequestVariableReferencePathRange(document: TextDocument, position: Position): Range | undefined {
        const wordRange = document.getWordRangeAtPosition(position, this.requestVariableReferenceRegex);
        if (!wordRange) {
            return undefined;
        }

        // Remove leading and trailing curly braces
        const start = wordRange.start.with({ character: wordRange.start.character + 2 });
        const end = wordRange.end.with({ character: wordRange.end.character - 2 });
        return wordRange.with(start, end);
    }

    public static getPartialRequestVariableReferencePathRange(document: TextDocument, position: Position): Range | undefined {
        const wordRange = document.getWordRangeAtPosition(position, this.partialRequestVariableReferenceRegex);
        if (!wordRange) {
            return undefined;
        }

        // Remove leading and trailing curly braces
        const start = wordRange.start.with({ character: wordRange.start.character + 2 });
        const end = wordRange.end.with({ character: wordRange.end.character - 2 });
        return wordRange.with(start, end);
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
            if (Selector.isCommentLine(line) && !Selector.isRequestOption(line)) {
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
