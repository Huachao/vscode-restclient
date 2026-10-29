import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

/*
 * Command IDs are public API: users bind them in keybindings.json, call them
 * from tasks.json, and other extensions invoke them via executeCommand. This
 * suite freezes them so a refactor cannot rename one silently — if an ID has
 * to change, this file must change with it, and that shows up in review.
 */

// The 19 IDs humao.rest-client has always exposed, verbatim.
const ORIGINAL_IDS = [
    'rest-client.request',
    'rest-client.rerun-last-request',
    'rest-client.cancel-request',
    'rest-client.switch-environment',
    'rest-client.history',
    'rest-client.clear-history',
    'rest-client.save-response',
    'rest-client.save-response-body',
    'rest-client.copy-response-body',
    'rest-client.generate-codesnippet',
    'rest-client.copy-codesnippet',
    'rest-client.copy-request-as-curl',
    'rest-client.clear-cookies',
    'rest-client.fold-response',
    'rest-client.unfold-response',
    'rest-client.preview-html-response-body',
    'rest-client.show-raw-response',
    'rest-client.import-swagger',
];

// Added by this project; same public prefix, no clash with the original.
const NEW_IDS = [
    'rest-client.set-secret',
    'rest-client.delete-secret',
];

// Internal, deliberately NOT under rest-client.: when humao.rest-client is
// installed alongside, a shared internal ID makes response-panel links open
// in the other extension (seen in the wild before the rename).
const INTERNAL_ID = 'vscode-restclient._openDocumentLink';

const PUBLIC_IDS = [...ORIGINAL_IDS, ...NEW_IDS];

function extension(): vscode.Extension<any> {
    const ext = vscode.extensions.all.find(e =>
        e.packageJSON?.contributes?.commands?.some((c: { command: string }) => c.command === 'rest-client.request'));
    assert.ok(ext, 'extension under test not found');
    return ext!;
}

function manifest(): any {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(path.join(extension().extensionPath, 'package.json'));
}

describe('command IDs are stable public API', () => {
    // This suite runs first (alphabetical order) and nothing has opened an
    // .http document yet, so force activation before asserting on runtime.
    before(async () => {
        await extension().activate();
    });

    it('package.json declares exactly the frozen public IDs', () => {
        const declared = manifest().contributes.commands.map((c: { command: string }) => c.command).sort();
        assert.deepStrictEqual(declared, [...PUBLIC_IDS].sort());
    });

    it('keybindings and menus only reference frozen public IDs', () => {
        const contributes = manifest().contributes;
        const referenced = new Set<string>();
        for (const kb of contributes.keybindings ?? []) {
            referenced.add(kb.command);
        }
        for (const entries of Object.values(contributes.menus ?? {}) as { command?: string }[][]) {
            for (const entry of entries) {
                if (entry.command) {
                    referenced.add(entry.command);
                }
            }
        }
        const unknown = [...referenced].filter(id => !PUBLIC_IDS.includes(id));
        assert.deepStrictEqual(unknown, [], `unknown command IDs referenced: ${unknown.join(', ')}`);
    });

    it('every public ID and the internal one are registered at runtime', async () => {
        const registered = await vscode.commands.getCommands(true);
        const missing = [...PUBLIC_IDS, INTERNAL_ID].filter(id => !registered.includes(id));
        assert.deepStrictEqual(missing, [], `not registered: ${missing.join(', ')}`);
    });

    it('no command leaks under the old httpkeeper. prefix', async () => {
        const registered = await vscode.commands.getCommands(true);
        const leaked = registered.filter(id => id.startsWith('httpkeeper.'));
        assert.deepStrictEqual(leaked, [], `commands still under the old prefix: ${leaked.join(', ')}`);
    });
});
