import { CharacterPair, Event, EventEmitter, languages, ViewColumn, window, workspace } from 'vscode';
import configuration from '../../language-configuration.json';
import { getCurrentTextDocument } from '../utils/workspaceUtility';
import { Headers } from './base';
import { FormParamEncodingStrategy, fromString as ParseFormParamEncodingStr } from './formParamEncodingStrategy';
import { HostCertificate } from './hostCertificate';
import { fromString as ParseLogLevelStr, LogLevel } from './logLevel';
import { fromString as ParsePreviewOptionStr, PreviewOption } from './previewOption';

export interface IRestClientSettings {
    followRedirect: boolean;
    defaultHeaders: Headers;
    timeoutInMilliseconds: number;
    showResponseInDifferentTab: boolean;
    requestNameAsTabTitle: boolean;
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
    hostCertificates: Map<string, HostCertificate>;
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
    public defaultHeaders: Headers;
    public timeoutInMilliseconds: number;
    public showResponseInDifferentTab: boolean;
    public requestNameAsTabTitle: boolean;
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
    public hostCertificates: Map<string, HostCertificate>;
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
        if (!RestClientSettings._instance) {
            RestClientSettings._instance = new RestClientSettings();
        }

        return RestClientSettings._instance;
    }

    public readonly configurationUpdateEventEmitter = new EventEmitter<void>();

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
        const restClientSettings = workspace.getConfiguration("rest-client", document ? document.uri : null);
        this.followRedirect = restClientSettings.get<boolean>("followredirect", true);
        this.defaultHeaders = restClientSettings.get<Headers>("defaultHeaders",
                                                              {
                                                                  "User-Agent": "vscode-restclient",
                                                                  "Accept-Encoding": "gzip"
                                                              });
        this.showResponseInDifferentTab = restClientSettings.get<boolean>("showResponseInDifferentTab", false);
        this.requestNameAsTabTitle = restClientSettings.get<boolean>("requestNameAsTabTitle", false);
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
        this.previewColumn = this.parseColumn(restClientSettings.get<string>("previewColumn", "two"));
        this.previewResponsePanelTakeFocus = restClientSettings.get<boolean>("previewResponsePanelTakeFocus", true);
        this.hostCertificates = restClientSettings.get<Map<string, HostCertificate>>("certificates", new Map<string, HostCertificate>());
        this.disableHighlightResonseBodyForLargeResponse = restClientSettings.get<boolean>("disableHighlightResonseBodyForLargeResponse", true);
        this.disableAddingHrefLinkForLargeResponse = restClientSettings.get<boolean>("disableAddingHrefLinkForLargeResponse", true);
        this.largeResponseBodySizeLimitInMB = restClientSettings.get<number>("largeResponseBodySizeLimitInMB", 5);
        this.previewOption = ParsePreviewOptionStr(restClientSettings.get<string>("previewOption", "full"));
        this.formParamEncodingStrategy = ParseFormParamEncodingStr(restClientSettings.get<string>("formParamEncodingStrategy", "automatic"));
        this.enableTelemetry = restClientSettings.get<boolean>('enableTelemetry', true);
        this.addRequestBodyLineIndentationAroundBrackets = restClientSettings.get<boolean>('addRequestBodyLineIndentationAroundBrackets', true);
        this.decodeEscapedUnicodeCharacters = restClientSettings.get<boolean>('decodeEscapedUnicodeCharacters', false);
        this.logLevel = ParseLogLevelStr(restClientSettings.get<string>('logLevel', 'error'));
        this.enableSendRequestCodeLens = restClientSettings.get<boolean>('enableSendRequestCodeLens', true);
        this.enableCustomVariableReferencesCodeLens = restClientSettings.get<boolean>('enableCustomVariableReferencesCodeLens', true);
        languages.setLanguageConfiguration('http', { brackets: this.addRequestBodyLineIndentationAroundBrackets ? this.brackets : [] });

        const httpSettings = workspace.getConfiguration("http");
        this.proxy = httpSettings.get<string>('proxy', undefined);
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
