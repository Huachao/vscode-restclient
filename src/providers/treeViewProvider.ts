import * as path from 'path';
import * as vscode from 'vscode';

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

    getChildren(): Thenable<HttpClientItem[]> {
        return Promise.resolve(this.getDepsInPackageJson());
    }

    private getDepsInPackageJson(): Thenable<HttpClientItem[]> {
        return vscode.workspace.findFiles("**/*.http").then((values: vscode.Uri[]) => {
            return values.map((val: vscode.Uri) => {
                return new HttpClientItem(val);
            });
        });
    }

}

export class HttpClientItem extends vscode.TreeItem {

    constructor(
        public readonly uri: vscode.Uri
    ) {
        super(path.basename(uri.path), vscode.TreeItemCollapsibleState.None);
    }

    get tooltip(): string {
        return this.uri.path;
    }

    get description(): string {
        return `(${this.uri.fsPath})`;
    }

    get command(): vscode.Command {
        return {
            command: 'rest-client._openDocumentLink',
            title: 'open',
            arguments: [this.uri]
        };
    }

    iconPath = vscode.ThemeIcon.File;

    contextValue = 'request';


}