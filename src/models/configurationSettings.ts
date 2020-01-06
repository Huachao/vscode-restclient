import { DocumentWrapper } from "../utils/DocumentWrapper";
import { MyEventEmitter } from "../utils/myEventEmitter";
import { RequestHeaders } from './base';
import { FormParamEncodingStrategy } from './formParamEncodingStrategy';
import { HostCertificate } from './hostCertificate';
import { LogLevel } from './logLevel';
import { PreviewOption } from './previewOption';

export abstract class RestClientSettings {
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
    environmentVariables: Map<string, Map<string, string>>;
    mimeAndFileExtensionMapping: Map<string, string>;
    previewResponseInUntitledDocument: boolean;
    hostCertificates: Map<string, HostCertificate>;
    suppressResponseBodyContentTypeValidationWarning: boolean;
    previewOption: PreviewOption;
    disableHighlightResonseBodyForLargeResponse: boolean;
    disableAddingHrefLinkForLargeResponse: boolean;
    largeResponseBodySizeLimitInMB: number;
    // previewColumn: ViewColumn;
    previewResponsePanelTakeFocus: boolean;
    formParamEncodingStrategy: FormParamEncodingStrategy;
    addRequestBodyLineIndentationAroundBrackets: boolean;
    decodeEscapedUnicodeCharacters: boolean;
    logLevel: LogLevel;
    enableSendRequestCodeLens: boolean;
    enableCustomVariableReferencesCodeLens: boolean;

    static Instance: RestClientSettings;
    abstract getRootFsPath(): string | undefined;
    abstract getRootPath(): string | undefined;
    abstract showWarningMessage(message: string): void;
    abstract getCurrentHttpFileName(): string | undefined;
    abstract getCurrentDocumentWrapper(): DocumentWrapper | undefined;
    abstract getEmitter<T>(): MyEventEmitter<T>;
}