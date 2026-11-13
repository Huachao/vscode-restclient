# REST Client CE

[![Visual Studio Marketplace Version (short)](https://vsmarketplacebadges.dev/version-short/vscode-restclient.restclient.svg)](https://marketplace.visualstudio.com/items?itemName=vscode-restclient.restclient)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**Send HTTP requests from a `.http` file and read the response in Visual Studio Code.** No account, no cloud, no paywall, no telemetry.

REST Client was created by [Huachao Mao](https://github.com/Huachao) and reached 7.5 million installs. Its last release was 0.25.1 in June 2022. Since August 2026 it is maintained here, by the [vscode-restclient organisation](https://github.com/vscode-restclient), on the same code and the same `.http` format, under the same MIT license. Everything below still works exactly as Huachao documented it;

---

## Table of contents

- [REST Client CE](#rest-client-ce)
  - [Table of contents](#table-of-contents)
  - [What is new](#What-is-new)
  - [Features](#features)
  - [Elementary example](#elementary-example)
  - [Installation](#installation)
  - [Documentation](#documentation)
  - [Basic Example with variables](#basic-example-with-variables)
  - [Why REST Client Next?](#why-rest-client-next)
  - [Build \& Run locally](#build--run-locally)
  - [License](#license)
  - [Change Log](#change-log)
  - [Credits](#credits)
  - [Special Thanks](#special-thanks)
  - [Feedback](#feedback)

----

## What is new

What is new since [Huachao Mao](https://github.com/Huachao) 0.25.1 version. 
Full details in the [CHANGELOG](CHANGELOG.md); the longer story in docs.

- **Fake data**: `{{$faker internet.email}}` — any [Faker](https://fakerjs.dev) module, lazily loaded, same syntax as rest-client-next.
- **A test suite** (125 tests: 79 unit and 46 integration, run inside a real VS Code), **0 vulnerabilities** in production dependencies (from 75), **400 packages** (from 1,487), **telemetry removed**.
- **Bugs fixed**: the response not showing up in Cursor, a re-sent request with mangled headers, a JSONPath with several matches returning only the first, XPath request variables.
- **A terminal runner** for CI (`npx @vscode-restclient/cli api.http`, `--junit`, GitHub Action) that **runs a whole file in order**, with later requests using earlier responses, and checks **assertions written in the file** (`# @assert status == 200`). In the editor, Send Request shows the verdict of the assertions under the response.
- **The JetBrains format, complete**: `http-client.env.json` / `http-client.private.env.json`, `import ./other.http`, `run #name`, request variables across files, `{{$secret NAME}}`, `{{$uuid}}`, `{{$isoTimestamp}}`, `{{$random.integer(min,max)}}`.
- **Streaming**: `text/event-stream` painted as it arrives; `WEBSOCKET` requests.
- **The `QUERY` method** ([draft-ietf-httpbis-safe-method-w-body](https://www.ietf.org/archive/id/draft-ietf-httpbis-safe-method-w-body-05.html)): safe and idempotent like `GET`, but with a request body — highlighting, completion, snippet and terminal runner included.
- **Tools for agents**: language-model tools in VS Code and an MCP server (`restclient mcp`).
- The interface is available in English and Spanish.

Your `rest-client.*` settings, history, cookies and environments keep working unchanged.

---

## Features

- `HTTP` language support
- Send/Cancel/Rerun **HTTP requests** from `.http` and `.rest` files
- Compose _MULTIPLE_ requests in a single file (separated by `###` delimiter)
  - Preview response in a separate pane with syntax highlight
  - Save raw response and response body only to local disk
- Send **GraphQL query** and author **GraphQL variables** in editor
- Send **cURL command** in editor and copy HTTP request as `cURL command`
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
  - Interactively assign **prompt** custom variables per request
  - Provide system dynamic variables as`{{$guid}}` and more
  - Support environment switch ; 
    - environment variables in setting file
    - Support shared environment to provide variables that available in all environments
- Generate code snippets for **HTTP request** in languages like `Python`, `JavaScript` and more!
- Remember Cookies for subsequent requests
- Proxy support
- Send SOAP requests, as well as snippet support to build SOAP envelope easily
- Support for Markdown fenced code blocks with either `http` or `rest`

View more detail into [main features](https://vscode-restclient.github.io/vscode-restclient/features)

## Elementary example

Create a file named `test.http`:

``` http
GET https://httpbun.com/get
Authorization: Basic user:password
```

Click **Send Request** above the request line.

------------------------------------------------------------------------

## Installation

Install from the VS Code Marketplace\
Search for: **REST Client CE**

------------------------------------------------------------------------

## Documentation

Full documentation is available in [vscode-restclient.github.io](https://vscode-restclient.github.io/vscode-restclient/) github page.

------------------------------------------------------------------------

## Basic Example with variables

``` http
```http
@baseUrl = https://example.com
###

GET {{baseUrl}}/comments/1 HTTP/1.1

###

GET {{baseUrl}}/topics/1 HTTP/1.1

###

POST {{baseUrl}}/comments HTTP/1.1
content-type: application/json

{
    "name": "sample",
    "time": "Wed, 21 Oct 2015 18:27:50 GMT"
}
```
```

------------------------------------------------------------------------

## Basic Authentication Example

``` http
GET https://httpbin.org/basic-auth/user/pass
Authorization: Basic user pass
```

------------------------------------------------------------------------

## Why this fork exists?

The original is not broken; it is parked. Its repository has **529 open issues and 61 pull requests** that nobody merges, and the reason is concrete: the project had **zero tests**. Merging sixty-one patches from strangers without a safety net is a coin flip, so nobody did it for four years.

So the first thing this fork shipped was not a feature. It was the net.

|                                    | Original             | RestClient                                             |
| ---------------------------------- | -------------------- | ------------------------------------------------------ |
| Tests                              | 0                    | **123** (77 unit, 46 integration against a real server) |
| Vulnerabilities in production deps | 75 (6 critical)      | **0**                                                  |
| Packages                           | 1,487                | **400**                                                |
| Telemetry                          | Application Insights | **none**                                               |

`aws-amplify` — the whole AWS SDK, GraphQL, DataStore, ML predictions and all — was being pulled in for a Cognito login. It is now sixty lines that talk to Cognito over HTTP: **1,088 packages gone**.

There is already excellent forks especially one called [http-yac](https://github.com/anweber/vscode-httpyac), but our goal with REST Client CE is to preserve the original behaviour of REST Client and continue using its lightweight approach. So, meaning:

- Updated dependencies
- Modern TypeScript support
- Compatible with latest VS Code versions
- Fix the main issues
- Add functionalities as long as the compatibility is preserved

------------------------------------------------------------------------

## Build & Run locally

To build and run the extension locally for development:

```bash
npm install
# build once
npm run compile
# or watch for changes during development
npm run watch
```

To package a production build:

```bash
npm run package
```

------------------------------------------------------------------------

## License

[MIT License](LICENSE)

## Change Log

See CHANGELOG [here](CHANGELOG.md)

## Special Thanks

All the amazing [contributors](https://github.com/Huachao/vscode-restclient/graphs/contributors)❤️

## Feedback

Please provide feedback through the [GitHub Issue](https://github.com/Huachao/vscode-restclient/issues) system, or fork the repository and submit PR.
