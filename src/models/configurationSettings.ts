import { window, workspace, WorkspaceConfiguration } from 'vscode';
import { HostCertificate } from '../models/hostCertificate';
import { Headers } from '../models/base';
import { PreviewOption, fromString as ParsePreviewOptionStr } from '../models/previewOption';

export interface IRestClientSettings {
    followRedirect: boolean;
    defaultHeaders: Headers;
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
    previewResponseInUntitledDocument: boolean;
    previewResponseSetUntitledDocumentLanguageByContentType: boolean;
    includeAdditionalInfoInResponse: boolean;
    hostCertificates: Map<string, HostCertificate>;
    useTrunkedTransferEncodingForSendingFileContent: boolean;
    suppressResponseBodyContentTypeValidationWarning: boolean;
    previewOption: PreviewOption;
    disableHighlightResonseBodyForLargeResponse: boolean;
    disableAddingHrefLinkForLargeResponse: boolean;
    largeResponseBodySizeLimitInMB: number;
    previewResponseInActiveColumn: boolean;
}

export class RestClientSettings implements IRestClientSettings {
    public followRedirect: boolean;
    public defaultHeaders: Headers;
    public timeoutInMilliseconds: number;
    public showResponseInDifferentTab: boolean;
    public proxy: string;
    public proxyStrictSSL: boolean;
    public rememberCookiesForSubsequentRequests: boolean;
    public enableTelemetry: boolean;
    public showEnvironmentStatusBarItem: boolean;
    public excludeHostsForProxy: string[];
    public fontSize?: number;
    public fontFamily: string;
    public fontWeight: string;
    public environmentVariables: Map<string, Map<string, string>>;
    public mimeAndFileExtensionMapping: Map<string, string>;
    public previewResponseInUntitledDocument: boolean;
    public previewResponseSetUntitledDocumentLanguageByContentType: boolean;
    public includeAdditionalInfoInResponse: boolean;
    public hostCertificates: Map<string, HostCertificate>;
    public useTrunkedTransferEncodingForSendingFileContent: boolean;
    public suppressResponseBodyContentTypeValidationWarning: boolean;
    public previewOption: PreviewOption;
    public disableHighlightResonseBodyForLargeResponse: boolean;
    public disableAddingHrefLinkForLargeResponse: boolean;
    public largeResponseBodySizeLimitInMB: number;
    public previewResponseInActiveColumn: boolean;

    private static _instance: RestClientSettings;

    public static get Instance(): RestClientSettings {
        if (!RestClientSettings._instance) {
            RestClientSettings._instance = new RestClientSettings();
        }

        return RestClientSettings._instance;
    }

    private constructor() {
        workspace.onDidChangeConfiguration(() => {
            this.initializeSettings();
        });

        this.initializeSettings();
    }

    private initializeSettings() {
        let restClientSettings = this.getWorkspaceConfiguration("rest-client");
        this.followRedirect = restClientSettings.get<boolean>("followredirect", true);
        this.defaultHeaders = restClientSettings.get<Headers>("defaultHeaders", {"User-Agent": "vscode-restclient"});
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

        this.previewResponseInUntitledDocument = restClientSettings.get<boolean>("previewResponseInUntitledDocument", false);
        this.previewResponseSetUntitledDocumentLanguageByContentType = restClientSettings.get<boolean>("previewResponseSetUntitledDocumentLanguageByContentType", false);
        this.previewResponseInActiveColumn = restClientSettings.get<boolean>("previewResponseInActiveColumn", false);
        this.includeAdditionalInfoInResponse = restClientSettings.get<boolean>("includeAdditionalInfoInResponse", false);
        this.hostCertificates = restClientSettings.get<Map<string, HostCertificate>>("certificates", new Map<string, HostCertificate>());
        this.useTrunkedTransferEncodingForSendingFileContent = restClientSettings.get<boolean>("useTrunkedTransferEncodingForSendingFileContent", true);
        this.suppressResponseBodyContentTypeValidationWarning = restClientSettings.get<boolean>("suppressResponseBodyContentTypeValidationWarning", false);
        this.disableHighlightResonseBodyForLargeResponse = restClientSettings.get<boolean>("disableHighlightResonseBodyForLargeResponse", true);
        this.disableAddingHrefLinkForLargeResponse = restClientSettings.get<boolean>("disableAddingHrefLinkForLargeResponse", true);
        this.largeResponseBodySizeLimitInMB = restClientSettings.get<number>("largeResponseBodySizeLimitInMB", 5);
        this.previewOption = ParsePreviewOptionStr(restClientSettings.get<string>("previewOption", "full"));
        this.enableTelemetry = restClientSettings.get<boolean>('enableTelemetry', true);
        this.showEnvironmentStatusBarItem = restClientSettings.get<boolean>('showEnvironmentStatusBarItem', true);

        let httpSettings = this.getWorkspaceConfiguration("http");
        this.proxy = httpSettings.get<string>('proxy', undefined);
        this.proxyStrictSSL = httpSettings.get<boolean>('proxyStrictSSL', false);
    }

    private getWorkspaceConfiguration(section: string): WorkspaceConfiguration {
        let editor = window.activeTextEditor;
        if (editor && editor.document) {
            return workspace.getConfiguration(section, editor.document.uri);
        } else {
            return workspace.getConfiguration(section);
        }
    }
}
