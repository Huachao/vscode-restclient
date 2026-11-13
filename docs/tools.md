---
title: Tools
description: Tools
---

## CLI

### The runner, everywhere (+44)

```console
$ npx @vscode-restclient/cli api.http --env dev --secret API_KEY=… --junit report.xml
  ok   login                200  184 ms
  ok   invoices             200    9 ms

2 requests, all green
```

Exit code 0 when every assertion passes, 1 when one fails, `--json` for machines, `--junit` for the test dashboards of GitHub and GitLab. Pasted `curl` commands and multipart bodies with `< file` work in the runner too. In GitHub Actions:

```yaml
- uses: vscode-restclient/vscode-restclient@v1.2.0
  with:
    file: api/smoke.http
    env: staging
    junit: restclient.xml
  env:
    RESTCLIENT_SECRET_API_KEY: ${{ secrets.API_KEY }}
```

![The same file run from the integrated terminal](https://raw.githubusercontent.com/vscode-restclient/vscode-restclient/master/media/shots/04-runner.png)


## MCP

### The HTTP client your agents can use

In VS Code, `#restclient` lists the requests of a file and sends one by name from Copilot Chat or any other language-model participant — sending asks you first, and files outside the workspace are refused. On VS Code 1.101+ the extension also announces its MCP server to agent mode, with nothing to configure.

Outside the editor, `restclient mcp` is an MCP server over stdio for Claude Code, Cursor or anything else that speaks MCP: `list_requests`, `send_request`, `run_http_file`. It only reads files under the root it was started with and never writes to disk.

```json
{
  "mcpServers": {
    "restclient": {
      "command": "npx",
      "args": ["-y", "@vscode-restclient/cli", "mcp", "--root", "."]
    }
  }
}
```