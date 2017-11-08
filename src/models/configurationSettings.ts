import { window, workspace, WorkspaceConfiguration } from 'vscode';
import { HostCertificate } from '../models/hostCertificate';
import { PreviewOption, fromString as ParsePreviewOptionStr } from '../models/previewOption';

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
    previewResponseInUntitledDocument: boolean;
    previewResponseSetUntitledDocumentLanguageByContentType: boolean;
    includeAdditionalInfoInResponse: boolean;
    hostCertificates: Map<string, HostCertificate>;
    useTrunkedTransferEncodingForSendingFileContent: boolean;
    suppressResponseBodyContentTypeValidationWarning: boolean;
    previewOption: PreviewOption;
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
    public previewResponseInUntitledDocument: boolean;
    public previewResponseSetUntitledDocumentLanguageByContentType: boolean;
    public includeAdditionalInfoInResponse: boolean;
    public hostCertificates: Map<string, HostCertificate>;
    public useTrunkedTransferEncodingForSendingFileContent: boolean;
    public suppressResponseBodyContentTypeValidationWarning: boolean;
    public previewOption: PreviewOption;

    public constructor() {
        workspace.onDidChangeConfiguration(() => {
            this.initializeSettings();
        });

        this.initializeSettings();
    }

    private initializeSettings() {
        let restClientSettings = this.getWorkspaceConfiguration();
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

        this.previewResponseInUntitledDocument = restClientSettings.get<boolean>("previewResponseInUntitledDocument", false);
        this.previewResponseSetUntitledDocumentLanguageByContentType = restClientSettings.get<boolean>("previewResponseSetUntitledDocumentLanguageByContentType", false);
        this.includeAdditionalInfoInResponse = restClientSettings.get<boolean>("includeAdditionalInfoInResponse", false);
        this.hostCertificates = restClientSettings.get<Map<string, HostCertificate>>("certificates", new Map<string, HostCertificate>());
        this.useTrunkedTransferEncodingForSendingFileContent = restClientSettings.get<boolean>("useTrunkedTransferEncodingForSendingFileContent", true);
        this.suppressResponseBodyContentTypeValidationWarning = restClientSettings.get<boolean>("suppressResponseBodyContentTypeValidationWarning", false);
        this.previewOption = ParsePreviewOptionStr(restClientSettings.get<string>("previewOption", "full"));

        let httpSettings = workspace.getConfiguration('http');
        this.proxy = httpSettings.get<string>('proxy', undefined);
        this.proxyStrictSSL = httpSettings.get<boolean>('proxyStrictSSL', false);
        this.enableTelemetry = httpSettings.get<boolean>('enableTelemetry', true);
    }

    private getWorkspaceConfiguration(): WorkspaceConfiguration {
        let editor = window.activeTextEditor;
        if (editor && editor.document) {
            return workspace.getConfiguration("rest-client", editor.document.uri);
        } else {
            return workspace.getConfiguration("rest-client");
        }
    }
}
