'use strict';

import * as fs from 'fs-extra';
import * as path from 'path';
import * as url from 'url';
import { CancellationToken, DocumentLink, DocumentLinkProvider, Position, Range, TextDocument, Uri } from 'vscode';
import * as Constants from '../common/constants';
import { getWorkspaceRootPath } from '../utils/workspaceUtility';

export class RequestBodyDocumentLinkProvider implements DocumentLinkProvider {

    private _linkPattern = /^(\<\s+)(.+)(\s*)$/g;

    public provideDocumentLinks(document: TextDocument, _token: CancellationToken): DocumentLink[] {
        const results: DocumentLink[] = [];
        const base = path.dirname(document.uri.toString());
        const text = document.getText();

        let lines: string[] = text.split(Constants.LineSplitterRegex);
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
        let resourcePath: Uri;
        if (path.isAbsolute(link)) {
            resourcePath = Uri.file(link);
        } else {
            let rootPath = getWorkspaceRootPath();
            if (rootPath) {
                rootPath = rootPath.replace(/\/?$/, '/');
                let resourcePathString = url.resolve(rootPath, link);
                if (!fs.existsSync(resourcePathString)) {
                    base = base.replace(/\/?$/, '/');
                    resourcePathString = url.resolve(base, link);
                }

                resourcePath = Uri.parse(resourcePathString);
            } else {
                base = base.replace(/\/?$/, '/');
                resourcePath = Uri.parse(url.resolve(base, link));
            }
        }

        return Uri.parse(`command:rest-client._openDocumentLink?${encodeURIComponent(JSON.stringify({ path: resourcePath }))}`);
    }
}
