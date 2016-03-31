"use strict";

import { workspace } from 'vscode';

export interface IRestClientSettings {
    clearOutput: boolean;
}

export class RestClientSettings implements IRestClientSettings {
    clearOutput: boolean;

    constructor() {
        workspace.onDidChangeConfiguration(() => {
            this.initializeSettings();
        });

        this.initializeSettings();
    }

    private initializeSettings() {
        var restClientSettings = workspace.getConfiguration("rest-client");
        this.clearOutput = restClientSettings.get<boolean>("clearoutput", false);
    }
}