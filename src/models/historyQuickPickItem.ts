"use strict";

import { QuickPickItem } from 'vscode';
import { SerializedHttpRequest } from './httpRequest';

export class HistoryQuickPickItem implements QuickPickItem {
    public label: string;
    public description: string;
    public detail: string;
    public rawRequest: SerializedHttpRequest;
}