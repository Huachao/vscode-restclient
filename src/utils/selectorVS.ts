import { Range, TextEditor } from 'vscode';
import { Selector } from './selector';

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

export class SelectorVS {
    public static async getRequest(editor: TextEditor, range: Range | null = null): Promise<SelectedRequest | null> {
        const selectedText = SelectorVS.getCurrentText(editor, range);

        if (selectedText === null) {
            return null;
        }

        return Selector.getRequestFromText(selectedText);
    }

    public static getCurrentText(editor: TextEditor, range: Range | null): string | null {
        if (!editor.document) {
            return null;
        }

        let selectedText: string | null;
        if (editor.selection.isEmpty || range) {
            const activeLine = !range ? editor.selection.active.line : range.start.line;
            selectedText = Selector.getDelimitedText(editor.document.getText(), activeLine);
        } else {
            selectedText = editor.document.getText(editor.selection);
        }
        return selectedText;
    }
}