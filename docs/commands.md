---
title: Commands
description: Complete reference for REST Client CE commands, keyboard shortcuts, and actions.
---

REST Client CE provides a comprehensive set of commands accessible via the Command Palette, keyboard shortcuts, and context menus. This page lists all available commands and their shortcuts.

## Command Palette

Access these commands by pressing `F1` and typing the command name.

### Core Request Operations

| Command                           | Description                                        | Shortcut                   |
| --------------------------------- | -------------------------------------------------- | -------------------------- |
| `Rest Client: Send Request`       | Send the HTTP request at cursor position           | `Ctrl+Alt+R` / `Cmd+Alt+R` |
| `Rest Client: Cancel Request`     | Cancel the currently executing request             | `Ctrl+Alt+K` / `Cmd+Alt+K` |
| `Rest Client: Rerun Last Request` | Re-execute the most recent request                 | `Ctrl+Alt+L` / `Cmd+Alt+L` |
| `Rest Client: Send All Requests`  | Send all requests in the current file sequentially | -                          |

### History & Navigation

| Command                              | Description                   | Shortcut                   |
| ------------------------------------ | ----------------------------- | -------------------------- |
| `Rest Client: Request History`       | Show history of sent requests | `Ctrl+Alt+H` / `Cmd+Alt+H` |
| `Rest Client: Clear Request History` | Delete all request history    | -                          |

### Code & Clipboard

| Command                              | Description                                | Shortcut                   |
| ------------------------------------ | ------------------------------------------ | -------------------------- |
| `Rest Client: Copy Request As cURL`  | Copy current request as cURL command       | `Ctrl+Alt+C` / `Cmd+Alt+C` |
| `Rest Client: Generate Code Snippet` | Generate code snippet in selected language | `Ctrl+Alt+C` / `Cmd+Alt+C` |

### Environment Management

| Command                               | Description                    | Shortcut                   |
| ------------------------------------- | ------------------------------ | -------------------------- |
| `Rest Client: Switch Environment`     | Change active environment      | `Ctrl+Alt+E` / `Cmd+Alt+E` |
| `Rest Client: Create New Environment` | Create a new environment       | -                          |
| `Rest Client: Delete Environment`     | Remove an existing environment | -                          |

### Response Handling

| Command                                         | Description                                    | Shortcut |
| ----------------------------------------------- | ---------------------------------------------- | -------- |
| `Rest Client: Preview Response in New Editor`   | Open response in an untitled document          | -        |
| `Rest Client: Toggle Response Preview Position` | Switch between side-by-side and current column | -        |

### Miscellaneous

| Command                         | Description                       | Shortcut |
| ------------------------------- | --------------------------------- | -------- |
| `Rest Client: Open Settings`    | Open extension settings           | -        |
| `Rest Client: Open Keybindings` | Open keyboard shortcuts reference | -        |

## Keyboard Shortcuts Reference

All shortcuts require the file to be in `HTTP` or `plaintext` language mode.

### Windows / Linux

| Action                          | Shortcut       |
| ------------------------------- | -------------- |
| Send Request                    | `Ctrl+Alt+R`   |
| Cancel Request                  | `Ctrl+Alt+K`   |
| Rerun Last Request              | `Ctrl+Alt+L`   |
| View Request History            | `Ctrl+Alt+H`   |
| Switch Environment              | `Ctrl+Alt+E`   |
| Copy as cURL / Generate Snippet | `Ctrl+Alt+C`   |
| Goto Symbol                     | `Ctrl+Shift+O` |
| Toggle Comment                  | `Ctrl+/`       |
| Change Language Mode            | `Ctrl+K M`     |

### macOS

| Action                          | Shortcut      |
| ------------------------------- | ------------- |
| Send Request                    | `Cmd+Alt+R`   |
| Cancel Request                  | `Cmd+Alt+K`   |
| Rerun Last Request              | `Cmd+Alt+L`   |
| View Request History            | `Cmd+Alt+H`   |
| Switch Environment              | `Cmd+Alt+E`   |
| Copy as cURL / Generate Snippet | `Cmd+Alt+C`   |
| Goto Symbol                     | `Cmd+Shift+O` |
| Toggle Comment                  | `Cmd+/`       |
| Change Language Mode            | `Cmd+K M`     |

## Context Menu Commands

Right-click in an `.http` or `.rest` file to access:

- **Send Request** - Send request at cursor
- **Copy Request As cURL** - Copy as curl command
- **Generate Code Snippet** - Generate code in another language
- **Rest Client: Request History** - Open history panel

## CodeLens Actions

When CodeLens is enabled, clickable links appear above each request:

- **Send Request** - Send this specific request
- **Send All Requests Sequentially** - Execute all requests in the file one after another

Customize the text via settings:

- `rest-client.codeLensSendRequestTitle`
- `rest-client.codeLensSendAllRequestTitle`

## Status Bar Indicators

The status bar shows request execution status:

- **Spinner** - Request in progress (click to cancel)
- **Duration** - Total time (hover for breakdown: Socket, DNS, TCP, First Byte, Download)
- **Size** - Response size (hover for headers/body breakdown)
- **Environment** - Current environment name (click to switch)

## Response Preview Actions

In the response preview panel, use the title bar icons:

- **Save Full Response** - Save headers + body to file
- **Save Response Body** - Save body only with appropriate extension
- **More Actions...** - Access additional options:
    - Fold Response
    - Unfold Response
    - Copy Response Body
    - Preview in New Editor

## Enabling/Disabling Commands

Some commands can be toggled via settings:

| Setting                                              | Affects                     | Default |
| ---------------------------------------------------- | --------------------------- | ------- |
| `rest-client.enableSendRequestCodeLens`              | Send Request CodeLens       | `true`  |
| `rest-client.enableCustomVariableReferencesCodeLens` | Variable reference CodeLens | `true`  |
| `rest-client.rememberCookiesForSubsequentRequests`   | Cookie persistence          | `true`  |
| `rest-client.followredirect`                         | Auto-follow redirects       | `true`  |

## Command Execution Flow

Understanding when commands are available:

1. **File must be saved** - Some commands require the file to be saved to disk
2. **Language mode** - Commands work in `HTTP`, `plaintext`, or Markdown code blocks with `http`/`rest`
3. **Cursor position** - Send Request uses the request block where cursor is located
4. **Selection** - If text is selected, only that selection is sent as a request

## Troubleshooting Commands

### Shortcut not working?

- Ensure file language mode is `HTTP` (check bottom-right status bar)
- Check for conflicts in VS Code keyboard shortcuts (`File → Preferences → Keyboard Shortcuts`)
- Some shortcuts may be captured by other extensions

### Command not appearing in palette?

- Verify the extension is activated (open Command Palette and type "Rest Client")
- Reload VS Code (`Developer: Reload Window`)

### CodeLens not showing?

- Check `rest-client.enableSendRequestCodeLens` is `true`
- Verify VS Code setting `editor.codeLens` is enabled
- May be hidden by theme; check `workbench.colorCustomizations`

### Send Request sends wrong request?

- Place cursor inside the desired request block
- Use selected text to send specific portion
- Named requests with `# @name` can be referenced via request variables [cf. Metadata directives]({{ '/metadata#@name' | relative_url }})

## Complete Command List (JSON)

For reference, here's all commands in JSON format:

```json
{
    "core": {
        "sendRequest": "rest-client.sendRequest",
        "cancelRequest": "rest-client.cancelRequest",
        "rerunLastRequest": "rest-client.rerunLastRequest",
        "sendAllRequests": "rest-client.sendAllRequests"
    },
    "history": {
        "showHistory": "rest-client.showHistory",
        "clearHistory": "rest-client.clearHistory"
    },
    "clipboard": {
        "copyAsCurl": "rest-client.copyAsCurl",
        "generateCodeSnippet": "rest-client.generateCodeSnippet"
    },
    "environment": {
        "switchEnvironment": "rest-client.switchEnvironment",
        "createEnvironment": "rest-client.createEnvironment",
        "deleteEnvironment": "rest-client.deleteEnvironment"
    },
    "response": {
        "previewInNewEditor": "rest-client.previewResponseInNewEditor",
        "togglePreviewPosition": "rest-client.togglePreviewPosition"
    }
}
```

## Related Documentation

- [Usage]({{ '/usage' | relative_url }}) - How to use basic features
- [Keyboard Shortcuts]({{ '/usage#keyboard-shortcuts' | relative_url }}) - Complete shortcut reference
- [HTTP Language]({{ '/http-language' | relative_url }}) - Language support details
