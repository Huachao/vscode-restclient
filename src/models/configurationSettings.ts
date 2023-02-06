import { CharacterPair, Event, EventEmitter, languages, ViewColumn, window, workspace } from 'vscode';
import configuration from '../../language-configuration.json';
import { getCurrentTextDocument } from '../utils/workspaceUtility';
import { RequestHeaders } from './base';
import { FormParamEncodingStrategy, fromString as ParseFormParamEncodingStr } from './formParamEncodingStrategy';
import { fromString as ParseLogLevelStr, LogLevel } from './logLevel';
import { fromString as ParsePreviewOptionStr, PreviewOption } from './previewOption';
import { RequestMetadata } from './requestMetadata';

export type HostCertificates = {
    [key: string]: {
        hostname?: string;
        cert?: string;
        key?: string;
        pfx?: string;
        passphrase?: string;
    }
};

export interface IRestClientSettings {
    readonly followRedirect: boolean;
    readonly defaultHeaders: RequestHeaders;
    readonly timeoutInMilliseconds: number;
    readonly showResponseInDifferentTab: boolean;
    readonly requestNameAsResponseTabTitle: boolean;
    readonly proxy?: string;
    readonly proxyStrictSSL: boolean;
    readonly rememberCookiesForSubsequentRequests: boolean;
    readonly enableTelemetry: boolean;
    readonly excludeHostsForProxy: string[];
    readonly fontSize?: number;
    readonly fontFamily?: string;
    readonly fontWeight?: string;
    readonly environmentVariables: { [key: string]: { [key: string]: string } };
    readonly mimeAndFileExtensionMapping: { [key: string]: string };
    readonly previewResponseInUntitledDocument: boolean;
    readonly hostCertificates: HostCertificates;
    readonly suppressResponseBodyContentTypeValidationWarning: boolean;
    readonly previewOption: PreviewOption;
    readonly disableHighlightResponseBodyForLargeResponse: boolean;
    readonly disableAddingHrefLinkForLargeResponse: boolean;
    readonly largeResponseBodySizeLimitInMB: number;
    readonly previewColumn: ViewColumn;
    readonly previewResponsePanelTakeFocus: boolean;
    readonly formParamEncodingStrategy: FormParamEncodingStrategy;
    readonly addRequestBodyLineIndentationAroundBrackets: boolean;
    readonly decodeEscapedUnicodeCharacters: boolean;
    readonly logLevel: LogLevel;
    readonly enableSendRequestCodeLens: boolean;
    readonly enableCustomVariableReferencesCodeLens: boolean;
    readonly useContentDispositionFilename: boolean;
}

export class SystemSettings implements IRestClientSettings {
    private _followRedirect: boolean;
    private _defaultHeaders: RequestHeaders;
    private _timeoutInMilliseconds: number;
    private _showResponseInDifferentTab: boolean;
    private _requestNameAsResponseTabTitle: boolean;
    private _proxy?: string;
    private _proxyStrictSSL: boolean;
    private _rememberCookiesForSubsequentRequests: boolean;
    private _enableTelemetry: boolean;
    private _excludeHostsForProxy: string[];
    private _fontSize?: number;
    private _fontFamily?: string;
    private _fontWeight?: string;
    private _environmentVariables: { [key: string]: { [key: string]: string } };
    private _mimeAndFileExtensionMapping: { [key: string]: string };
    private _previewResponseInUntitledDocument: boolean;
    private _hostCertificates: HostCertificates;
    private _suppressResponseBodyContentTypeValidationWarning: boolean;
    private _previewOption: PreviewOption;
    private _disableHighlightResponseBodyForLargeResponse: boolean;
    private _disableAddingHrefLinkForLargeResponse: boolean;
    private _largeResponseBodySizeLimitInMB: number;
    private _previewColumn: ViewColumn;
    private _previewResponsePanelTakeFocus: boolean;
    private _formParamEncodingStrategy: FormParamEncodingStrategy;
    private _addRequestBodyLineIndentationAroundBrackets: boolean;
    private _decodeEscapedUnicodeCharacters: boolean;
    private _logLevel: LogLevel;
    private _enableSendRequestCodeLens: boolean;
    private _enableCustomVariableReferencesCodeLens: boolean;
    private _useContentDispositionFilename: boolean;

    public get followRedirect() {
        return this._followRedirect;
    }

    public get defaultHeaders() {
        return this._defaultHeaders;
    }

    public get timeoutInMilliseconds() {
        return this._timeoutInMilliseconds;
    }

    public get showResponseInDifferentTab() {
        return this._showResponseInDifferentTab;
    }

    public get requestNameAsResponseTabTitle() {
        return this._requestNameAsResponseTabTitle;
    }

    public get proxy() {
        return this._proxy;
    }

    public get proxyStrictSSL() {
        return this._proxyStrictSSL;
    }

    public get rememberCookiesForSubsequentRequests() {
        return this._rememberCookiesForSubsequentRequests;
    }

    public get enableTelemetry() {
        return this._enableTelemetry;
    }

    public get excludeHostsForProxy() {
        return this._excludeHostsForProxy;
    }

    public get fontSize() {
        return this._fontSize;
    }

    public get fontFamily() {
        return this._fontFamily;
    }

    public get fontWeight() {
        return this._fontWeight;
    }

    public get environmentVariables() {
        return this._environmentVariables;
    }

    public get mimeAndFileExtensionMapping() {
        return this._mimeAndFileExtensionMapping;
    }

    public get previewResponseInUntitledDocument() {
        return this._previewResponseInUntitledDocument;
    }

    public get hostCertificates() {
        return this._hostCertificates;
    }

    public get suppressResponseBodyContentTypeValidationWarning() {
        return this._suppressResponseBodyContentTypeValidationWarning;
    }

    public get previewOption() {
        return this._previewOption;
    }

    public get disableHighlightResponseBodyForLargeResponse() {
        return this._disableHighlightResponseBodyForLargeResponse;
    }

    public get disableAddingHrefLinkForLargeResponse() {
        return this._disableAddingHrefLinkForLargeResponse;
    }

    public get largeResponseBodySizeLimitInMB() {
        return this._largeResponseBodySizeLimitInMB;
    }

    public get previewColumn() {
        return this._previewColumn;
    }

    public get previewResponsePanelTakeFocus() {
        return this._previewResponsePanelTakeFocus;
    }

    public get formParamEncodingStrategy() {
        return this._formParamEncodingStrategy;
    }

    public get addRequestBodyLineIndentationAroundBrackets() {
        return this._addRequestBodyLineIndentationAroundBrackets;
    }

    public get decodeEscapedUnicodeCharacters() {
        return this._decodeEscapedUnicodeCharacters;
    }

    public get logLevel() {
        return this._logLevel;
    }

    public get enableSendRequestCodeLens() {
        return this._enableSendRequestCodeLens;
    }

    public get enableCustomVariableReferencesCodeLens() {
        return this._enableCustomVariableReferencesCodeLens;
    }

    public get useContentDispositionFilename() {
        return this._useContentDispositionFilename;
    }

    private readonly brackets: CharacterPair[];

    private static _instance: SystemSettings;

    public static get Instance(): SystemSettings {
        if (!this._instance) {
            this._instance = new SystemSettings();
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
        this._followRedirect = restClientSettings.get<boolean>("followredirect", true);
        this._defaultHeaders = restClientSettings.get<RequestHeaders>("defaultHeaders",
                                                                     {
                                                                         "User-Agent": "vscode-restclient"
                                                                     });
        this._showResponseInDifferentTab = restClientSettings.get<boolean>("showResponseInDifferentTab", false);
        this._requestNameAsResponseTabTitle = restClientSettings.get<boolean>("requestNameAsResponseTabTitle", false);
        this._rememberCookiesForSubsequentRequests = restClientSettings.get<boolean>("rememberCookiesForSubsequentRequests", true);
        this._timeoutInMilliseconds = restClientSettings.get<number>("timeoutinmilliseconds", 0);
        if (this._timeoutInMilliseconds < 0) {
            this._timeoutInMilliseconds = 0;
        }
        this._excludeHostsForProxy = restClientSettings.get<string[]>("excludeHostsForProxy", []);
        this._fontSize = restClientSettings.get<number>("fontSize");
        this._fontFamily = restClientSettings.get<string>("fontFamily");
        this._fontWeight = restClientSettings.get<string>("fontWeight");

        this._environmentVariables = restClientSettings.get<{ [key: string]: { [key: string]: string } }>("environmentVariables", {});
        this._mimeAndFileExtensionMapping = restClientSettings.get<{ [key: string]: string }>("mimeAndFileExtensionMapping", {});

        this._previewResponseInUntitledDocument = restClientSettings.get<boolean>("previewResponseInUntitledDocument", false);
        this._previewColumn = this.parseColumn(restClientSettings.get<string>("previewColumn", "two"));
        this._previewResponsePanelTakeFocus = restClientSettings.get<boolean>("previewResponsePanelTakeFocus", true);
        this._hostCertificates = restClientSettings.get<HostCertificates>("certificates", {});
        this._disableHighlightResponseBodyForLargeResponse = restClientSettings.get<boolean>("disableHighlightResponseBodyForLargeResponse", true);
        this._disableAddingHrefLinkForLargeResponse = restClientSettings.get<boolean>("disableAddingHrefLinkForLargeResponse", true);
        this._largeResponseBodySizeLimitInMB = restClientSettings.get<number>("largeResponseBodySizeLimitInMB", 5);
        this._previewOption = ParsePreviewOptionStr(restClientSettings.get<string>("previewOption", "full"));
        this._formParamEncodingStrategy = ParseFormParamEncodingStr(restClientSettings.get<string>("formParamEncodingStrategy", "automatic"));
        this._enableTelemetry = restClientSettings.get<boolean>('enableTelemetry', true);
        this._suppressResponseBodyContentTypeValidationWarning = restClientSettings.get('suppressResponseBodyContentTypeValidationWarning', false);
        this._addRequestBodyLineIndentationAroundBrackets = restClientSettings.get<boolean>('addRequestBodyLineIndentationAroundBrackets', true);
        this._decodeEscapedUnicodeCharacters = restClientSettings.get<boolean>('decodeEscapedUnicodeCharacters', false);
        this._logLevel = ParseLogLevelStr(restClientSettings.get<string>('logLevel', 'error'));
        this._enableSendRequestCodeLens = restClientSettings.get<boolean>('enableSendRequestCodeLens', true);
        this._enableCustomVariableReferencesCodeLens = restClientSettings.get<boolean>('enableCustomVariableReferencesCodeLens', true);
        this._useContentDispositionFilename = restClientSettings.get<boolean>('useContentDispositionFilename', true);
        languages.setLanguageConfiguration('http', { brackets: this._addRequestBodyLineIndentationAroundBrackets ? this.brackets : [] });

        const httpSettings = workspace.getConfiguration("http");
        this._proxy = httpSettings.get<string>('proxy');
        this._proxyStrictSSL = httpSettings.get<boolean>('proxyStrictSSL', false);
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

export class RequestSettings implements Partial<IRestClientSettings> {

    private _followRedirect?: boolean = undefined;

    private _rememberCookiesForSubsequentRequests?: boolean = undefined;

    public get followRedirect() {
        return this._followRedirect;
    }

    public get rememberCookiesForSubsequentRequests() {
        return this._rememberCookiesForSubsequentRequests;
    }

    public constructor(metadatas: Map<RequestMetadata, string | undefined>) {
        if (metadatas.has(RequestMetadata.NoRedirect)) {
            this._followRedirect = false;
        } else if (metadatas.has(RequestMetadata.NoCookieJar)) {
            this._rememberCookiesForSubsequentRequests = false;
        }
    }
}

export class RestClientSettings implements IRestClientSettings {

    public get followRedirect() {
        return this.requestSettings.followRedirect ?? this.systemSettings.followRedirect;
    }

    public get defaultHeaders() {
        return this.systemSettings.defaultHeaders;
    }

    public get timeoutInMilliseconds() {
        return this.systemSettings.timeoutInMilliseconds;
    }

    public get showResponseInDifferentTab() {
        return this.systemSettings.showResponseInDifferentTab;
    }

    public get requestNameAsResponseTabTitle() {
        return this.systemSettings.requestNameAsResponseTabTitle;
    }

    public get proxy() {
        return this.systemSettings.proxy;
    }

    public get proxyStrictSSL() {
        return this.systemSettings.proxyStrictSSL;
    }

    public get rememberCookiesForSubsequentRequests() {
        return this.requestSettings.rememberCookiesForSubsequentRequests ?? this.systemSettings.rememberCookiesForSubsequentRequests;
    }

    public get enableTelemetry() {
        return this.systemSettings.enableTelemetry;
    }

    public get excludeHostsForProxy() {
        return this.systemSettings.excludeHostsForProxy;
    }

    public get fontSize() {
        return this.systemSettings.fontSize;
    }

    public get fontFamily() {
        return this.systemSettings.fontFamily;
    }

    public get fontWeight() {
        return this.systemSettings.fontWeight;
    }

    public get environmentVariables() {
        return this.systemSettings.environmentVariables;
    }

    public get mimeAndFileExtensionMapping() {
        return this.systemSettings.mimeAndFileExtensionMapping;
    }

    public get previewResponseInUntitledDocument() {
        return this.systemSettings.previewResponseInUntitledDocument;
    }

    public get hostCertificates() {
        return this.systemSettings.hostCertificates;
    }

    public get suppressResponseBodyContentTypeValidationWarning() {
        return this.systemSettings.suppressResponseBodyContentTypeValidationWarning;
    }

    public get previewOption() {
        return this.systemSettings.previewOption;
    }

    public get disableHighlightResponseBodyForLargeResponse() {
        return this.systemSettings.disableHighlightResponseBodyForLargeResponse;
    }

    public get disableAddingHrefLinkForLargeResponse() {
        return this.systemSettings.disableAddingHrefLinkForLargeResponse;
    }

    public get largeResponseBodySizeLimitInMB() {
        return this.systemSettings.largeResponseBodySizeLimitInMB;
    }

    public get previewColumn() {
        return this.systemSettings.previewColumn;
    }

    public get previewResponsePanelTakeFocus() {
        return this.systemSettings.previewResponsePanelTakeFocus;
    }

    public get formParamEncodingStrategy() {
        return this.systemSettings.formParamEncodingStrategy;
    }

    public get addRequestBodyLineIndentationAroundBrackets() {
        return this.systemSettings.addRequestBodyLineIndentationAroundBrackets;
    }

    public get decodeEscapedUnicodeCharacters() {
        return this.systemSettings.decodeEscapedUnicodeCharacters;
    }

    public get logLevel() {
        return this.systemSettings.logLevel;
    }

    public get enableSendRequestCodeLens() {
        return this.systemSettings.enableSendRequestCodeLens;
    }

    public get enableCustomVariableReferencesCodeLens() {
        return this.systemSettings.enableCustomVariableReferencesCodeLens;
    }

    public get useContentDispositionFilename() {
        return this.systemSettings.useContentDispositionFilename;
    }

    private readonly systemSettings = SystemSettings.Instance;

    public constructor(private readonly requestSettings: RequestSettings) {
    }
}
