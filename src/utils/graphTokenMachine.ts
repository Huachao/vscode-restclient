import { HttpClient } from './httpClient';
import { HttpRequest } from '../models/httpRequest';
import { HttpResponse } from '../models/httpResponse';
import { Clipboard, env, commands, Uri, window } from 'vscode';
import * as Constants from '../common/constants';

export const GraphTokenProviderClientId = "07f0a107-95c1-41ad-8f13-912eab68b93f";
const UserCodeRequest: string = "UserCodeRequest"
const TokenRequest: string = "TokenRequest"
const messageBoxOptions = { modal: true };

export class GraphTokenMachine {
  

    private readonly _httpClient: HttpClient;
    private readonly clipboard: Clipboard;
    private readonly clientId: string;
    private readonly tenantId: string;
    private readonly scopes: string[];
    private success: (token:string) => void;
    private fail: (message:string) => void;
    private readonly graphTokenRegex: RegExp = new RegExp(`\\s*\\${Constants.MicrosoftGraphTokenVariableName}(\\s+(${Constants.AzureActiveDirectoryForceNewOption}))?(\\s+scopes:([\\w,.]+))?(\\s+tenantid:([^\\.]+\\.[^\\}\\s]+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?(\\s+clientid:([^\\.]+\\.[^\\}\\s]+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?\\s*`);
    private cacheKey: string;
    private forceNewToken: boolean;

    public constructor(name: string ) {
        this._httpClient = new HttpClient();
        this.clipboard = env.clipboard;
        // Default values
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
        this.scopes = scopes.split(",").map(s=>s.trim());
    }
 
    public AcquireToken(success: (token:string) => void,
                        fail: (message:string) => void): void {
        this.success = success;
        this.fail = fail;

        if (!this.forceNewToken) {
            let tokenEntry = GraphTokenCache.GetToken(this.cacheKey);
            if (tokenEntry && tokenEntry.SupportScopes(this.scopes)) {
                this.success(tokenEntry.Token);
                return;
            }
        }

        this.MakeRequest(UserCodeRequest,this.CreateUserCodeRequest(this.scopes));
    }

    private MakeRequest(linkrelation: string, request: HttpRequest) : void  {
        this._httpClient.send(request).then( value => {
            this.HandleResponse(linkrelation,value);
        });
    }

    private CreateUserCodeRequest(scopes: string[]) : HttpRequest {
        return new HttpRequest(
            "POST", `https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/devicecode`,
            { "Content-Type": "application/x-www-form-urlencoded" },
             `client_id=${this.clientId}&scope=${scopes.join("%20")}`);
    }

    private CreateAcquireTokenRequest(deviceCode: string) : HttpRequest {
        return new HttpRequest("POST",`https://login.microsoftonline.com/${this.tenantId}/oauth2/v2.0/token`,
        { "Content-Type": "application/x-www-form-urlencoded" },
         `grant_type=urn:ietf:params:oauth:grant-type:device_code&client_id=${this.clientId}&device_code=${deviceCode}`);
    }
    
    private HandleResponse(linkRelation: string,  response: HttpResponse) : void {

        if (response.statusCode != 200) {
            // Fail
            let errorResponse: IAuthError = JSON.parse(response.body);
            this.fail(linkRelation + " : call failed. "+ errorResponse.error_description);
        } else {

            let bodyObject = JSON.parse(response.body);
            if (bodyObject.error) {  // really!?
                let authError: IAuthError  = bodyObject;
                this.fail(authError.error_description);
                return;
            }
            switch(linkRelation) {
                case UserCodeRequest:
                    // Get userCode out of response body
                    let deviceCodeResponse: IDeviceCodeResponse = bodyObject
                    this.promptForCode(deviceCodeResponse);
                    break;
                case TokenRequest:
                    let tokenResponse: ITokenResponse = bodyObject
                    this.handleTokenResponse(tokenResponse);
                    break;
                default:
                    break;
            }
        }
    }

    private handleTokenResponse(tokenResponse: ITokenResponse) {
        GraphTokenCache.SetToken(this.cacheKey, tokenResponse.scope.split(' '), tokenResponse.access_token);
        this.success(tokenResponse.access_token);
    }

    private promptForCode(deviceCodeResponse: IDeviceCodeResponse) : void  {

        const prompt1 = `Sign in to Azure AD with the following code (will be copied to the clipboard) to add a token to your request.\r\n\r\nCode: ${deviceCodeResponse.user_code}`;
        const prompt2 = `1. Azure AD verification page opened in default browser (you may need to switch apps)\r\n2. Paste code to sign in and authorize VS Code (already copied to the clipboard)\r\n3. Confirm when done\r\n4. Token will be copied to the clipboard when finished\r\n\r\nCode: ${deviceCodeResponse.user_code}`;
        const signIn = "Sign in";
        const tryAgain = "Try again";
        const done = "Done";
        const signInPrompt = value => {
            if (value === signIn || value === tryAgain) {
                this.clipboard.writeText(deviceCodeResponse.user_code).then(() => {
                    commands.executeCommand("vscode.open", Uri.parse(deviceCodeResponse.verification_uri));
                    window.showInformationMessage(prompt2, messageBoxOptions, done, tryAgain).then(signInPrompt);
                });
            }
            else if (value === done) {
                this.MakeRequest(TokenRequest, this.CreateAcquireTokenRequest(deviceCodeResponse.device_code));
            }
        };
        window.showInformationMessage(prompt1, messageBoxOptions, signIn).then(signInPrompt);
    };
}


export class GraphTokenCache {

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