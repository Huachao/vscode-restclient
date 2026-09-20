import type { IRestClientSettings } from '../models/configurationSettings';
import { FormParamEncodingStrategy } from '../models/formParamEncodingStrategy';
import { LogLevel } from '../models/logLevel';
import { PreviewOption } from '../models/previewOption';

/**
 * Ajustes para ejecutar fuera del editor.
 *
 * Toma los valores por defecto de la extensión, salvo lo que no tiene sentido
 * en una terminal (columnas de vista previa, tipografías). Se declara aquí, y
 * no se lee de ningún sitio, porque un fichero que se ejecuta en integración
 * continua debe comportarse igual en todas las máquinas.
 */
export function ajustesMinimos(): IRestClientSettings {
    return {
        followRedirect: true,
        defaultHeaders: { 'User-Agent': 'vscode-restclient' },
        timeoutInMilliseconds: 0,
        showResponseInDifferentTab: false,
        requestNameAsResponseTabTitle: false,
        proxy: undefined,
        proxyStrictSSL: false,
        rememberCookiesForSubsequentRequests: true,
        excludeHostsForProxy: [],
        environmentVariables: {},
        mimeAndFileExtensionMapping: {},
        previewResponseInUntitledDocument: false,
        hostCertificates: {},
        oidcCertificates: {},
        oidcScopes: [],
        suppressResponseBodyContentTypeValidationWarning: true,
        previewOption: PreviewOption.Full,
        disableHighlightResponseBodyForLargeResponse: true,
        disableAddingHrefLinkForLargeResponse: true,
        largeResponseBodySizeLimitInMB: 5,
        previewColumn: 1,
        previewResponsePanelTakeFocus: false,
        formParamEncodingStrategy: FormParamEncodingStrategy.Automatic,
        addRequestBodyLineIndentationAroundBrackets: true,
        decodeEscapedUnicodeCharacters: false,
        logLevel: LogLevel.Error,
        enableSendRequestCodeLens: false,
        enableCustomVariableReferencesCodeLens: false,
        useContentDispositionFilename: false
    };
}
