// tslint:disable: ordered-imports

import { IAuthProcessor } from '../IAuthProcessor';
import { HttpRequest } from '../../models/httpRequest';

import { AuthConfig } from 'node-sp-auth-config';
import * as spauth from 'node-sp-auth';
import * as path from 'path';
import * as url from 'url';
import { workspace, window } from 'vscode';

export class SharePointAuthProcessor implements IAuthProcessor {

    constructor(private request: HttpRequest, private authPath: string) { }

    public async process(options: any): Promise<any> {

        let workspacePath = this.getWorkspaceRootPath();
        let configPath;

        if (path.isAbsolute(this.authPath)) {
            configPath = this.authPath;
        } else {
            configPath = path.join(workspacePath, this.authPath);
        }

        const authConfig = new AuthConfig({
            configPath: configPath,
            headlessMode: true
        });

        let ctx = await authConfig.getContext();

        let requestUrl = this.request.url;
        let siteUrlParts = url.parse(ctx.siteUrl);
        let siteUrlRoot = `${siteUrlParts.protocol}//${siteUrlParts.host}`;

        // return original options if request url doesn't match sharepoint url from config file
        if (requestUrl.indexOf(siteUrlRoot) === -1) {
            return options;
        }
        let auth = await spauth.getAuth(ctx.siteUrl, ctx.authOptions);

        let headers = Object.assign(options.headers, auth.headers);
        options = Object.assign(options, auth.options);
        options.headers = headers;

        return options;
    }

    private getWorkspaceRootPath(): string {
        const editor = window.activeTextEditor;
        const document = editor && editor.document;
        if (document) {
            let fileUri = document.uri;
            let workspaceFolder = workspace.getWorkspaceFolder(fileUri);
            if (workspaceFolder) {
                return workspaceFolder.uri.fsPath;
            }
        }
    }
}