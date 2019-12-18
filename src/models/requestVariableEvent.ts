import { TextDocument } from 'vscode';

export interface RequestVariableEvent {
    name: string;
    document: TextDocument;
}