# Building REST Client for VS Code

This document provides instructions for building, packaging, and installing this extension locally from source.

---

## Toolchain & Prerequisites

This project uses **[Volta](https://volta.sh/)** to manage Node.js and **pnpm** package manager versions automatically.

- **Volta**: Required for automatic toolchain version management
- **Node.js**: Pinning managed via Volta (`v20.18.0`)
- **pnpm**: Managed via Volta (`v9.15.0`)
- **VS Code**: v1.81.0 or higher

---

## Installation & Setup

1. **Clone the Repository** (if not already cloned):
   ```bash
   git clone <your-fork-url>
   cd vscode-restclient
   ```

2. **Install Dependencies**:
   ```bash
   pnpm install --frozen-lockfile
   ```

---

## Development Workflow

### Build Development Bundle
Compile TypeScript files and bundle with Webpack in development mode:

```bash
pnpm run webpack
```

### Watch Mode
Recompile automatically on file changes:

```bash
pnpm run watch
```

### Debugging in VS Code
1. Open the project folder in VS Code.
2. Press `F5` (or go to **Run and Debug** -> **Extension**).
3. A new Extension Development Host window will launch with the extension activated.

---

## Packaging the Extension (`.vsix`)

To build a production binary package (`.vsix` file):

1. **Package using `pnpm run package`**:
   ```bash
   pnpm run package
   ```
   *Or directly via `vsce`:*
   ```bash
   pnpm exec vsce package --no-dependencies
   ```

2. This generates a file named `rest-client-<version>.vsix` (e.g., `rest-client-1.0.0.vsix`) in the root directory.

---

## Installing the `.vsix` into VS Code

### Via Command Line

```bash
code --install-extension rest-client-0.26.0.vsix
```

### Via VS Code UI

1. Open VS Code.
2. Open the **Extensions** view (`Ctrl+Shift+X` or `Cmd+Shift+X`).
3. Click the `...` (Views and More Actions) menu in the top right corner of the Extensions pane.
4. Select **Install from VSIX...**
5. Choose the generated `rest-client-0.26.0.vsix` file.

---

## Security & Hardening Notes for Self-Built Instances

When running this custom build:

- **Telemetry Disabled**: Application Insights tracking has been stripped out.
- **Header Sanitization**: Authorization tokens, API keys, and cookies are automatically redacted before request history is written to disk.
- **Secure File Permissions**: `~/.rest-client` cache and state directories are created with restrictive permissions (`0700` for directories, `0600` for state files) on Unix/Linux systems.
- **MSAL Authentication**: AAD authentication uses Microsoft Authentication Library (`@azure/msal-node`) with in-memory token storage.