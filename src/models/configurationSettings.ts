import { workspace } from 'vscode';

export interface IRestClientSettings {
    followRedirect: boolean;
    defaultUserAgent: string;
    timeoutInMilliseconds: number;
    showResponseInDifferentTab: boolean;
    proxy: string;
    proxyStrictSSL: boolean;
    rememberCookiesForSubsequentRequests: boolean;
    enableTelemetry: boolean;
    excludeHostsForProxy: string[];
    fontSize?: number;
    fontFamily: string;
    fontWeight: string;
    environmentVariables: Map<string, Map<string, string>>;
    mimeAndFileExtensionMapping: Map<string, string>;
}

export class RestClientSettings implements IRestClientSettings {
    public followRedirect: boolean;
    public defaultUserAgent: string;
    public timeoutInMilliseconds: number;
    public showResponseInDifferentTab: boolean;
    public proxy: string;
    public proxyStrictSSL: boolean;
    public rememberCookiesForSubsequentRequests: boolean;
    public enableTelemetry: boolean;
    public excludeHostsForProxy: string[];
    public fontSize?: number;
    public fontFamily: string;
    public fontWeight: string;
    public environmentVariables: Map<string, Map<string, string>>;
    public mimeAndFileExtensionMapping: Map<string, string>;

    public constructor() {
        workspace.onDidChangeConfiguration(() => {
            this.initializeSettings();
        });

        this.initializeSettings();
    }

    private initializeSettings() {
        var restClientSettings = workspace.getConfiguration("rest-client");
        this.followRedirect = restClientSettings.get<boolean>("followredirect", true);
        this.defaultUserAgent = restClientSettings.get<string>("defaultuseragent", "vscode-restclient");
        this.showResponseInDifferentTab = restClientSettings.get<boolean>("showResponseInDifferentTab", false);
        this.rememberCookiesForSubsequentRequests = restClientSettings.get<boolean>("rememberCookiesForSubsequentRequests", true);
        this.timeoutInMilliseconds = restClientSettings.get<number>("timeoutinmilliseconds", 0);
        if (this.timeoutInMilliseconds < 0) {
            this.timeoutInMilliseconds = 0;
        }
        this.excludeHostsForProxy = restClientSettings.get<string[]>("excludeHostsForProxy", []);
        this.fontSize = restClientSettings.get<number>("fontSize", null);
        this.fontFamily = restClientSettings.get<string>("fontFamily", null);
        this.fontWeight = restClientSettings.get<string>("fontWeight", null);

        this.environmentVariables = restClientSettings.get<Map<string, Map<string, string>>>("environmentVariables", new Map<string, Map<string, string>>());
        this.mimeAndFileExtensionMapping = restClientSettings.get<Map<string, string>>("mimeAndFileExtensionMapping", new Map<string, string>());

        let httpSettings = workspace.getConfiguration('http');
        this.proxy = httpSettings.get<string>('proxy', undefined);
        this.proxyStrictSSL = httpSettings.get<boolean>('proxyStrictSSL', false);
        this.enableTelemetry = httpSettings.get<boolean>('enableTelemetry', true);
    }
}
