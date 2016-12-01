"use strict";

import { QuickPickItem } from 'vscode';
import { HttpRequest } from '../models/httpRequest';

export class HistoryQuickPickItem implements QuickPickItem {
    label: string;
    description: string;
    detail: string;
    rawRequest: HttpRequest;
}