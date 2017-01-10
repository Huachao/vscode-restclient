"use strict";

import { QuickPickItem } from 'vscode';

export class EnvironmentPickItem implements QuickPickItem {
    constructor(public label: string, public name: string, public description: string = null) {
    }
}