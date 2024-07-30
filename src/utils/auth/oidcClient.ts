import * as crypto from 'crypto';
import fs from 'fs';
import * as http from "http";
import * as https from "https";
import * as jws from 'jws';
import fetch from 'node-fetch';
import path from 'path';
import { SecureContextOptions } from 'tls';
import { v4 as uuid } from 'uuid';
import { env, Uri, window } from "vscode";
import { IRestClientSettings, SystemSettings } from '../../models/configurationSettings';
import { MemoryCache } from '../memoryCache';
import { getCurrentHttpFileName, getWorkspaceRootPath } from '../workspaceUtility';

type ServerAuthorizationCodeResponse = {
  // Success case
  code?: string;
  client_info?: string;
  state?: string;
  cloud_instance_name?: string;
  cloud_instance_host_name?: string;
  cloud_graph_host_name?: string;
  msgraph_host?: string;
  // Error case
  error?: string;
  error_uri?: string;
  error_description?: string;
  suberror?: string;
  timestamp?: string;
  trace_id?: string;
  correlation_id?: string;
  claims?: string;
  // Native Account ID
  accountId?: string;
};

export class CodeLoopbackClient {
  port: number = 0; // default port, which will be set to a random available port
  private server!: http.Server | https.Server;

  private constructor(private callbackDomain: string, port: number = 0) {
    this.port = port;
  }

  /**
   * Initializes a loopback server with an available port
   * @param preferredPort
   * @param logger
   * @returns
   */
  static async initialize(callbackDomain: string, preferredPort: number | undefined): Promise<CodeLoopbackClient> {
    const loopbackClient = new CodeLoopbackClient(callbackDomain);

    if (preferredPort === 0 || preferredPort === undefined) {
      return loopbackClient;
    }
    const isPortAvailable = await loopbackClient.isPortAvailable(preferredPort);

    if (isPortAvailable) {
      loopbackClient.port = preferredPort;
    }

    return loopbackClient;
  }

  /**
   * Spins up a loopback server which returns the server response when the localhost redirectUri is hit
   * @param successTemplate
   * @param errorTemplate
   * @returns
   */
  async listenForAuthCode(successTemplate?: string, errorTemplate?: string): Promise<ServerAuthorizationCodeResponse & { url: string }> {
    if (!!this.server) {
      throw new Error('Loopback server already exists. Cannot create another.');
    }

    const authCodeListener = new Promise<ServerAuthorizationCodeResponse & { url: string }>((resolve, reject) => {
      const handler = async (req: http.IncomingMessage, res: http.ServerResponse) => {
        const url = req.url;
        if (!url) {
          res.end(errorTemplate || "Error occurred loading redirectUrl");
          reject(new Error('Loopback server callback was invoked without a url. This is unexpected.'));
          return;
        } else if (url === "/") {
          res.end(successTemplate || "Auth code was successfully acquired. You can close this window now.");
          return;
        }

        const authCodeResponse = CodeLoopbackClient.getDeserializedQueryString(url);
        if (authCodeResponse.code) {
          const redirectUri = await this.getRedirectUri();
          res.writeHead(302, { location: redirectUri }); // Prevent auth code from being saved in the browser history
          res.end();
        } else {
          res.end(`Authorization Server Error:${JSON.stringify(authCodeResponse)}`);
          reject(new Error(`Authorization Server Error:${JSON.stringify(authCodeResponse)}`));
        }
        resolve({ url, ...authCodeResponse });
      };

      const settings = SystemSettings.Instance as IRestClientSettings;

      try {
        const certificates = this.getSslCertificate(settings);
        if (certificates && (certificates.cert && certificates.key || certificates.pfx)) {
          const options: SecureContextOptions = {
            cert: certificates?.cert,
            key: certificates?.key,
            pfx: certificates?.pfx,
            passphrase: certificates?.passphrase
          };
          this.server = https.createServer(options, handler);
        } else {
          this.server = http.createServer(handler);
        }
        this.server.listen(this.port);
      } catch (ex) {
        reportError('Failed to start server', ex);
      }
    });

    // Wait for server to be listening
    await new Promise<void>((resolve) => {
      let ticks = 0;
      const id = setInterval(() => {
        if ((5000 / 100) < ticks) {
          throw new Error('Timed out waiting for auth code listener to be registered.');
        }

        if (this.server.listening) {
          clearInterval(id);
          resolve();
        }
        ticks++;
      }, 100);
    });

    return authCodeListener;
  }

  private getSslCertificate(settings: IRestClientSettings): SecureContextOptions | null {
    const { cert: certPath, key: keyPath, pfx: pfxPath, passphrase } = settings.oidcCertificates[this.callbackDomain] ?? {};
    if (!certPath && !keyPath && !pfxPath && this.callbackDomain) {
      reportError(`No certificates found for ${this.callbackDomain} in settings.`);
      return null;
    }
    try {
      const cert = this.resolveCertificate(certPath);
      const key = this.resolveCertificate(keyPath);
      const pfx = this.resolveCertificate(pfxPath);
      return { cert, key, pfx, passphrase };
    } catch (ex) {
      reportError(`Failed to load certificates from: {certPath:${certPath}} {keyPath:${keyPath}} {pfxPath:${pfxPath}}`, ex);
      return null;
    }
  }

  private resolveCertificate(absoluteOrRelativePath: string | undefined): Buffer | undefined {
    if (absoluteOrRelativePath === undefined) {
      return undefined;
    }

    if (path.isAbsolute(absoluteOrRelativePath)) {
      if (!fs.existsSync(absoluteOrRelativePath)) {
        reportError(`Certificate path ${absoluteOrRelativePath} doesn't exist, please make sure it exists.`);
        return undefined;
      } else {
        return fs.readFileSync(absoluteOrRelativePath);
      }
    }

    // the path should be relative path
    const rootPath = getWorkspaceRootPath();
    let absolutePath = '';
    if (rootPath) {
      absolutePath = path.join(Uri.parse(rootPath).fsPath, absoluteOrRelativePath);
      if (fs.existsSync(absolutePath)) {
        return fs.readFileSync(absolutePath);
      } else {
        window.showWarningMessage(`Certificate path ${absoluteOrRelativePath} doesn't exist, please make sure it exists.`);
        return undefined;
      }
    }

    const currentFilePath = getCurrentHttpFileName();
    if (!currentFilePath) {
      return undefined;
    }

    absolutePath = path.join(path.dirname(currentFilePath), absoluteOrRelativePath);
    if (fs.existsSync(absolutePath)) {
      return fs.readFileSync(absolutePath);
    } else {
      window.showWarningMessage(`Certificate path ${absoluteOrRelativePath} doesn't exist, please make sure it exists.`);
      return undefined;
    }
  }

  /**
   * Get the redirect uri for the loopback server
   * @returns
   */
  getRedirectUri(): string {
    if (!this.server) {
      throw new Error('No loopback server exists yet.');
    }

    const address = this.server.address();
    if (!address || typeof address === "string" || !address.port) {
      this.closeServer();
      throw new Error('Loopback server address is not type string. This is unexpected.');
    }

    const port = address && address.port;

    return `${this.callbackDomain ? 'https' : 'http'}://${this.callbackDomain ?? 'localhost'}:${port}`;
  }

  /**
   * Close the loopback server
   */
  closeServer(): void {
    if (!!this.server) {
      this.server.close();
    }
  }

  /**
   * Attempts to create a server and listen on a given port
   * @param port
   * @returns
   */
  isPortAvailable(port: number): Promise<boolean> {
    return new Promise(resolve => {
      const server = http.createServer()
        .listen(port, () => {
          server.close();
          resolve(true);
        })
        .on("error", () => {
          resolve(false);
        });
    });
  }

  /**
   * Returns URL query string as server auth code response object.
   */
  static getDeserializedQueryString(
    query: string
  ): ServerAuthorizationCodeResponse {
    // Check if given query is empty
    if (!query) {
      return {};
    }
    // Strip the ? symbol if present
    const parsedQueryString = this.parseQueryString(query);
    // If ? symbol was not present, above will return empty string, so give original query value
    const deserializedQueryString: ServerAuthorizationCodeResponse =
      this.queryStringToObject(
        parsedQueryString || query
      );
    // Check if deserialization didn't work
    if (!deserializedQueryString) {
      throw "Unable to deserialize query string";
    }
    return deserializedQueryString;
  }

  /**
   * Parses query string from given string. Returns empty string if no query symbol is found.
   * @param queryString
   */
  static parseQueryString(queryString: string): string {
    const queryIndex1 = queryString.indexOf("?");
    const queryIndex2 = queryString.indexOf("/?");
    if (queryIndex2 > -1) {
      return queryString.substring(queryIndex2 + 2);
    } else if (queryIndex1 > -1) {
      return queryString.substring(queryIndex1 + 1);
    }
    return "";
  }
  /**
   * Parses string into an object.
   *
   * @param query
   */
  static queryStringToObject(query: string): ServerAuthorizationCodeResponse {
    const obj: { [key: string]: string } = {};
    const params = query.split("&");
    const decode = (s: string) => decodeURIComponent(s.replace(/\+/g, " "));
    params.forEach((pair) => {
      if (pair.trim()) {
        const [key, value] = pair.split(/=(.+)/g, 2); // Split on the first occurence of the '=' character
        if (key && value) {
          obj[decode(key)] = decode(value);
        }
      }
    });
    return obj as ServerAuthorizationCodeResponse;
  }
}

export const CALLBACK_PORT = 7777;

export const remoteOutput = window.createOutputChannel('REST-OIDC');

const reportError = (msg: string, ex: Error | null = null ) => {
  window.showWarningMessage(`Message: ${msg} Exception: ${ex?.message}`);
  remoteOutput.appendLine(`Error: ${msg} Exception: ${ex?.message} Stack:${ex?.stack}`);
};

interface TokenInformation {
  access_token: string;
  refresh_token: string;
}

export class OidcClient {
  private _tokenInformation: TokenInformation | undefined;
  private _pendingStates: string[] = [];
  private _codeVerfifiers = new Map<string, string>();
  private _scopes = new Map<string, string[]>();

  constructor(private clientId: string,
    private callbackDomain: string,
    private callbackPort: number,
    private authorizeEndpoint: string,
    private tokenEndpoint: string,
    private scopes: string,
    private audience: string,
  ) {
  }

  public static async getAccessToken(forceNew: boolean, clientId: string, callbackDomain: string, callbackPort: number,
    authorizeEndpoint: string,
    tokenEndpoint: string,
    scopes: string,
    audience: string): Promise<string | undefined> {
    const key = `${clientId}--${callbackDomain}-${callbackPort}-${authorizeEndpoint}-${tokenEndpoint}-${scopes}-${audience}`;
    const cache = MemoryCache.createOrGet<OidcClient>('oidc');

    const client = cache.get(key) ?? new OidcClient(clientId, callbackDomain, callbackPort, authorizeEndpoint, tokenEndpoint, scopes, audience);
    cache.set(key, client);
    if (forceNew) {
      client.cleanupTokenCache();
    }

    return client.getAccessToken();
  }

  public cleanupTokenCache() {
    this._tokenInformation = undefined;
  }

  get redirectUri() {
    return `${this.callbackDomain ? 'https' : 'http'}://${this.callbackDomain ?? 'localhost'}:${this.callbackPort}`;
  }

  public async getAccessToken(): Promise<string | undefined> {
    const tryDecode = (token: string): any => {
      try {
        const { payload } = jws.decode(token) ?? {};
        return JSON.parse(payload);
      } catch (ex) {
        reportError('Faild to decode access token', ex);
        return null;
      }
    };
    if (this._tokenInformation?.access_token) {
      const payloadJson = tryDecode(this._tokenInformation.access_token);
      if (payloadJson === null || payloadJson.exp && payloadJson.exp > Date.now() / 1000) {
        return this._tokenInformation.access_token;
      } else {
        return this.getAccessTokenByRefreshToken(this._tokenInformation.refresh_token, this.clientId).then((resp) => {
          this._tokenInformation = resp;
          return resp.access_token;
        });
      }
    }

    const nonceId = uuid();

    // Retrieve all required scopes
    const scopes = this.getScopes((this.scopes ?? "").split(','));

    const codeVerifier = toBase64UrlEncoding(crypto.randomBytes(32));
    const codeChallenge = toBase64UrlEncoding(sha256(codeVerifier));

    let callbackUri = await env.asExternalUri(Uri.parse(this.redirectUri));

    remoteOutput.appendLine(`Callback URI: ${callbackUri.toString(true)}`);

    const callbackQuery = new URLSearchParams(callbackUri.query);
    const stateId = callbackQuery.get('state') || nonceId;

    remoteOutput.appendLine(`State ID: ${stateId}`);
    remoteOutput.appendLine(`Nonce ID: ${nonceId}`);

    callbackQuery.set('state', encodeURIComponent(stateId));
    callbackQuery.set('nonce', encodeURIComponent(nonceId));
    callbackUri = callbackUri.with({
      query: callbackQuery.toString()
    });

    this._pendingStates.push(stateId);
    this._codeVerfifiers.set(stateId, codeVerifier);
    this._scopes.set(stateId, scopes);

    const params = [
      ['response_type', "code"],
      ['client_id', this.clientId],
      ['redirect_uri', this.redirectUri],
      ['state', stateId],
      ['scope', scopes.join(' ')],
      ['prompt', "login"],
      ['code_challenge_method', 'S256'],
      ['code_challenge', codeChallenge],
    ];

    if (this.audience) {
      params.push(['resource', this.audience]);
    }

    const searchParams = new URLSearchParams(params as [string, string][]);

    const uri = Uri.parse(`${this.authorizeEndpoint}?${searchParams.toString()}`);

    remoteOutput.appendLine(`Login URI: ${uri.toString(true)}`);

    const loopbackClient = await CodeLoopbackClient.initialize(this.callbackDomain, this.callbackPort);

    try {
      await env.openExternal(uri);
      const callBackResp = await loopbackClient.listenForAuthCode();
      const codeExchangePromise = this._handleCallback(Uri.parse(callBackResp.url));

      const resp = await Promise.race([
        codeExchangePromise,
        new Promise<null>((_, reject) => setTimeout(() => reject('Cancelled'), 60000))
      ]);
      this._tokenInformation = resp as TokenInformation;
      return resp?.access_token;
    } finally {
      loopbackClient.closeServer();
      this._pendingStates = this._pendingStates.filter(n => n !== stateId);
      this._codeVerfifiers.delete(stateId);
      this._scopes.delete(stateId);
    }
  }

  private async getAccessTokenByRefreshToken(refreshToken: string, clientId: string): Promise<TokenInformation> {
    const postData = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      refresh_token: refreshToken
    }).toString();

    const response = await fetch(this.tokenEndpoint, {
      method: 'POST',
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        'Content-Length': postData.length.toString()
      },
      body: postData
    });

    if (response.status !== 200) {
      const error = await response.json();
      throw new Error(`Failed to retrieve access token: ${response.status} ${error}`);
    }

    const { access_token, refresh_token } = await response.json();


    return { access_token, refresh_token };
  }

  private async _handleCallback(uri: Uri): Promise<TokenInformation | undefined> {
    const query = new URLSearchParams(uri.query);
    const code = query.get('code');
    const stateId = query.get('state');

    if (!code) {
      throw new Error('No code');

    }
    if (!stateId) {
      throw new Error('No state');

    }

    const codeVerifier = this._codeVerfifiers.get(stateId);
    if (!codeVerifier) {
      throw new Error('No code verifier');
    }

    // Check if it is a valid auth request started by the extension
    if (!this._pendingStates.some(n => n === stateId)) {
      throw new Error('State not found');
    }

    const postData = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      code,
      code_verifier: codeVerifier,
      redirect_uri: this.redirectUri,
    }).toString();
    try {
      const response = await fetch(`${this.tokenEndpoint}`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          'Content-Length': postData.length.toString()
        },
        body: postData
      });
      const json = await response.json();
      const { access_token, refresh_token } = json;
      if (!access_token) {
        reportError(`Failed to retrieve access token: ${response.status} ${JSON.stringify(json)}`);
      }

      return { access_token, refresh_token };
    } catch (ex) {
      reportError('Failed to retrieve access token', ex);
      return undefined;
    }
  }

  /**
   * Get all required scopes
   * @param scopes
   */
  private getScopes(scopes: string[] = []): string[] {
    const settings = SystemSettings.Instance as IRestClientSettings;
    
    let modifiedScopes = [...(settings.oidcScopes ?? []), ...scopes];
    return Array.from(new Set(modifiedScopes.sort()));
  }
}

export function toBase64UrlEncoding(buffer: Buffer) {
  return buffer.toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

export function sha256(buffer: string | Uint8Array): Buffer {
  return crypto.createHash('sha256').update(buffer).digest();
}
