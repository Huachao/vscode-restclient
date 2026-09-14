# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-09-14

First release of the community continuation, published as `vscode-restclient.rest-client`.

### Added

- **`{{$faker module.property [params]}}`** — fake values in requests (`{{$faker internet.email}}`, `{{$faker string.alphanumeric 8}}`), ported from [rest-client-next](https://github.com/tutilus/vscode-restclientnext) with the same syntax. In the editor the library loads lazily: nothing is paid at activation, only the first time a file resolves a `$faker`; only the English locale ships. The terminal runner supports the same syntax (its single-file bundle carries faker inside). Upstream #1412.

### Fixed

- **Basic auth with `:` or spaces in the password** (upstream #1419): `Authorization: Basic admin:it's a total eclipse` used to arrive truncated, and the header is now built here instead of letting `got` put the credentials in the URL, which escaped them (`it's%20a%20total%3A%20eclipse`). Ported from rest-client-next.
- **Completion inside `{{ }}`**: picking a variable after typing `{{` produced `{{{{variable}}}}`. The proposal now replaces what is between the braces, and system variables can be filtered with or without the `$`. Ported from rest-client-next.

### Changed

- The original **`rest-client.*` command IDs are back** (`rest-client.request`, `rest-client.rerun-last-request`, … — all 19 of them, keybindings included): they are public API, used from keybindings.json, tasks.json and other extensions via `executeCommand`. The two commands this project added follow the same prefix (`rest-client.set-secret`, `rest-client.delete-secret`). The internal document-link command stays under a distinct prefix on purpose: sharing it is what made links open in the other extension when both were installed. If `humao.rest-client` is installed alongside, activation no longer breaks on the duplicate registrations — you get one clear warning asking to disable one of the two. The IDs are frozen by `commandIds.test.ts`, so renaming one by accident fails the suite.
- The extension is called **REST Client** again (`displayName` and `name`), and the README is Huachao Mao's original reference, with a summary of what changed since 0.25.1 on top and one addition: AWS Cognito, supported since 0.24 but never documented. The HttpKeeper README moved to `docs/HTTPKEEPER.md` (and `docs/HTTPKEEPER.es.md`). Development now happens in the [vscode-restclient organisation](https://github.com/vscode-restclient/vscode-restclient).
- `THIRD-PARTY-NOTICES.txt` is generated from the real production dependency tree (`scripts/generar-notices.mjs`), and the audit fails if a dependency changes without regenerating it.

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
