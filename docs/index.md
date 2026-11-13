---
title: Home
description: REST Client CE allows you to send HTTP requests and view responses directly in VS Code.
---

REST Client CE allows you to send HTTP request and view the response in Visual Studio Code directly. It eliminates the need for a separate tool to test REST APIs and makes API testing convenient and efficient.

> This documentation is based on the original README from [Huachao's REST Client](https://github.com/Huachao/vscode-restclient).

## Main Features

REST Client CE provides a comprehensive set of features for API testing:

- Send/Cancel/Rerun **HTTP request** in editor and view response in a separate pane with syntax highlight
- Send **GraphQL query** and author **GraphQL variables** in editor
- Send **cURL command** in editor and copy HTTP request as `cURL command`
- Auto save and view/clear request history
- Compose _MULTIPLE_ requests in a single file (separated by `###` delimiter)
- View image response directly in pane
- Save raw response and response body only to local disk
- Fold and unfold response body
- Customize font(size/family/weight) in response preview
- Preview response with expected parts(_headers only_, _body only_, _full response_ and _both request and response_)
- Authentication support for:
  - Basic Auth
  - Digest Auth
  - SSL Client Certificates
  - Azure Active Directory v2  (v1 deprecated since 2023 was removed, use v2 instead)
  - OIDC
  - Microsoft Identity Platform
  - AWS Signature v4
  - AWS Cognito
- Environments and custom/system variables support
  - Use variables in any place of request(_URL_, _Headers_, _Body_)
  - Support **environment**, **file**, **request** and **prompt** custom variables
  - Interactively assign **prompt** custom variables per request
  - Auto completion and hover support for both **environment**, **file** and **request** custom variables
  - Diagnostic support for **request**, **file** and **prompt** custom variables
  - Go to definition support for **request** and **file** custom variables
  - Find all references support _ONLY_ for **file** custom variables
  - Provide system dynamic variables
  - Easily create/update/delete environments and environment variables in setting file
  - File variables can reference both custom and system variables
  - Support environment switch
  - Support shared environment to provide variables that available in all environments
- Generate code snippets for **HTTP request** in languages like `Python`, `JavaScript` and more!
- Remember Cookies for subsequent requests
- Proxy support
- Send SOAP requests, as well as snippet support to build SOAP envelope easily
- `HTTP` language support
  - `.http` and `.rest` file extensions support
  - Syntax highlight (Request and Response)
  - Auto completion for method, url, header, custom/system variables, mime types and so on
  - Comments (line starts with `#` or `//`) support
  - Support `json` and `xml` body indentation, comment shortcut and auto closing brackets
  - Code snippets for operations like `GET` and `POST`
  - Support navigate to symbol definitions(request and file level custom variable) in open `http` file
  - CodeLens support to add an actionable link to send request
  - Fold/Unfold for request block
- Support for Markdown fenced code blocks with either `http` or `rest`

## Quick Start

In editor, type an HTTP request as simple as below:

```http
https://example.com/comments/1
```

Or follow the standard [RFC 2616](http://www.w3.org/Protocols/rfc2616/rfc2616-sec5.html) including request method, headers, and body:

```http
POST https://example.com/comments HTTP/1.1
content-type: application/json

{
    "name": "sample",
    "time": "Wed, 21 Oct 2015 18:27:50 GMT"
}
```

To send a prepared request, you can:

- Click the `Send Request` link above the request
- Use the shortcut `Ctrl+Alt+R` (`Cmd+Alt+R` for macOS)
- Right-click in the editor and select `Send Request`
- Press `F1` and select/type `Rest Client: Send Request`

The response will be previewed in a separate webview panel inside Visual Studio Code.

![Demo]({{ '/assets/images/demo.gif' | relative_url }})
_Send request with REST Client CE demonstration_


## Documentation Sections

- **[Features]({{ '/features' | relative_url }})** - Detailed feature overview
- **[Usage]({{ '/usage' | relative_url }})** - How to use the REST Client
- **[Commands]({{ '/commands' | relative_url }})** - Complete command reference and shortcuts
- **[Authentication]({{ '/authentication' | relative_url }})** - Authentication methods and configuration
- **[Variables]({{ '/variables' | relative_url }})** - Environment, file, request, and system variables
- **[Settings]({{ '/settings' | relative_url }})** - Configuration settings and customization
- **[HTTP Language]({{ '/http-language' | relative_url }})** - HTTP language support details
- **[Tools]({{ '/tools' | relative_url }})** - Tools around vscode-restclient

## Migrating from REST Client

Nothing to do. The `.http` format is identical — JetBrains uses it too — and **your `rest-client.*` settings are still read**, so eight years of configuration keep working. Your history, cookies and environments are read from the same `~/.rest-client` folder, so you keep them too.

The interface is available in English and Spanish.

## Installation

Press `F1`, type `ext install` then search for `REST-client CE` (vscode-restclient.restclient).

Or install directly from the [Visual Studio Code Marketplace](https://marketplace.visualstudio.com/items?itemName=vscode-restclient.rest-client&ssr=false).
