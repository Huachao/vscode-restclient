"use strict";

import { workspace } from 'vscode';

export interface IRestClientSettings {
    clearOutput: boolean;
    followRedirect: boolean;
    defaultUserAgent: string;
}

export class RestClientSettings implements IRestClientSettings {
    clearOutput: boolean;
    followRedirect: boolean;
    defaultUserAgent: string;

    constructor() {
        workspace.onDidChangeConfiguration(() => {
            this.initializeSettings();
        });

        this.initializeSettings();
    }

    private initializeSettings() {
        var restClientSettings = workspace.getConfiguration("rest-client");
        this.clearOutput = restClientSettings.get<boolean>("clearoutput", false);
        this.followRedirect = restClientSettings.get<boolean>("followredirect", true);
        this.defaultUserAgent = restClientSettings.get<string>("defaultuseragent", "vscode-restclient");
    }
}