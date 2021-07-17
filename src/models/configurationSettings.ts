import { CharacterPair, Event, EventEmitter, languages, ViewColumn, window, workspace } from 'vscode';
import configuration from '../../language-configuration.json';
import { getCurrentTextDocument } from '../utils/workspaceUtility';
import { HttpsOptions, RequestHeaders } from './base';
import { FormParamEncodingStrategy, fromString as ParseFormParamEncodingStr } from './formParamEncodingStrategy';
import { fromString as ParseLogLevelStr, LogLevel } from './logLevel';
import { fromString as ParsePreviewOptionStr, PreviewOption } from './previewOption';

export type HostCertificates = {
    [key: string]: HttpsOptions
};

interface IRestClientSettings {
    followRedirect: boolean;
    defaultHeaders: RequestHeaders;
    timeoutInMilliseconds: number;
    showResponseInDifferentTab: boolean;
    requestNameAsResponseTabTitle: boolean;
    proxy?: string;
    proxyStrictSSL: boolean;
    rememberCookiesForSubsequentRequests: boolean;
    enableTelemetry: boolean;
    excludeHostsForProxy: string[];
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    environmentVariables: { [key: string]: { [key: string]: string } };
    mimeAndFileExtensionMapping: { [key: string]: string };
    previewResponseInUntitledDocument: boolean;
    hostCertificates: HostCertificates;
    suppressResponseBodyContentTypeValidationWarning: boolean;
    previewOption: PreviewOption;
    disableHighlightResonseBodyForLargeResponse: boolean;
    disableAddingHrefLinkForLargeResponse: boolean;
    largeResponseBodySizeLimitInMB: number;
    previewColumn: ViewColumn;
    previewResponsePanelTakeFocus: boolean;
    formParamEncodingStrategy: FormParamEncodingStrategy;
    addRequestBodyLineIndentationAroundBrackets: boolean;
    decodeEscapedUnicodeCharacters: boolean;
    logLevel: LogLevel;
    enableSendRequestCodeLens: boolean;
    enableCustomVariableReferencesCodeLens: boolean;
}

export class RestClientSettings implements IRestClientSettings {
    public followRedirect: boolean;
    public defaultHeaders: RequestHeaders;
    public timeoutInMilliseconds: number;
    public showResponseInDifferentTab: boolean;
    public requestNameAsResponseTabTitle: boolean;
    public proxy?: string;
    public proxyStrictSSL: boolean;
    public rememberCookiesForSubsequentRequests: boolean;
    public enableTelemetry: boolean;
    public excludeHostsForProxy: string[];
    public fontSize?: number;
    public fontFamily?: string;
    public fontWeight?: string;
    public environmentVariables: { [key: string]: { [key: string]: string } };
    public mimeAndFileExtensionMapping: { [key: string]: string };
    public previewResponseInUntitledDocument: boolean;
    public hostCertificates: HostCertificates;
    public suppressResponseBodyContentTypeValidationWarning: boolean;
    public previewOption: PreviewOption;
    public disableHighlightResonseBodyForLargeResponse: boolean;
    public disableAddingHrefLinkForLargeResponse: boolean;
    public largeResponseBodySizeLimitInMB: number;
    public previewColumn: ViewColumn;
    public previewResponsePanelTakeFocus: boolean;
    public formParamEncodingStrategy: FormParamEncodingStrategy;
    public addRequestBodyLineIndentationAroundBrackets: boolean;
    public decodeEscapedUnicodeCharacters: boolean;
    public logLevel: LogLevel;
    public enableSendRequestCodeLens: boolean;
    public enableCustomVariableReferencesCodeLens: boolean;

    private readonly brackets: CharacterPair[];

    private static _instance: RestClientSettings;

    public static get Instance(): RestClientSettings {
        if (!this._instance) {
            this._instance = new RestClientSettings();
        }

        return this._instance;
    }

    private readonly configurationUpdateEventEmitter = new EventEmitter<void>();

    public get onDidChangeConfiguration(): Event<void> {
        return this.configurationUpdateEventEmitter.event;
    }

    private constructor() {
        this.brackets = configuration.brackets as CharacterPair[];
        workspace.onDidChangeConfiguration(() => {
            this.initializeSettings();
            this.configurationUpdateEventEmitter.fire();
        });
        window.onDidChangeActiveTextEditor(e => {
            if (e) {
                this.initializeSettings();
                this.configurationUpdateEventEmitter.fire();
            }
        });

        this.initializeSettings();
    }

    private initializeSettings() {
        const document = getCurrentTextDocument();
        const restClientSettings = workspace.getConfiguration("rest-client", document?.uri);
        this.followRedirect = restClientSettings.get<boolean>("followredirect", true);
        this.defaultHeaders = restClientSettings.get<RequestHeaders>("defaultHeaders",
                                                                     {
                                                                         "User-Agent": "vscode-restclient"
                                                                     });
        this.showResponseInDifferentTab = restClientSettings.get<boolean>("showResponseInDifferentTab", false);
        this.requestNameAsResponseTabTitle = restClientSettings.get<boolean>("requestNameAsResponseTabTitle", false);
        this.rememberCookiesForSubsequentRequests = restClientSettings.get<boolean>("rememberCookiesForSubsequentRequests", true);
        this.timeoutInMilliseconds = restClientSettings.get<number>("timeoutinmilliseconds", 0);
        if (this.timeoutInMilliseconds < 0) {
            this.timeoutInMilliseconds = 0;
        }
        this.excludeHostsForProxy = restClientSettings.get<string[]>("excludeHostsForProxy", []);
        this.fontSize = restClientSettings.get<number>("fontSize");
        this.fontFamily = restClientSettings.get<string>("fontFamily");
        this.fontWeight = restClientSettings.get<string>("fontWeight");

        this.environmentVariables = restClientSettings.get<{ [key: string]: { [key: string]: string } }>("environmentVariables", {});
        this.mimeAndFileExtensionMapping = restClientSettings.get<{ [key: string]: string }>("mimeAndFileExtensionMapping", {});

        this.previewResponseInUntitledDocument = restClientSettings.get<boolean>("previewResponseInUntitledDocument", false);
        this.previewColumn = this.parseColumn(restClientSettings.get<string>("previewColumn", "two"));
        this.previewResponsePanelTakeFocus = restClientSettings.get<boolean>("previewResponsePanelTakeFocus", true);
        this.hostCertificates = restClientSettings.get<HostCertificates>("certificates", {});
        this.disableHighlightResonseBodyForLargeResponse = restClientSettings.get<boolean>("disableHighlightResonseBodyForLargeResponse", true);
        this.disableAddingHrefLinkForLargeResponse = restClientSettings.get<boolean>("disableAddingHrefLinkForLargeResponse", true);
        this.largeResponseBodySizeLimitInMB = restClientSettings.get<number>("largeResponseBodySizeLimitInMB", 5);
        this.previewOption = ParsePreviewOptionStr(restClientSettings.get<string>("previewOption", "full"));
        this.formParamEncodingStrategy = ParseFormParamEncodingStr(restClientSettings.get<string>("formParamEncodingStrategy", "automatic"));
        this.enableTelemetry = restClientSettings.get<boolean>('enableTelemetry', true);
        this.suppressResponseBodyContentTypeValidationWarning = restClientSettings.get('suppressResponseBodyContentTypeValidationWarning', false);
        this.addRequestBodyLineIndentationAroundBrackets = restClientSettings.get<boolean>('addRequestBodyLineIndentationAroundBrackets', true);
        this.decodeEscapedUnicodeCharacters = restClientSettings.get<boolean>('decodeEscapedUnicodeCharacters', false);
        this.logLevel = ParseLogLevelStr(restClientSettings.get<string>('logLevel', 'error'));
        this.enableSendRequestCodeLens = restClientSettings.get<boolean>('enableSendRequestCodeLens', true);
        this.enableCustomVariableReferencesCodeLens = restClientSettings.get<boolean>('enableCustomVariableReferencesCodeLens', true);
        languages.setLanguageConfiguration('http', { brackets: this.addRequestBodyLineIndentationAroundBrackets ? this.brackets : [] });

        const httpSettings = workspace.getConfiguration("http");
        this.proxy = httpSettings.get<string>('proxy');
        this.proxyStrictSSL = httpSettings.get<boolean>('proxyStrictSSL', false);
    }

    private parseColumn(value: string): ViewColumn {
        value = value.toLowerCase();
        switch (value) {
            case 'current':
                return ViewColumn.Active;
            case 'beside':
            default:
                return ViewColumn.Beside;
        }
    }
}
