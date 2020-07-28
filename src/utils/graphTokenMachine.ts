import { HttpClient } from './httpClient';
import { HttpRequest } from '../models/httpRequest';
import { Clipboard, env, commands, Uri, window } from 'vscode';
import * as Constants from '../common/constants';

/*
 AppId provisioned to allow users to explicitly consent to permissions that this app can call
*/
export const GraphTokenProviderClientId = "07f0a107-95c1-41ad-8f13-912eab68b93f";

export class GraphTokenMachine {
    private readonly _httpClient: HttpClient;
    private readonly clipboard: Clipboard;

    public constructor() {
        this._httpClient = new HttpClient();
        this.clipboard = env.clipboard;
    }
 
    public async AcquireToken(name : string): Promise<string> {

        let authParams = new AuthParameters(name);

        if (!authParams.forceNewToken) {
            let tokenEntry = GraphTokenCache.GetToken(authParams.cacheKey);
            if (tokenEntry && tokenEntry.SupportScopes(authParams.scopes)) {
                return tokenEntry.Token;
            }
        }

        let deviceCodeResponse: IDeviceCodeResponse = await this.GetDeviceCodeResponse(authParams);
        let isDone = await this.promptForUserCode(deviceCodeResponse);
        if (isDone) {
            return await this.GetToken(deviceCodeResponse, authParams);
        } else {
            return "";
        }
    }

    private async GetDeviceCodeResponse(authParams: AuthParameters) : Promise<IDeviceCodeResponse>  {
        let request = this.createUserCodeRequest(authParams.clientId,authParams.tenantId,authParams.scopes);
        let response = await this._httpClient.send(request);

        let bodyObject = JSON.parse(response.body);

        if (response.statusCode != 200) {
            // Fail
            this.processAuthError(bodyObject);
        }

        if (bodyObject.error) {  // really!?
            this.processAuthError(bodyObject);
        }

        // Get userCode out of response body
        let deviceCodeResponse: IDeviceCodeResponse = bodyObject
        return deviceCodeResponse;
    }

    private async GetToken(deviceCodeResponse: IDeviceCodeResponse, authParams: AuthParameters) : Promise<string> {
        let request = this.createAcquireTokenRequest(authParams.clientId, authParams.tenantId, deviceCodeResponse.device_code);
        let response = await this._httpClient.send(request);

        let bodyObject = JSON.parse(response.body);
        
        if (response.statusCode != 200) {
            this.processAuthError(bodyObject);
        }
        let tokenResponse: ITokenResponse = bodyObject
        GraphTokenCache.SetToken(authParams.cacheKey, tokenResponse.scope.split(' '), tokenResponse.access_token);

        return tokenResponse.access_token;
    }

    private processAuthError(bodyObject: any) {
        let errorResponse: IAuthError = bodyObject;
        throw new Error(" Auth call failed. " + errorResponse.error_description);
    }

    private createUserCodeRequest(clientId: string, tenantId:string, scopes: string[]) : HttpRequest {
        return new HttpRequest(
            "POST", `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/devicecode`,
            { "Content-Type": "application/x-www-form-urlencoded" },
             `client_id=${clientId}&scope=${scopes.join("%20")}`);
    }

    private createAcquireTokenRequest(clientId: string, tenantId:string, deviceCode: string) : HttpRequest {
        return new HttpRequest("POST",`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        { "Content-Type": "application/x-www-form-urlencoded" },
         `grant_type=urn:ietf:params:oauth:grant-type:device_code&client_id=${clientId}&device_code=${deviceCode}`);
    }
    
    private async promptForUserCode(deviceCodeResponse: IDeviceCodeResponse) : Promise<boolean>  {

        const messageBoxOptions = { modal: true };
        const signInPrompt = `Sign in to Azure AD with the following code (will be copied to the clipboard) to add a token to your request.\r\n\r\nCode: ${deviceCodeResponse.user_code}`;
        const donePrompt = `1. Azure AD verification page opened in default browser (you may need to switch apps)\r\n2. Paste code to sign in and authorize VS Code (already copied to the clipboard)\r\n3. Confirm when done\r\n4. Token will be copied to the clipboard when finished\r\n\r\nCode: ${deviceCodeResponse.user_code}`;
        const signIn = "Sign in";
        const tryAgain = "Try again";
        const done = "Done";

        let value = await window.showInformationMessage(signInPrompt, messageBoxOptions, signIn);
        if (value == signIn) {
            do {
                await this.clipboard.writeText(deviceCodeResponse.user_code);
                commands.executeCommand("vscode.open", Uri.parse(deviceCodeResponse.verification_uri));
                value = await window.showInformationMessage(donePrompt, messageBoxOptions, done, tryAgain);
            } while(value == tryAgain);
        }
        return value == done;
    };
}

class AuthParameters {
    private readonly graphTokenRegex: RegExp = new RegExp(`\\s*\\${Constants.MicrosoftGraphTokenVariableName}(\\s+(${Constants.AzureActiveDirectoryForceNewOption}))?(\\s+scopes:([\\w,.]+))?(\\s+tenantid:([^\\.]+\\.[^\\}\\s]+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?(\\s+clientid:([^\\.]+\\.[^\\}\\s]+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?\\s*`);
    public tenantId: string
    public clientId: string
    public scopes: string[]
    public forceNewToken: boolean
    public cacheKey: string

    public constructor(name: string) {

        this.clientId = GraphTokenProviderClientId;
        this.tenantId = "common";
        let scopes = "openid,profile";
        this.forceNewToken = false;
        // Parse variable parameters
        const groups = this.graphTokenRegex.exec(name);
        if (groups) {
            this.forceNewToken = groups[2] === Constants.AzureActiveDirectoryForceNewOption;
            scopes = groups[4] || scopes;
            this.tenantId = groups[6] || this.tenantId;
            this.clientId = groups[8] || this.clientId;
        }

        this.cacheKey = this.tenantId + "|" + this.clientId + "|";
        this.scopes = scopes.split(",").map(s => s.trim());
    }
}

 class GraphTokenCache {

    private static tokens : Map<string,GraphTokenCacheEntry> = new Map<string,GraphTokenCacheEntry>();

    static SetToken(cacheKey: string, scopes: string[], token:string) {

        let entry : GraphTokenCacheEntry = new GraphTokenCacheEntry();
        entry.Token = token;
        entry.Scopes = scopes;
        this.tokens.set(cacheKey, entry);
    }
    static GetToken(cacheKey: string) : GraphTokenCacheEntry | undefined {
        return this.tokens.get(cacheKey);
    }
}

 class GraphTokenCacheEntry {
     public Token: string
     public Scopes: string[]

     SupportScopes(scopes :string[]) : boolean {
         let found: boolean = true;
        scopes.forEach(element => {
            if (!this.Scopes.includes(element)) {
                found = false;
                return;
            }
        });
        return found;
     }
 }

 interface IAuthError {
     error: string
     error_description: string
     error_uri: string
     error_codes: number[]
     timestamp: string
     trace_id: string
     correlation_id: string
 }

interface IDeviceCodeResponse {
    user_code: string
    device_code: string
    verification_uri: string
    expires_in: string
    interval: string
    message: string
}

interface ITokenResponse {
    token_type: string
    scope: string
    expires_in: number
    access_token: string
    refresh_token: string
    id_token: string
}