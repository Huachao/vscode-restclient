'use strict';

import { DocumentLink, DocumentLinkProvider, TextDocument, Range, Position, Uri, workspace, CancellationToken } from 'vscode';
import * as path from 'path';

export class RequestBodyDocumentLinkProvider implements DocumentLinkProvider {

    private _linkPattern = /^(\<\s+)(\S+)(\s*)$/g;

    public provideDocumentLinks(document: TextDocument, _token: CancellationToken): DocumentLink[] {
        const results: DocumentLink[] = [];
        const base = path.dirname(document.uri.fsPath);
        const text = document.getText();

        let lines: string[] = text.split(/\r?\n/g);
        for (var index = 0; index < lines.length; index++) {
            var line = lines[index];
            let match: RegExpMatchArray | null;
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
        const uri = Uri.parse(link);
        if (uri.scheme) {
            return uri;
        }

        // assume it must be a file
        let resourcePath;
        if (!uri.path) {
            resourcePath = document.uri.path;
        } else if (uri.path[0] === '/') {
            resourcePath = path.join(workspace.rootPath || '', uri.path);
        } else {
            resourcePath = path.join(base, uri.path);
        }

        return Uri.parse(`command:rest-client._openDocumentLink?${encodeURIComponent(JSON.stringify({ fragment: uri.fragment, path: resourcePath }))}`);
    }
}
