import { IAuthProcessor } from '../IAuthProcessor';
import { HttpRequest } from '../../models/httpRequest';
import { getWorkspaceRootPath } from './../../workspaceUtility';

import { AuthConfig } from 'node-sp-auth-config';
import * as spauth from 'node-sp-auth';
import * as path from 'path';
import * as url from 'url';

export class SharePointAuthProcessor implements IAuthProcessor {

    constructor(private request: HttpRequest, private authPath: string) { }

    public async process(options: any): Promise<any> {

        let workspacePath = getWorkspaceRootPath();
        let configPath;

        if (path.isAbsolute(this.authPath)) {
            configPath = this.authPath;
        } else {
            configPath = path.join(workspacePath, this.authPath);
        }

        const authConfig = new AuthConfig({
            configPath: configPath
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
}