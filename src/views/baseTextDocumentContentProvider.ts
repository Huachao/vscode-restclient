"use strict";

import { TextDocumentContentProvider, EventEmitter, Event, Uri } from 'vscode';

export abstract class BaseTextDocumentContentProvider implements TextDocumentContentProvider {
    private _onDidChange = new EventEmitter<Uri>();

    get onDidChange(): Event<Uri> {
        return this._onDidChange.event;
    }

    public abstract provideTextDocumentContent(uri: Uri): Thenable<string> | string;

    public update(uri: Uri) {
        this._onDidChange.fire(uri);
    }
}