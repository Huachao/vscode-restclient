import { Clipboard, commands, env, Uri, window } from 'vscode';
import * as Constants from '../common/constants';
import { HttpRequest } from '../models/httpRequest';
import { HttpClient } from './httpClient';
import { EnvironmentVariableProvider } from './httpVariableProviders/environmentVariableProvider';

/*
 AppId provisioned to allow users to explicitly consent to permissions that this app can call
*/
const AadV2TokenProviderClientId = "07f0a107-95c1-41ad-8f13-912eab68b93f";

export class AadV2TokenProvider {
    private cloudConstantToCloudNameMap : { [cloudName: string]: { constantName: string } } = {
        // default cloud must be first
        AzureCloud: { constantName: "public" },
        AzureChinaCloud: { constantName: "cn" },
        AzureUSGovernment: { constantName: "us" },
        ppe: { constantName: "ppe" },
    };

    private readonly _httpClient: HttpClient;
    private readonly clipboard: Clipboard;

    public constructor() {
        this._httpClient = new HttpClient();
        this.clipboard = env.clipboard;
    }

    public async acquireToken(name: string): Promise<string> {

        const authParams = await AuthParameters.parseName(name);

        if (!authParams.forceNewToken) {
            const tokenEntry = AadV2TokenCache.getToken(authParams.getCacheKey());
            if (tokenEntry?.supportScopes(authParams.scopes)) {
                return tokenEntry.token;
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

    private async getDeviceCodeResponse(authParams: AuthParameters): Promise<IDeviceCodeResponse> {
        const request = this.createUserCodeRequest(authParams.clientId, authParams.tenantId, authParams.scopes, authParams.cloud);
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

    private async getToken(deviceCodeResponse: IDeviceCodeResponse, authParams: AuthParameters): Promise<string> {
        const request = this.createAcquireTokenRequest(authParams.clientId, authParams.tenantId, deviceCodeResponse.device_code, authParams.cloud);
        const response = await this._httpClient.send(request);

        const bodyObject = JSON.parse(response.body);

        if (response.statusCode !== 200) {
            this.processAuthErrorAndThrow(bodyObject);
        }
        const tokenResponse: ITokenResponse = bodyObject;
        const tokenScopes = tokenResponse.scope.split(' ');
        for (const scope of authParams.scopes) {
            if (!tokenScopes.includes(scope)) {
                tokenScopes.push(scope);
            }
        }
        AadV2TokenCache.setToken(authParams.getCacheKey(), tokenScopes, tokenResponse.access_token, tokenResponse.expires_in);

        return tokenResponse.access_token;
    }

    private async getConfidentialClientToken(authParams: AuthParameters): Promise<string> {
        const request = this.createAcquireConfidentialClientTokenRequest(authParams.clientId, authParams.tenantId, authParams.clientSecret!, authParams.appUri!, authParams.cloud!);
        const response = await this._httpClient.send(request);

        const bodyObject = JSON.parse(response.body);

        if (response.statusCode !== 200) {
            this.processAuthErrorAndThrow(bodyObject);
        }
        const tokenResponse: ITokenResponse = bodyObject;
        const scopes: string[] = []; // Confidential Client tokens are limited to scopes defined in the app registration portal
        AadV2TokenCache.setToken(authParams.getCacheKey(), scopes, tokenResponse.access_token, tokenResponse.expires_in);
        return tokenResponse.access_token;
    }

    private processAuthErrorAndThrow(bodyObject: any) {
        const errorResponse: IAuthError = bodyObject;
        throw new Error("Auth call failed. " + errorResponse.error_description);
    }

    private createUserCodeRequest(clientId: string, tenantId: string, scopes: string[], cloud: string): HttpRequest {
        return new HttpRequest(
            "POST", `${this.getAadV2BaseUri(cloud, tenantId)}/devicecode`,
            { "Content-Type": "application/x-www-form-urlencoded" },
            `client_id=${clientId}&scope=${scopes.join("%20")}`);
    }

    private createAcquireTokenRequest(clientId: string, tenantId: string, deviceCode: string, cloud: string): HttpRequest {
        return new HttpRequest("POST", `${this.getAadV2BaseUri(cloud, tenantId)}/token`,
            { "Content-Type": "application/x-www-form-urlencoded" },
            `grant_type=urn:ietf:params:oauth:grant-type:device_code&client_id=${clientId}&device_code=${deviceCode}`);
    }

    private createAcquireConfidentialClientTokenRequest(clientId: string, tenantId: string, clientSecret: string, appUri: string, cloud: string): HttpRequest {
        return new HttpRequest("POST", `${this.getAadV2BaseUri(cloud, tenantId)}/token`,
            { "Content-Type": "application/x-www-form-urlencoded" },
            `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&scope=${appUri}/.default`);
    }

    private getAadV2BaseUri(cloud: string, tenantId: string) {
        const constantCloudName = this.cloudConstantToCloudNameMap[cloud].constantName;
        const aadUri = Constants.AzureClouds[constantCloudName].aad;
        return `${aadUri}${tenantId}/oauth2/v2.0/`;
    }

    private async promptForUserCode(deviceCodeResponse: IDeviceCodeResponse): Promise<boolean> {

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

    private readonly aadV2TokenRegex: RegExp = new RegExp(`\\s*\\${Constants.AzureActiveDirectoryV2TokenVariableName}(\\s+(${Constants.AzureActiveDirectoryForceNewOption}))?(\\s+(AzureCloud|AzureChinaCloud|AzureUSGovernment|ppe))?(\\s+(appOnly))?(\\s+scopes:(\\S+))?(\\s+tenantId:([^\\.]+\\.[^\\}\\s]+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?(\\s+clientId:([^\\.]+\\.[^\\}\\s]+|[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}))?\\s*`);
    public cloud: string;
    public tenantId: string;
    public clientId: string;
    public scopes: string[];
    public forceNewToken: boolean;
    public clientSecret?: string;
    public appOnly: boolean;
    public appUri?: string;

    public constructor() {
        this.cloud = "AzureCloud";
        this.clientId = AadV2TokenProviderClientId;
        this.tenantId = "common";
        this.forceNewToken = false;
        this.appOnly = false;
    }

    async readEnvironmentVariable(variableName: string): Promise<string | undefined> {
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

    getCacheKey(): string {
        return this.cloud + "|" + this.tenantId + "|" + this.clientId + "|" + this.appOnly + "|" + this.scopes.join(',') as string;
    }

    static async parseName(name: string): Promise<AuthParameters> {

        const authParameters = new AuthParameters();

        // Update defaults based on environment
        authParameters.cloud = (await authParameters.readEnvironmentVariable("aadV2Cloud")) || authParameters.cloud;
        authParameters.tenantId = (await authParameters.readEnvironmentVariable("aadV2TenantId")) || authParameters.tenantId;

        let scopes = "openid,profile";
        let explicitClientId: string | undefined = undefined;
        // Parse variable parameters
        const groups = authParameters.aadV2TokenRegex.exec(name);
        if (groups) {
            authParameters.forceNewToken = groups[2] === Constants.AzureActiveDirectoryForceNewOption;
            authParameters.cloud = groups[4] || authParameters.cloud;
            authParameters.appOnly = groups[6] === "appOnly";
            scopes = groups[8] || scopes;
            authParameters.tenantId = groups[10] || authParameters.tenantId;
            explicitClientId = groups[12];
        } else {
            throw new Error("Failed to parse parameters: " + name);
        }

        // if scopes does not contain openid or profile, add it
        // Using /common endpoint with only organizational scopes causes device code to fail.
        // Adding openid and/or profile prevents this failure from occuring
        if (scopes.indexOf("openid") === -1) {
            scopes += ",openid,profile";
        }
        authParameters.scopes = scopes.split(",").map(s => s.trim());

        if (authParameters.appOnly) {
            authParameters.clientId = explicitClientId || (await authParameters.readEnvironmentVariable("aadV2ClientId")) || authParameters.clientId;
            authParameters.clientSecret = await authParameters.readEnvironmentVariable("aadV2ClientSecret");
            authParameters.appUri = await authParameters.readEnvironmentVariable("aadV2AppUri");
            if (!(authParameters.clientSecret && authParameters.appUri)) {
                throw new Error("For appOnly tokens, environment variables aadV2ClientSecret and aadV2AppUri must be created.  aadV2ClientId and aadV2TenantId are optional environment variables.");
            }
        } else {
            authParameters.clientId = explicitClientId || authParameters.clientId;
        }
        return authParameters;
    }
}

class AadV2TokenCache {

    private static tokens: Map<string, AadV2TokenCacheEntry> = new Map<string, AadV2TokenCacheEntry>();

    public static setToken(cacheKey: string, scopes: string[], token: string, expires_in: number) {
        const entry: AadV2TokenCacheEntry = new AadV2TokenCacheEntry();
        entry.token = token;
        entry.scopes = scopes;
        this.tokens.set(cacheKey, entry);
        setTimeout(() => {
            this.tokens.delete(cacheKey);
        }, expires_in * 1000);
    }

    public static getToken(cacheKey: string): AadV2TokenCacheEntry | undefined {
        return this.tokens.get(cacheKey);
    }
}

class AadV2TokenCacheEntry {
    public token: string;
    public scopes: string[];
    public supportScopes(scopes: string[]): boolean {
        return scopes.every((scope) => this.scopes.includes(scope));
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
