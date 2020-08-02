import { Clipboard, commands, env, Uri, window } from 'vscode';
import * as Constants from '../common/constants';
import { HttpRequest } from '../models/httpRequest';
import { HttpClient } from './httpClient';
import { EnvironmentVariableProvider } from './httpVariableProviders/environmentVariableProvider';

/*
 AppId provisioned to allow users to explicitly consent to permissions that this app can call
*/
export const AadV2TokenProviderClientId = "07f0a107-95c1-41ad-8f13-912eab68b93f";

export class AadV2TokenProvider {
    private readonly _httpClient: HttpClient;
    private readonly clipboard: Clipboard;

    public constructor() {
        this._httpClient = new HttpClient();
        this.clipboard = env.clipboard;
    }

    public async acquireToken(name : string): Promise<string> {

        const authParams = new AuthParameters();
        await authParams.parseName(name);

        if (!authParams.forceNewToken) {
            const tokenEntry = AadV2TokenCache.getToken(authParams.getCacheKey());
            if (tokenEntry && tokenEntry.supportScopes(authParams.scopes)) {
                return tokenEntry.Token;
            }
        }

        if (authParams.appOnly) {
            return await this.getConfidentialClientToken(authParams);
        }

        const deviceCodeResponse: IDeviceCodeResponse = await this.getDeviceCodeResponse(authParams);
        const isDone = await this.promptForUserCode(deviceCodeResponse);
        if (isDone) {
            return await this.getToken(deviceCodeResponse, authParams);
        } else {
            return "";
        }
    }

    private async getDeviceCodeResponse(authParams: AuthParameters) : Promise<IDeviceCodeResponse> {
        const request = this.createUserCodeRequest(authParams.clientId, authParams.tenantId, authParams.scopes);
        const response = await this._httpClient.send(request);

        const bodyObject = JSON.parse(response.body);

        if (response.statusCode !== 200) {
            // Fail
            this.processAuthErrorAndThrow(bodyObject);
        }

        if (bodyObject.error) {  // This is only needed due to an error in AADV2 device code endpoint. An issue is filed.
            this.processAuthErrorAndThrow(bodyObject);
        }

        // Get userCode out of response body
        return bodyObject as IDeviceCodeResponse;
    }

    private async getToken(deviceCodeResponse: IDeviceCodeResponse, authParams: AuthParameters) : Promise<string> {
        const request = this.createAcquireTokenRequest(authParams.clientId, authParams.tenantId, deviceCodeResponse.device_code);
        const response = await this._httpClient.send(request);

        const bodyObject = JSON.parse(response.body);

        if (response.statusCode !== 200) {
            this.processAuthErrorAndThrow(bodyObject);
        }
        const tokenResponse: ITokenResponse = bodyObject;
        AadV2TokenCache.setToken(authParams.getCacheKey(), tokenResponse.scope.split(' '), tokenResponse.access_token);

        return tokenResponse.access_token;
    }

    private async getConfidentialClientToken(authParams: AuthParameters): Promise<string> {
        const request = this.createAcquireConfidentialClientTokenRequest(authParams.clientId, authParams.tenantId, authParams.clientSecret!, authParams.appUri!);
        const response = await this._httpClient.send(request);

        const bodyObject = JSON.parse(response.body);

        if (response.statusCode !== 200) {
            this.processAuthErrorAndThrow(bodyObject);
        }
        const tokenResponse: ITokenResponse = bodyObject;
        const scopes : string[] = []; // Confidential Client tokens are limited to scopes defined in the app registration portal
        AadV2TokenCache.setToken(authParams.getCacheKey(), scopes, tokenResponse.access_token);
        return tokenResponse.access_token;
    }

    private processAuthErrorAndThrow(bodyObject: any) {
        const errorResponse: IAuthError = bodyObject;
        throw new Error(" Auth call failed. " + errorResponse.error_description);
    }

    private createUserCodeRequest(clientId: string, tenantId: string, scopes: string[]) : HttpRequest {
        return new HttpRequest(
            "POST", `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/devicecode`,
            { "Content-Type": "application/x-www-form-urlencoded" },
             `client_id=${clientId}&scope=${scopes.join("%20")}`);
    }

    private createAcquireTokenRequest(clientId: string, tenantId: string, deviceCode: string) : HttpRequest {
        return new HttpRequest("POST", `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        { "Content-Type": "application/x-www-form-urlencoded" },
         `grant_type=urn:ietf:params:oauth:grant-type:device_code&client_id=${clientId}&device_code=${deviceCode}`);
    }

    private createAcquireConfidentialClientTokenRequest(clientId: string, tenantId: string, clientSecret: string, appUri: string) : HttpRequest {
        return new HttpRequest("POST", `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        { "Content-Type": "application/x-www-form-urlencoded" },
         `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&scope=${appUri}/.default`);
    }

    private async promptForUserCode(deviceCodeResponse: IDeviceCodeResponse) : Promise<boolean>  {

        const messageBoxOptions = { modal: true };
        const signInPrompt = `Sign in to Azure AD with the following code (will be copied to the clipboard) to add a token to your request.\r\n\r\nCode: ${deviceCodeResponse.user_code}`;
        const donePrompt = `1. Azure AD verification page opened in default browser (you may need to switch apps)\r\n2. Paste code to sign in and authorize VS Code (already copied to the clipboard)\r\n3. Confirm when done\r\n4. Token will be copied to the clipboard when finished\r\n\r\nCode: ${deviceCodeResponse.user_code}`;
        const signIn = "Sign in";
        const tryAgain = "Try again";
        const done = "Done";

        let value = await window.showInformationMessage(signInPrompt, messageBoxOptions, signIn);
        if (value === signIn) {
            do {
                await this.clipboard.writeText(deviceCodeResponse.user_code);
                commands.executeCommand("vscode.open", Uri.parse(deviceCodeResponse.verification_uri));
                value = await window.showInformationMessage(donePrompt, messageBoxOptions, done, tryAgain);
            } while (value === tryAgain);
        }
        return value === done;
    }
}

/*

  ClientId: We use default clientId for all delegated access unless overridden in $appToken.  AppOnly access uses the one in the environment
  TenantId: If not specified, we use common. If specified in environment, we use that. Value in $aadToken overrides
  Scopes are always in $aadV2Token for delegated access. They are not used for appOnly.
*/
class AuthParameters {

    private readonly aadV2TokenRegex: RegExp = new RegExp(`\\s*\\${Constants.AzureActiveDirectoryV2TokenVariableName}(\\s+(${Constants.AzureActiveDirectoryForceNewOption}))?(\\s+(appOnly))?(\\s+scopes:([\\w,.]+))?(\\s+tenantId:([^\\.]+\\.[^\\}\\s]+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?(\\s+clientId:([^\\.]+\\.[^\\}\\s]+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?\\s*`);
    public tenantId: string;
    public clientId: string;
    public scopes: string[];
    public forceNewToken: boolean;
    public clientSecret?: string;
    public appOnly: boolean;
    public appUri?: string;

    public constructor() {
        this.clientId = AadV2TokenProviderClientId;
        this.tenantId = "common";
        this.forceNewToken = false;
        this.appOnly = false;
    }

    async readEnvironmentVariable(variableName: string) : Promise<string | undefined> {
        if (await EnvironmentVariableProvider.Instance.has(variableName)) {
            const { value, error, warning } = await EnvironmentVariableProvider.Instance.get(variableName);
            if (!warning && !error) {
                return value as string;
            } else {
                return undefined;
            }
        }
        return undefined;
    }

    getCacheKey() : string {
        return this.tenantId + "|" + this.clientId + "|" + this.appOnly as string;
    }

    async parseName(name: string) {

        // Update defaults based on environment
        this.tenantId = (await this.readEnvironmentVariable("aadV2TenantId")) || this.tenantId;

        let scopes = "openid,profile";
        let explicitClientId: string|undefined = undefined;
        // Parse variable parameters
        const groups = this.aadV2TokenRegex.exec(name);
        if (groups) {
            this.forceNewToken = groups[2] === Constants.AzureActiveDirectoryForceNewOption;
            this.appOnly = groups[4] === "appOnly";
            scopes = groups[6] || scopes;
            this.tenantId = groups[8] || this.tenantId;
            explicitClientId = groups[10];
        } else {
            throw new Error("Failed to parse parameters: " + name);
        }

        this.scopes = (scopes + ",openid,profile").split(",").map(s => s.trim());

        if (this.appOnly) {
            this.clientId = explicitClientId || (await this.readEnvironmentVariable("aadV2ClientId")) || this.clientId;
            this.clientSecret = (await this.readEnvironmentVariable("aadV2ClientSecret"));
            this.appUri = (await this.readEnvironmentVariable("aadV2AppUri"));
            if (!(this.clientSecret && this.appUri)) {
                throw new Error("For appOnly tokens, environment variables aadV2ClientSecret and aadV2AppUri must be created.  aadV2ClientId and aadV2TenantId are optional environment variables.");
            }
        } else {
            this.clientId = explicitClientId || this.clientId;
        }
    }
}

 class AadV2TokenCache {

    private static tokens : Map<string, AadV2TokenCacheEntry> = new Map<string, AadV2TokenCacheEntry>();

    public static setToken(cacheKey: string, scopes: string[], token: string) {
        const entry : AadV2TokenCacheEntry = new AadV2TokenCacheEntry();
        entry.Token = token;
        entry.Scopes = scopes;
        this.tokens.set(cacheKey, entry);
    }

    public static getToken(cacheKey: string) : AadV2TokenCacheEntry | undefined {
        return this.tokens.get(cacheKey);
    }
}

 class AadV2TokenCacheEntry {
     public Token: string;
     public Scopes: string[];
     public supportScopes(scopes: string[]) : boolean {
        return scopes.every((scope) => this.Scopes.includes(scope));
     }
 }

 interface IAuthError {
     error: string;
     error_description: string;
     error_uri: string;
     error_codes: number[];
     timestamp: string;
     trace_id: string;
     correlation_id: string;
 }

interface IDeviceCodeResponse {
    user_code: string;
    device_code: string;
    verification_uri: string;
    expires_in: string;
    interval: string;
    message: string;
}

interface ITokenResponse {
    token_type: string;
    scope: string;
    expires_in: number;
    access_token: string;
    refresh_token: string;
    id_token: string;
}