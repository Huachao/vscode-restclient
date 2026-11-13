---
title: Settings
description: Complete reference for REST Client CE configuration settings.
---

REST Client CE provides extensive configuration options to customize its behavior.

## Global Settings

---

title: Settings
description: Complete reference for REST Client CE configuration settings.

---

REST Client CE provides extensive configuration options to customize its behavior.

## Global Settings

### Data Storage & Isolation

| Setting                                | Type                          | Default  | Description                                                                                                                                                                     |
| -------------------------------------- | ----------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rest-client-next.dataStorageStrategy` | `project`, `shared`, `legacy` | `shared` | Defines where user data (history, cookies, responses) is stored. `project` isolates data inside a local `.rest-client/` folder. `shared` uses clean global storage. (See below) |

#### Storage Strategy Details

- **`project` (Recommended):** Creates a `.rest-client/` folder at the root of your active workspace directory. This isolates history, cookies, and tokens per project, keeping your environment perfectly clean and prevent data leakage between projects. You should add `/.rest-client/` to your `.gitignore`.
- **`shared`:** Uses VS Code's official `globalStorageUri` directory. This keeps your data global across all windows but guarantees zero pollution in your OS home profile directory (`~`).
- **`legacy`:** Keeps the historical backward-compatible behavior by reading/writing directly inside the centralized `~/.rest-client/` user home folder.

_Note: The active **Environment state** is always strictly isolated per window using native VS Code workspace state, regardless of this setting, to prevent accidental production executions._

### Network & Request

| Setting                                            | Type     | Default    | Description                                                            |
| -------------------------------------------------- | -------- | ---------- | ---------------------------------------------------------------------- |
| `rest-client.followredirect`                       | boolean  | `true`     | Follow HTTP 3xx responses as redirects                                 |
| `rest-client.timeoutinmilliseconds`                | number   | `0`        | Timeout in milliseconds (0 = infinity)                                 |
| `rest-client.rememberCookiesForSubsequentRequests` | boolean  | `true`     | Save cookies from `Set-Cookie` header and reuse in subsequent requests |
| `rest-client.proxySupport`                         | string   | `"system"` | Proxy support: `"off"`, `"on"`, `"system"` (use VS Code proxy)         |
| `rest-client.excludeHostsForProxy`                 | string[] | `[]`       | List of hosts to exclude when using proxy                              |

### Default Headers

`rest-client.defaultHeaders` - Object of header name/value pairs added to every request if not explicitly specified.

Default:

```json
{
    "User-Agent": "vscode-restclient",
    "Accept-Encoding": "gzip"
}
```

### Response Preview

| Setting                                         | Type                                          | Default    | Description                                                                               |
| ----------------------------------------------- | --------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| `rest-client.previewOption`                     | `"full" \| "headers" \| "body" \| "exchange"` | `"full"`   | What to preview: full response, headers only, body only, or both request and response     |
| `rest-client.previewResponse.showStatus`        | boolean                                       | `true`     | Indicates whether the HTTP status line (e.g., HTTP/1.1 200 OK) should be displayed        |
| `rest-client.previewResponse.showHeaders`       | boolean                                       | `true`     | Indicates whether the HTTP response headers should be displayed                           |
| `rest-client.previewResponseInUntitledDocument` | boolean                                       | `false`    | Preview response in untitled document (allows VS Code search/select) instead of HTML view |
| `rest-client.previewResponsePanelTakeFocus`     | boolean                                       | `true`     | Response panel takes focus after receiving response                                       |
| `rest-client.previewColumn`                     | `"current" \| "beside"`                       | `"beside"` | Where to show response: current column or side-by-side                                    |
| `rest-client.requestNameAsResponseTabTitle`     | boolean                                       | `false`    | Use request name as response tab title (only for HTML view)                               |

### Font Customization

| Setting                  | Type                                          | Default                                                                                               | Description                              |
| ------------------------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `rest-client.fontSize`   | number                                        | `13`                                                                                                  | Font size in pixels for response preview |
| `rest-client.fontFamily` | string                                        | `"Menlo, Monaco, Consolas, \"Droid Sans Mono\", \"Courier New\", monospace, \"Droid Sans Fallback\""` | Font family for response preview         |
| `rest-client.fontWeight` | `"normal" \| "bold" \| "lighter" \| "bolder"` | `"normal"`                                                                                            | Font weight for response preview         |

### Large Response Handling

| Setting                                                    | Type    | Default | Description                                        |
| ---------------------------------------------------------- | ------- | ------- | -------------------------------------------------- |
| `rest-client.disableHighlightResponseBodyForLargeResponse` | boolean | `true`  | Disable syntax highlighting for large responses    |
| `rest-client.disableAddingHrefLinkForLargeResponse`        | boolean | `true`  | Disable href links in large responses              |
| `rest-client.largeResponseBodySizeLimitInMB`               | number  | `5`     | Size threshold in MB to identify "large responses" |

### Environments & Variables

`rest-client.environmentVariables` - Object defining environments and their variables.

See [Variables]({{ '/variables' | relative_url }}) for complete documentation and examples.

```json
{
    "rest-client.environmentVariables": {
        "$shared": {
            "version": "v1"
        },
        "development": {
            "host": "localhost:3000",
            "apiKey": "dev-key"
        },
        "production": {
            "host": "api.example.com",
            "apiKey": "{% raw %}{{$processEnv PROD_API_KEY}}{% endraw %}"
        }
    }
}
```

### Certificate Configuration

`rest-client.certificates` - SSL/TLS certificates for different hosts.

```json
{
    "rest-client.certificates": {
        "localhost:8081": {
            "cert": "/path/to/client.crt",
            "key": "/path/to/client.key"
        },
        "example.com": {
            "pfx": "/path/to/cert.p12",
            "passphrase": "secret"
        }
    }
}
```

Paths can be:

- Absolute: `/home/user/certs/client.crt`
- Relative to workspace: `certs/client.crt`
- Relative to current `.http` file: `./certs/client.crt`

### MIME Type Mapping

`rest-client.mimeAndFileExtensionMapping` - Override default MIME type to file extension mapping when saving response bodies.

```json
{
    "rest-client.mimeAndFileExtensionMapping": {
        "application/atom+xml": "xml",
        "application/json": "json",
        "text/html": "html"
    }
}
```

### Content Disposition Filename

`rest-client.useContentDispositionFilename` - Use `filename=` from `Content-Disposition` header when saving response body. Default: `true`.

### Form Parameter Encoding

`rest-client.formParamEncodingStrategy` - Strategy for encoding `application/x-www-form-urlencoded` body.

Options:

- `"automatic"` - Detect and encode automatically (default)
- `"never"` - Treat provided body as-is
- `"always"` - Always encode (for special character issues)

### Request Body Indentation

`rest-client.addRequestBodyLineIndentationAroundBrackets` - Add line indentation around brackets (`{}`, `<>`, `[]`) when pressing Enter in request body. Default: `true`.

### Unicode Decoding

`rest-client.decodeEscapedUnicodeCharacters` - Decode escaped unicode characters in response body (e.g., `\u0041` → `A`). Default: `false`.

### Logging

`rest-client.logLevel` - Verbosity of logging in REST output panel.

Options:

- `"error"` - Errors only (default)
- `"warning"` - Errors and warnings
- `"info"` - Informational messages
- `"debug"` - Detailed debug output

## CodeLens Settings

CodeLens adds actionable links above requests in the editor.

| Setting                                              | Type    | Default                            | Description                                                                |
| ---------------------------------------------------- | ------- | ---------------------------------- | -------------------------------------------------------------------------- |
| `rest-client.enableSendRequestCodeLens`              | boolean | `true`                             | Enable/disable "Send Request" and "Send All Request Sequentially" CodeLens |
| `rest-client.enableCustomVariableReferencesCodeLens` | boolean | `true`                             | Enable/disable custom variable references CodeLens                         |

## Per-Request Settings

Override global settings for individual requests using special comments:

### `@note`

Add a confirmation note. Useful for critical requests.

```http
# @note This will delete all production data!
DELETE https://api.example.com/data
```

### `@no-redirect`

Don't follow 3xx redirects.

```http
# @no-redirect
GET https://example.com/redirect
```

### `@no-cookie-jar`

Don't save/use cookies from cookie jar for this request.

```http
# @no-cookie-jar
POST https://api.example.com/logout
```

Settings can use `#` or `//` syntax and must appear on their own line before the request.

## Suppress Warnings

`rest-client.suppressResponseBodyContentTypeValidationWarning` - Suppress warning when response body content-type doesn't match expected. Default: `false`.

## Proxy Configuration

The extension respects VS Code's proxy settings:

- `http.proxy` - Proxy URL (e.g., `http://proxy.example.com:8080`)
- `http.proxyStrictSSL` - Validate proxy SSL certificate (default: `true`)

Set `rest-client.proxySupport` to `"system"` (default) to use these. Set to `"on"` to use proxy even when no system proxy is configured. Set to `"off"` to disable proxy.

Exclude specific hosts via `rest-client excludeHostsForProxy`.

## Environment Variables Reference

When using `{% raw %}{{$processEnv %varName}}{% endraw %}`, the variable name lookup uses the environment variables configuration. This allows you to:

1. Define a mapping in settings: `"apiKeyEnv": "ACTUAL_API_KEY_NAME"`
2. Use `{% raw %}{{$processEnv %apiKeyEnv}}{% endraw %}` in requests
3. Change the actual environment variable per environment without modifying requests

## All Settings Quick Reference

```json
{
    "rest-client.followredirect": true,
    "rest-client.defaultHeaders": {
        "User-Agent": "vscode-restclient",
        "Accept-Encoding": "gzip"
    },
    "rest-client.timeoutinmilliseconds": 0,
    "rest-client.showResponseInDifferentTab": false,
    "rest-client.requestNameAsResponseTabTitle": false,
    "rest-client.rememberCookiesForSubsequentRequests": true,
    "rest-client.excludeHostsForProxy": [],
    "rest-client.fontSize": 13,
    "rest-client.fontFamily": "Menlo, Monaco, Consolas, \"Droid Sans Mono\", \"Courier New\", monospace, \"Droid Sans Fallback\"",
    "rest-client.fontWeight": "normal",
    "rest-client.environmentVariables": {},
    "rest-client.mimeAndFileExtensionMapping": {},
    "rest-client.previewResponseInUntitledDocument": false,
    "rest-client.certificates": {},
    "rest-client.suppressResponseBodyContentTypeValidationWarning": false,
    "rest-client.previewOption": "full",
    "rest-client.disableHighlightResponseBodyForLargeResponse": true,
    "rest-client.disableAddingHrefLinkForLargeResponse": true,
    "rest-client.largeResponseBodySizeLimitInMB": 5,
    "rest-client.previewColumn": "beside",
    "rest-client.previewResponsePanelTakeFocus": true,
    "rest-client.previewResponse.showStatus": true,
    "rest-client.previewResponse.showHeaders": true,
    "rest-client.formParamEncodingStrategy": "automatic",
    "rest-client.addRequestBodyLineIndentationAroundBrackets": true,
    "rest-client.decodeEscapedUnicodeCharacters": false,
    "rest-client.logLevel": "error",
    "rest-client.enableSendRequestCodeLens": true,
    "rest-client.enableCustomVariableReferencesCodeLens": true,
    "rest-client.useContentDispositionFilename": "true",
    "rest-client.proxySupport": "system",
    "rest-client-next.dataStorageStrategy": "project",
}
```

Copy this template to your `settings.json` and adjust as needed.
