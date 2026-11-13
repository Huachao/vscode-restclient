---
title: HTTP Language
description: Full language support for HTTP requests in VS Code - syntax, auto-completion, and more.
---

REST Client CE provides comprehensive language support for HTTP request files with `.http` and `.rest` extensions. This includes syntax highlighting, auto-completion, code snippets, navigation, and more.

## Activation

The HTTP language mode is automatically activated when:

1. File has extension `.http` or `.rest`
2. First line follows standard RFC 2616 request line format: `Method SP Request-URI SP HTTP-Version`

To manually enable, click the language mode indicator in VS Code's status bar (bottom-right) and select **HTTP**.

## Syntax Highlighting

- **Request line** - Method, URL, HTTP version
- **Headers** - Header names and values
- **Body** - Content with appropriate highlighting based on MIME type (JSON, XML, JavaScript, etc.)
- **Comments** - Lines starting with `#` or `//`
- **Responses** - When previewing responses, syntax highlighting is applied

## Auto-Completion

Auto-completion triggers automatically or with `Ctrl+Space`. Supported categories:

1. **HTTP Methods** - GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS, etc.
2. **HTTP URLs** - From request history
3. **HTTP Headers** - Standard and custom headers
4. **System Variables** - `{% raw %}{{$guid}}{% endraw %}`, `{% raw %}{{$timestamp}}{% endraw %}`, etc.
5. **Custom Variables** - Environment, file, and request variables in current context
6. **MIME Types** - For `Accept` and `Content-Type` headers
7. **Authentication Schemes** - Basic, Digest, AWS, etc.

## Code Snippets

Built-in snippets accelerate request authoring:

| Snippet   | Description              |
| --------- | ------------------------ |
| `get`     | GET request template     |
| `post`    | POST request template    |
| `put`     | PUT request template     |
| `delete`  | DELETE request template  |
| `patch`   | PATCH request template   |
| `head`    | HEAD request template    |
| `options` | OPTIONS request template |
| `query`   | QUERY request template   |

Type the snippet name and press `Tab` to expand.

## Comments

Both comment styles are supported:

```http
# This is a comment
// This is also a comment

GET https://api.example.com/users
```

Comments can appear anywhere in the file.

## JSON & XML Support

### Body Indentation

When pressing `Enter` inside `{}`, `[]`, or `<>` brackets, automatic indentation is applied (configurable via `rest-client.addRequestBodyLineIndentationAroundBrackets`).

### Auto-Closing Brackets

Type `{`, `[`, `(`, `"`, or `'` and the closing character is automatically inserted.

### Comment Conversion

Select code and type `//` or `#` to comment/uncomment multiple lines.

## Goto Symbol

Navigate to requests and variables quickly:

- Press `Ctrl+Shift+O` (`Cmd+Shift+O` on macOS)
- Or press `F1` and type `@`

Shows a list of:

- **File-level variables** (`@variableName`)
- **Named requests** (`# @name requestName`)
- **Request blocks**

Select to jump directly.

## CodeLens

CodeLens displays actionable links above each request:

- **Send Request** - Send this request

Toggle via:

- `rest-client.enableSendRequestCodeLens`
- `rest-client.enableCustomVariableReferencesCodeLens` (shows variable references)

## Folding

Request blocks can be folded/unfolded:

```http
# @name myRequest
GET https://api.example.com/users
Authorization: Bearer token
# ... rest of request
```

Click the fold icon in the gutter or use:

- `Ctrl+Shift+[` to fold
- `Ctrl+Shift+]` to unfold

## Markdown Code Blocks

REST Client recognizes HTTP requests within Markdown fenced code blocks:

````markdown
```http
GET https://api.example.com/users
```
````

Language identifier `http` or `rest` both work.

## File Associations

By default, `.http` and `.rest` extensions are associated with the HTTP language. To add custom associations, add to your `settings.json`:

```json
{
    "files.associations": {
        "*.api": "http"
    }
}
```

## Manual Language Selection

If a file isn't automatically recognized, change language mode:

1. Click language indicator in status bar (bottom-right)
2. Select **HTTP** from list
3. Or press `Ctrl+K M` (`Cmd+K M` on macOS) and choose **HTTP**

## Language Features Summary

| Feature                         | Description                                   |
| ------------------------------- | --------------------------------------------- |
| Syntax highlighting             | Requests, headers, bodies, comments           |
| Auto-completion                 | Methods, URLs, headers, variables, MIME types |
| Snippets                        | Templates for common HTTP methods             |
| Goto Symbol                     | Navigate to variables and named requests      |
| CodeLens                        | Inline "Send Request" links                   |
| Folding                         | Collapse/expand request blocks                |
| Comment toggling                | `#` and `//` support                          |
| Bracket matching & auto-closing | {}, [], (), "", ''                            |
| Indentation                     | Smart indentation around brackets             |
| Markdown support                | Recognize requests in fenced code blocks      |

## Tips

1. **Save your file** - Some features (like variable resolution, diagnostics) work best with saved files
2. **Use named requests** - `# @name` makes goto symbol and variable references more useful
3. **Define file variables** - `@variable = value` at the top for reusable values
4. **Leverage auto-completion** - Start typing variables, headers, or methods to see suggestions
5. **CodeLens is your friend** - Keep it enabled for quick one-click sending

## Troubleshooting

### No syntax highlighting?

- Ensure file extension is `.http` or `.rest`
- Or manually set language mode to **HTTP**

### Auto-completion not working?

- Check that language mode is **HTTP**
- Wait for language server to initialize (~1-2 seconds after opening)
- Try `Ctrl+Space` to manually trigger

### CodeLens missing?

- Verify `rest-client.enableSendRequestCodeLens` is `true`
- CodeLens may be disabled globally in VS Code: `editor.codeLens` setting
- Some themes hide CodeLens; try changing theme or adjusting `workbench.colorCustomizations`

### Goto Symbol not showing variables?

- Ensure file variables start with `@` on their own line
- Named requests must use `# @name` or `// @name` syntax
- File must be saved for registration

## Performance Tips

For large files (100+ requests):

- Disable CodeLens if slow: `"rest-client.enableSendRequestCodeLens": false`
- Disable variable reference CodeLens: `"rest-client.enableCustomVariableReferencesCodeLens": false`
- Consider splitting into multiple files
- Increase `rest-client.largeResponseBodySizeLimitInMB` if dealing with large responses

## Keyboard Shortcuts Reference

All shortcuts require HTTP/plaintext language mode:

| Action                | Windows/Linux  | macOS         |
| --------------------- | -------------- | ------------- |
| Send Request          | `Ctrl+Alt+R`   | `Cmd+Alt+R`   |
| Cancel Request        | `Ctrl+Alt+K`   | `Cmd+Alt+K`   |
| Rerun Last Request    | `Ctrl+Alt+L`   | `Cmd+Alt+L`   |
| Request History       | `Ctrl+Alt+H`   | `Cmd+Alt+H`   |
| Switch Environment    | `Ctrl+Alt+E`   | `Cmd+Alt+E`   |
| Copy Request as cURL  | `Ctrl+Alt+C`   | `Cmd+Alt+C`   |
| Generate Code Snippet | `Ctrl+Alt+C`   | `Cmd+Alt+C`   |
| Goto Symbol           | `Ctrl+Shift+O` | `Cmd+Shift+O` |
| Toggle Comment        | `Ctrl+/`       | `Cmd+/`       |

> **Note:** These shortcuts are exclusive to HTTP/plaintext mode to avoid conflicts with other extensions.
