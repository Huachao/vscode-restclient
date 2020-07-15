import * as vscode from 'vscode';
import { TreeItemCollapsibleState } from 'vscode';
import { SelectedRequest, Selector } from '../utils/selector';

export class HttpTreeProvider implements vscode.TreeDataProvider<HttpClientItem> {

    private _onDidChangeTreeData: vscode.EventEmitter<HttpClientItem | undefined> = new vscode.EventEmitter<HttpClientItem | undefined>();
    readonly onDidChangeTreeData: vscode.Event<HttpClientItem | undefined> = this._onDidChangeTreeData.event;

    constructor() {
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: HttpClientItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: HttpClientItem): Thenable<HttpClientItem[]> {
        return Promise.resolve(this.getHttpClientItems(element));
    }

    private getHttpClientItems(element): Thenable<HttpClientItem[]> {
        if (element) {
            return new Promise((resolve) => {
                vscode.workspace.openTextDocument(element.uri).then(async (document: vscode.TextDocument) => {
                    const selectedRequests = await Selector.getAllRequests(document);
                    if (selectedRequests) {
                        const clients = selectedRequests.map(selectedRequest => {
                            return HttpClientItem.createRequestItem(document, element.uri, selectedRequest, selectedRequest.name);
                        });
                        resolve(clients);
                    }
                });
            });
        } else {
            return vscode.workspace.findFiles("**/*.http").then(async (values: vscode.Uri[]) => {
                return await values.map((uri: vscode.Uri) => {
                    return HttpClientItem.createFileItem(uri);
                });
            });
        }
    }
}

export class HttpClientItem extends vscode.TreeItem {
    selectedRequest: SelectedRequest;
    document: vscode.TextDocument;

    private constructor(public readonly uri: vscode.Uri) {
        super(uri);
    }

    public static createFileItem(uri: vscode.Uri): HttpClientItem {
        const item = new HttpClientItem(uri);
        item.collapsibleState = TreeItemCollapsibleState.Collapsed;
        item.contextValue = "file";
        item.command = {
            command: 'rest-client._openDocumentLink',
            title: 'open',
            arguments: [item.uri]
        };
        return item;
    }

    public static createRequestItem(document: vscode.TextDocument, uri: vscode.Uri, selectedRequest: SelectedRequest, label?: string): HttpClientItem {
        const item = new HttpClientItem(uri);
        item.collapsibleState = TreeItemCollapsibleState.None;
        if (label) { item.label = label; }
        item.contextValue = "request";
        item.command = {
            command: 'rest-client._openDocumentLink',
            title: 'open',
            arguments: [item.uri]
        };
        item.document = document;
        item.selectedRequest = selectedRequest;
        return item;
    }
}