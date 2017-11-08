'use strict';

import { DocumentLink, DocumentLinkProvider, TextDocument, Range, Position, Uri, CancellationToken } from 'vscode';
import { getWorkspaceRootPath } from './workspaceUtility';
import * as path from 'path';
import * as fs from 'fs';

export class RequestBodyDocumentLinkProvider implements DocumentLinkProvider {

    private _linkPattern = /^(\<\s+)(\S+)(\s*)$/g;

    public provideDocumentLinks(document: TextDocument, _token: CancellationToken): DocumentLink[] {
        const results: DocumentLink[] = [];
        const base = path.dirname(document.uri.fsPath);
        const text = document.getText();

        let lines: string[] = text.split(/\r?\n/g);
        for (let index = 0; index < lines.length; index++) {
            let line = lines[index];
            let match: RegExpMatchArray;
            if (match = this._linkPattern.exec(line)) {
                let filePath = match[2];
                const offset = match[1].length;
                const linkStart = new Position(index, offset);
                const linkEnd = new Position(index, offset + filePath.length);
                results.push(new DocumentLink(
                    new Range(linkStart, linkEnd),
                    this.normalizeLink(document, filePath, base)
                ));
            }
        }

        return results;
    }

    private normalizeLink(document: TextDocument, link: string, base: string): Uri {
        let resourcePath;
        if (path.isAbsolute(link)) {
            resourcePath = link;
        } else {
            let rootPath = getWorkspaceRootPath();
            if (rootPath) {
                resourcePath = path.join(rootPath, link);
                if (!fs.existsSync(resourcePath)) {
                    resourcePath = path.join(base, link);
                }
            } else {
                resourcePath = path.join(base, link);
            }
        }

        return Uri.parse(`command:rest-client._openDocumentLink?${encodeURIComponent(JSON.stringify({ path: resourcePath }))}`);
    }
}
