# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.2](https://github.com/vscode-restclient/vscode-restclient/compare/v1.3.1...v1.3.2) (2026-11-04)


### Bug Fixes

* AWS Signature v4 sends the request and signs its real path ([#48](https://github.com/vscode-restclient/vscode-restclient/issues/48)) ([9dc6f7e](https://github.com/vscode-restclient/vscode-restclient/commit/9dc6f7e63447d189a6639c85c2e10b2a8f300fa8))
* **deps:** follow-redirects 1.16.1 and sanitize-html 2.18.1 close two… ([#49](https://github.com/vscode-restclient/vscode-restclient/issues/49)) ([5519972](https://github.com/vscode-restclient/vscode-restclient/commit/5519972445a4a629cfb0760b3158c98aed2ee6bf))
* **deps:** follow-redirects 1.16.2 closes GHSA-mrwp-f3q8-3g9p ([#51](https://github.com/vscode-restclient/vscode-restclient/issues/51)) ([1e543ab](https://github.com/vscode-restclient/vscode-restclient/commit/1e543ab4dcba030dd284ba978dc9fe32b1d94628))

## [1.3.1](https://github.com/vscode-restclient/vscode-restclient/compare/v1.3.0...v1.3.1) (2026-10-18)


### Bug Fixes

* resolve certificate paths relative to the .http file when the workspace has no match ([#45](https://github.com/vscode-restclient/vscode-restclient/issues/45)) ([2308579](https://github.com/vscode-restclient/vscode-restclient/commit/230857938d02bdb7b8acbbd13e00c6bbe2a16432))

## [1.3.0](https://github.com/vscode-restclient/vscode-restclient/compare/v1.2.1...v1.3.0) (2026-10-17)


### Features

* support wildcard host keys in rest-client.certificates ([#27](https://github.com/vscode-restclient/vscode-restclient/issues/27)) ([e238139](https://github.com/vscode-restclient/vscode-restclient/commit/e238139d1d0750e4e296da995a82e833191aeade))

## [1.2.1](https://github.com/vscode-restclient/vscode-restclient/compare/v1.2.0...v1.2.1) (2026-10-16)


### Bug Fixes

* the MCP server returns the body and 1-based lines; the action and the docs point here; English demo ([#40](https://github.com/vscode-restclient/vscode-restclient/issues/40)) ([752b4c3](https://github.com/vscode-restclient/vscode-restclient/commit/752b4c3abf02322e84ae47d10c9b37e6313ed451))

## [1.2.0] - 2026-09-14

First release of the community continuation, published as `vscode-restclient.restclient`.

### Added

- **Assertions in the editor** (#34): Send Request now checks the `# @assert` lines of the request and shows the verdict under the response, one line per assertion with the actual value for a failure, and a count in the status bar. A `run #name` block keeps its own assertions, as in the runner. Nothing blocks on a failure, and the body, the history and the request variables see the response as it came. Until now only the runner evaluated them, and the README said otherwise.
- **The `QUERY` method**, as defined in [draft-ietf-httpbis-safe-method-w-body](https://www.ietf.org/archive/id/draft-ietf-httpbis-safe-method-w-body-05.html): safe and idempotent like `GET`, but able to carry a request body for queries too complex for a URL. Recognised by the parser, highlighted, offered in completion, with a `query` snippet, and supported by the terminal runner as well. Backported from the upstream pull request [#1438](https://github.com/Huachao/vscode-restclient/pull/1438) by @mikekistler, which never landed there. Asked for in #16.
- **`{{$faker module.property [params]}}`** — fake values in requests (`{{$faker internet.email}}`, `{{$faker string.alphanumeric 8}}`), ported from [rest-client-next](https://github.com/tutilus/vscode-restclientnext) with the same syntax. In the editor the library loads lazily: nothing is paid at activation, only the first time a file resolves a `$faker`; only the English locale ships. The terminal runner supports the same syntax (its single-file bundle carries faker inside). Upstream #1412.

### Fixed

- **Requests through a proxy** (#32): with `http.proxy` set, no request got out (`Expected the options.agent properties to be http, https or http2`). The proxy agent was handed to got in a form got 11 rejects. And the agents themselves, `http-proxy-agent` and `https-proxy-agent` 2.x, replaced `https.request` with a version that broke every https request this extension sent afterwards, proxied or not. Both are now 7.x, which patches nothing. Where this extension's agent is the one in use (VS Code's own proxy layer, `http.proxySupport`, discards it for anything that is not a loopback address unless it is set to `off` or `fallback`): credentials in the proxy URL are sent to the proxy, a redirect between http and https stays behind it, and an `https://` proxy is reached over TLS, with `http.proxyStrictSSL` deciding whether its certificate is checked. Upstream's master still has the bug.
- **Basic auth with `:` or spaces in the password** (upstream #1419): `Authorization: Basic admin:it's a total eclipse` used to arrive truncated, and the header is now built here instead of letting `got` put the credentials in the URL, which escaped them (`it's%20a%20total%3A%20eclipse`). Ported from rest-client-next.
- **Completion inside `{{ }}`**: picking a variable after typing `{{` produced `{{{{variable}}}}`. The proposal now replaces what is between the braces, and system variables can be filtered with or without the `$`. Ported from rest-client-next.

### Changed

- The original **`rest-client.*` command IDs are back** (`rest-client.request`, `rest-client.rerun-last-request`, … — all 19 of them, keybindings included): they are public API, used from keybindings.json, tasks.json and other extensions via `executeCommand`. The two commands this project added follow the same prefix (`rest-client.set-secret`, `rest-client.delete-secret`). The internal document-link command stays under a distinct prefix on purpose: sharing it is what made links open in the other extension when both were installed. If `humao.rest-client` is installed alongside, activation no longer breaks on the duplicate registrations — you get one clear warning asking to disable one of the two. The IDs are frozen by `commandIds.test.ts`, so renaming one by accident fails the suite.
- The extension is called **REST Client CE** (`displayName`). It was going to be plain **REST Client**, but the Marketplace does not allow a display name another extension holds, `humao.rest-client` holds that one, and Microsoft, asked twice, makes no exceptions. "CE" is the usual way to say community edition, and the name still starts with the words people search for. The README is Huachao Mao's original reference, with a summary of what changed since 0.25.1 on top and one addition: AWS Cognito, supported since 0.24 but never documented. The HttpKeeper README moved to `docs/HTTPKEEPER.md` (and `docs/HTTPKEEPER.es.md`). Development now happens in the [vscode-restclient organisation](https://github.com/vscode-restclient/vscode-restclient).
- **The extension id is `vscode-restclient.restclient`.** It was going to be `vscode-restclient.rest-client`, but the Marketplace refuses to create an extension whose `name` another publisher already holds — `humao.rest-client` has had it since 2016 — and the 1.2.0 release run found that out the hard way. Everything that matters for migrating is unaffected. Settings are still `rest-client.*`, the commands are still `rest-client.*`, and history, cookies and environments still live in `~/.rest-client`. The audit now asks the gallery whether the name and the display name can be created, so this fails in a second instead of eleven minutes into a release.
- **The codebase is moving to English.** This project began as a fork one person maintained alone, and the code it added carried Spanish names — `aserciones.ts`, `entorno.avisar()`, `--continuar`. That was free when nobody else read it and a tax once this became a shared base. As of this release the file names, the identifiers, the comments in the extension and the runner and everything the runner and the extension print are English, and English is the convention from here on. The tests (their descriptions and comments) and the comments and output of the maintenance scripts under `scripts/` are still Spanish and follow in a second pass. Asked for in #22.
- **Two runner flags are renamed**: `--continuar` is now `--continue` and `restclient mcp --raiz` is now `--root`. The WebSocket transcript reports `x-closed-by: timeout | server` instead of `tiempo | servidor`, the `--json` report uses English keys throughout (`name`, `status`, `assertions`, `passed`, `actual`, `file`, `steps`), and so does the MCP tool `list_requests` (`name`, `method`, `url`, `line`). The runner's messages are English too (`2 requests, all green`, `FAIL`). Nothing published carried the old names: these are `@vscode-restclient/cli`, which has never shipped. `httpkeeper-cli` keeps the Spanish ones for good.
- **The runner rejects what it does not understand** (exit code 2) instead of ignoring it: an unknown option, a second file (only the last one used to run, so `restclient tests/*.http` came back green having run a single file), or an option where a value was expected (`--junit --json` used to write the report into a file called `--json`). The two renamed flags say what they are called now, and `--` marks the end of the options. `restclient mcp` is strict in the same way: an argument it does not understand, or `--root` given twice, stops the server rather than leaving it rooted at the current directory.
- **The terminal runner is `restclient`, published as `@vscode-restclient/cli`** (`npx @vscode-restclient/cli api.http`). Secrets read from the environment follow the new name: `RESTCLIENT_SECRET_<NAME>`. The GitHub action ships from this repository and downloads the runner from its releases. `httpkeeper-cli` stays on npm and will be deprecated pointing here once this version is out — not before, so the notice never sends anyone to a package that does not exist yet.
- **`HTTPKEEPER_HOME` is gone.** It existed to keep the data of two extensions apart, and this one has never shipped under that name. History, cookies and environments still live in `~/.rest-client`, and `VSC_REST_CLIENT_HOME` still overrides it — which is the variable someone coming from REST Client would already have set.
- `THIRD-PARTY-NOTICES.txt` is generated from the real production dependency tree (`scripts/generate-notices.mjs`), and the audit fails if a dependency changes without regenerating it.

[1.2.0]: https://github.com/vscode-restclient/vscode-restclient/releases/tag/v1.2.0

## [1.1.1] - 2026-08-27

### Changed

- The npm package is **`httpkeeper-cli`** (`npx httpkeeper-cli api.http`): npm refuses `httpkeeper` as too similar to an unrelated `http-keeper`. The command it installs is still `httpkeeper`. READMEs updated accordingly.

[1.1.1]: https://github.com/TecniartGalicia/httpkeeper/releases/tag/v1.1.1

## [1.1.0] - 2026-08-27

Four things the original's users had been asking for since 2018, in one release. Everything is backwards compatible: a 1.0.0 file runs unchanged.

### Added

- **JetBrains `.http` format, complete.** `http-client.env.json` and `http-client.private.env.json` next to the file (the private one wins and belongs in `.gitignore`); `import ./other.http` and `run #name`; request variables across files (`{{login.response.body.$.token}}` resolves in the file that imports the one with `login`); and the JetBrains aliases `{{$uuid}}`, `{{$isoTimestamp}}`, `{{$random.integer(min,max)}}`. Upstream #229, #627, #182, #845, #1148, #943, #402.
- **`{{$secret NAME}}`.** The value lives in the editor's encrypted secret storage, never in the file. Asked for the first time it is used; `HttpKeeper: Set secret` and `HttpKeeper: Delete secret` manage them. In the runner: `--secret NAME=value` or `HTTPKEEPER_SECRET_NAME`. Upstream #279.
- **`text/event-stream` painted as it arrives.** The response panel opens with the first event and grows; cancelling keeps what was received. Assertions `sse.count`, `sse.first`, `sse.last`. The runner reads a stream to its end or to `--timeout`. Upstream #493.
- **`WEBSOCKET url`** with the JetBrains syntax: messages in the body separated by `===`, `# @timeout ms` to decide how long to listen, a transcript as the response (`>>` sent, `<<` received, status 101). Assertions `ws.count`, `ws.first`, `ws.last`. Uses the WebSocket built into Node 22+, no dependency. Upstream #173.
- **`# @timeout ms`** as a per-request metadata, for HTTP too.
- **Tools for agents inside VS Code.** `#httpkeeper` lists the requests of a file and sends one by name from Copilot Chat or any language-model participant; sending asks for confirmation first. Files outside the workspace are refused. On VS Code 1.101+, the extension also announces its MCP server to the agent mode with no configuration.
- **`httpkeeper mcp`**: an MCP server over stdio (no dependencies) with `list_requests`, `send_request` and `run_http_file`, for Claude Code, Cursor and any other agent. It only reads files under the root it was started with and never writes to disk.
- **The runner everywhere.** `--junit report.xml` for GitHub/GitLab test dashboards; pasted `curl` commands; multipart bodies with `< file` and `<@ file` (variables substituted); the `httpkeeper` package on npm (`npx httpkeeper-cli api.http`); and a GitHub Action, `TecniartGalicia/httpkeeper@v1`, that downloads the runner from the release and runs a file.
- `HttpKeeper: Switch environment` accepts the environment name as an argument, for automation.

### Fixed

- `# @no-cookie-jar` was ignored when `# @no-redirect` was present on the same request (an `else if` in the original).
- An `import` line was parsed as a request.
- The `{{$shared x}}` mapping wrote back into the settings object.

### Changed

- The runner's `--timeout` (default 30 s) now applies to the whole response, and a stream that does not end is cut there with what arrived so far as the body.
- Tests: 52 (24 unit, 28 integration against a real server, including an SSE endpoint and a hand-written WebSocket echo server).

[1.1.0]: https://github.com/TecniartGalicia/httpkeeper/releases/tag/v1.1.0

## [1.0.0] - 2026-08-26

First release of HttpKeeper, a maintained fork of [REST Client](https://github.com/Huachao/vscode-restclient) 0.25.1 by Huachao Mao (MIT), which has had no release since June 2022.

Everything REST Client did still works, with the same `.http` format and the same settings. What follows is what changed.

### Added

- **Run all requests in a file, in order** (+62 votes upstream). Later requests use what earlier ones returned; a failure stops the run unless you ask it to continue.
- **Assertions written in the file** (+59 votes upstream): `# @assert status == 200`, with seven operators over status, time, headers and JSON body. They live in `@` comments, so any other tool that reads the format ignores them.
- **A terminal runner** (+44 votes upstream): `httpkeeper api.http` runs the same file outside the editor, exits 0 or 1, and takes `--json`, `--var` and `--continuar`. Enough for CI.
- Spanish translation of the whole interface: commands, settings, marketplace description, status bar, code lenses, dialogs and diagnostics.
- `header.x` is accepted as well as `headers.x` in assertions, and an assertion whose subject is not recognised now says so instead of comparing against an empty string — with `!=` it used to pass and the file looked green.

### Fixed

- **The response did not show up in Cursor** (upstream PR #1440). The code assumed `window.activeTextEditor.viewColumn` exists; there it can be `undefined`, and nothing happened when you sent a request.
- **Re-sending a request carried mangled headers** (upstream PR #1432, issue #682 from 2021). Preparation now works on a copy.
- **A JSONPath matching several values returned only the first**, silently (upstream PR #853).
- **XPath in request variables was broken** by the move to `@xmldom/xmldom`, which requires an explicit MIME type. Caught by the test suite before release.
- **Three leftovers from the rename**, all invisible to the compiler and visible the moment you open a response: the response panel loaded a stylesheet under its old name and rendered unstyled, the file links in a `.http` document invoked `rest-client._openDocumentLink` (with REST Client installed, the other extension answered), and the response tab icon pointed at a file that no longer exists. The audit now checks that every resource the code asks for exists and travels inside the package.
- Diagnostics were only recalculated when a `rest-client.*` setting changed, never for `httpkeeper.*`.

### Changed

- **Telemetry removed entirely**: file, decorator, setting, instrumentation key and dependency. The extension makes no network request other than the ones you write.
- **`aws-amplify` replaced** by sixty lines that talk to Cognito over HTTP. It was pulling the whole AWS SDK — GraphQL, DataStore, ML predictions, pubsub — for a login: **1,088 packages removed**.
- **Zero vulnerabilities** in production dependencies, down from 75 (6 critical, 24 high). `axios` and `form-data` are pinned through overrides because the package that pulls them, `adal-node`, is abandoned by Microsoft; `uuid` moved from 3 to 11.
- `xmldom` migrated to `@xmldom/xmldom`; `jsonpath-plus` and `httpsnippet` updated.
- Own icon and identity. No asset from the original project ships here.
- `THIRD-PARTY-NOTICES.txt` ships in the package with the license of every bundled dependency (171 packages; all MIT, ISC, BSD or Apache-2.0).
- The default `User-Agent` is now `httpkeeper`.
- History, cookies and environments are still read from `~/.rest-client`, on purpose, so migrating keeps them. `HTTPKEEPER_HOME` overrides it if you want the two extensions kept apart.

### Rejected, after testing them

- **PR #1396, «Fix IPv6 Support for Localhost»** — it does the opposite. With the patch, a request to `localhost` against a server listening only on `::1` does not arrive; without it, it does. Test P-27 stays in the suite guarding the correct behaviour.
- **PR #532, «Eval system variable»** (the most upvoted that still applies) — it runs shell commands taken from the `.http` file. That turns any request file into arbitrary code execution: clone someone's repository, open their file, press Send Request. Rejected as written; the reasoning and what it would need is in `docs/PRS-REVISADOS.md`.

### Known limitations

- `adal-node` (Azure AD) is deprecated upstream by Microsoft. Migrating it cannot be tested without Azure credentials, so it stays until it can.
- The terminal runner uses its own parser: pasted cURL and multipart bodies work in the editor, not yet in the runner.

[1.0.0]: https://github.com/TecniartGalicia/httpkeeper/releases/tag/v1.0.0
