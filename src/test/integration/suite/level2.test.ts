import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const PORT = process.env.RC_TEST_PORT!;
const BASE = `http://[::1]:${PORT}`;
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BR = String.fromCharCode(10);
const j = (...l: string[]) => l.join(BR);

const setSetting = (key: string, value: unknown) =>
  vscode.workspace.getConfiguration('rest-client').update(key, value, vscode.ConfigurationTarget.Global);

/** The workspace folder of the test: real files go there. */
function folder(): string {
  const c = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  assert.ok(c, 'the test needs an open workspace');
  return c!;
}

function write(name: string, contenido: string): string {
  const filePath = path.join(folder(), name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contenido);
  return filePath;
}

/**
 * Opens a .http file from disk, puts the cursor on the requested line, sends
 * and waits for the response that carries the mark. The extension reuses the
 * response document, so what is looked for is the mark, not "a new document".
 */
async function sendFile(filePath: string, line: number, mark: string, seconds = 20): Promise<string> {
  const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(filePath));
  const editor = await vscode.window.showTextDocument(doc, { preview: false });
  const pos = new vscode.Position(line, 0);
  editor.selection = new vscode.Selection(pos, pos);
  await vscode.commands.executeCommand('rest-client.request');

  for (let i = 0; i < seconds * 4; i++) {
    await esperar(250);
    const response = vscode.workspace.textDocuments.find(
      (d) => d.uri.toString() !== doc.uri.toString() && d.getText().includes(mark),
    );
    if (response) return response.getText();
  }
  const openDocs = vscode.workspace.textDocuments.map((d) => `${d.languageId}:${d.getText().slice(0, 60)}`).join(' | ');
  throw new Error(`no response with "${mark}" in ${seconds} s. Documents: ${openDocs}`);
}

describe('Rest Client · JetBrains format and secrets', () => {
  before(async () => {
    const ext = vscode.extensions.getExtension('vscode-restclient.restclient');
    assert.ok(ext, 'the extension is not loaded');
    await ext!.activate();
    await setSetting('previewResponseInUntitledDocument', true);
    await setSetting('previewResponsePanelTakeFocus', false);
  });

  after(async () => {
    // No environment and no secrets: the other suites must inherit nothing.
    await vscode.commands.executeCommand('rest-client.switch-environment', '');
    await vscode.commands.executeCommand('rest-client.delete-secret', 'API_KEY');
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  it('P-36 · http-client.env.json next to the file: the chosen environment resolves, and the private one wins', async () => {
    write('http-client.env.json', JSON.stringify({ dev: { host: BASE, path: '/public' }, prod: { host: 'http://unused' } }));
    write('http-client.private.env.json', JSON.stringify({ dev: { path: '/private-wins' } }));
    const file = write('entorno.http', j('GET {{host}}{{path}}', ''));

    await vscode.commands.executeCommand('rest-client.switch-environment', 'dev');
    const t = await sendFile(file, 0, '/private-wins');
    assert.ok(t.includes('HTTP/1.1 200'), `no 200 in:\n${t.slice(0, 200)}`);
    assert.ok(/"path":\s*"\/private-wins"/.test(t), 'the private one must win over the public one');
  });

  it('P-37 · import + run #name: the imported request is sent and its response resolves in the importing file', async () => {
    write(path.join('lib', 'auth.http'), j(`@host = ${BASE}`, '', '# @name login', 'GET {{host}}/echo/login', ''));
    const file = write('api.http', j(
      'import ./lib/auth.http',
      '',
      'run #login',
      '',
      '###',
      '',
      'GET {{host}}/echo/facturas?desde={{login.response.body.$.path}}',
      '',
    ));

    const first = await sendFile(file, 2, '"path": "/echo/login"');
    assert.ok(first.includes('HTTP/1.1 200'), 'run #login must send the imported request');

    const second = await sendFile(file, 6, '/echo/facturas?desde=');
    assert.ok(/"path":\s*"\/echo\/facturas\?desde=\/echo\/login"/.test(second), 'the request variable of the imported file must resolve: ' + second.slice(0, 200));
  });

  it('P-38 · $secret: stored with the command, it is substituted; the file does not contain it', async () => {
    await vscode.commands.executeCommand('rest-client.set-secret', 'API_KEY', 'clave-secreta-123');
    const file = write('secreto.http', j(`GET ${BASE}/con-secreto`, 'X-Test: {{$secret API_KEY}}', ''));
    assert.ok(!fs.readFileSync(file, 'utf8').includes('clave-secreta-123'), 'the value is not in the file');
    const t = await sendFile(file, 0, '/con-secreto');
    assert.ok(/"header":\s*"clave-secreta-123"/.test(t), 'the secret must arrive in the header: ' + t.slice(0, 200));
  });

  it('P-39 · JetBrains aliases: $uuid, $isoTimestamp and $random.integer(min,max)', async () => {
    const file = write('alias.http', j(`GET ${BASE}/alias?u={{$uuid}}&t={{$isoTimestamp}}&r={{$random.integer(5,6)}}`, ''));
    const t = await sendFile(file, 0, '/alias?u=');
    const filePath = /"path":\s*"([^"]+)"/.exec(t)?.[1] ?? '';
    assert.ok(/u=[0-9a-f-]{36}&/.test(filePath), `no uuid in ${filePath}`);
    assert.ok(/t=\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(filePath), `no ISO date in ${filePath}`);
    assert.ok(/r=5$/.test(filePath), `random.integer(5,6) can only give 5: ${filePath}`);
  });
});

describe('Rest Client · streaming', () => {
  before(async () => {
    const ext = vscode.extensions.getExtension('vscode-restclient.restclient');
    await ext!.activate();
    await setSetting('previewResponseInUntitledDocument', true);
    await setSetting('previewResponsePanelTakeFocus', false);
  });

  after(async () => {
    await setSetting('previewResponseInUntitledDocument', true);
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  it('P-42 · text/event-stream: the panel opens in streaming mode before it ends, and the 3 events arrive at the end', async () => {
    // Panel mode first: a "streaming" tab has to show up BEFORE the last
    // event (the server spaces them 200 ms apart).
    await setSetting('previewResponseInUntitledDocument', false);
    await esperar(300);
    const doc = await vscode.workspace.openTextDocument({ language: 'http', content: `GET ${BASE}/sse${BR}` });
    await vscode.window.showTextDocument(doc, { preview: false });
    // The command does not resolve until the request ENDS: the polling has to
    // happen while it is in flight, not after.
    const envio = vscode.commands.executeCommand('rest-client.request');
    let vistoStreaming = false;
    let vistoFinal = false;
    const vistas = new Set<string>();
    try {
      for (let i = 0; i < 100 && !vistoFinal; i++) {
        await esperar(50);
        const etiquetas = vscode.window.tabGroups.all.flatMap((g) => g.tabs).map((t) => t.label);
        etiquetas.forEach((l) => vistas.add(l));
        if (etiquetas.some((l) => /streaming/.test(l))) vistoStreaming = true;
        if (vistoStreaming && etiquetas.some((l) => /^Response\(\d+ms\)$/.test(l))) vistoFinal = true;
      }
      assert.ok(vistoStreaming, 'the panel must open in streaming mode with the first event; tabs seen: ' + [...vistas].join(' | '));
      assert.ok(vistoFinal, 'when the stream ends the panel moves to the full response; tabs seen: ' + [...vistas].join(' | '));
    } finally {
      await envio;
      await setSetting('previewResponseInUntitledDocument', true);
    }

    // And in document mode, the final body carries the three events.
    const file = write('sse.http', j(`GET ${BASE}/sse`, ''));
    const t = await sendFile(file, 0, '[DONE]');
    assert.ok(t.includes('content-type: text/event-stream'), 'the header of the stream');
    assert.ok(t.includes('data: {"delta":"Hola"}') && t.includes('data: {"delta":" mundo"}'), 'the three events arrive whole');
  });

  it('P-43 · WEBSOCKET: the server greets, echoes two messages, status 101', async () => {
    const file = write('socket.http', j(
      '# @timeout 800',
      `WEBSOCKET ws://[::1]:${PORT}/socket`,
      'X-Test: ana',
      '',
      '{"a":1}',
      '===',
      'segundo',
      '',
    ));
    const t = await sendFile(file, 1, 'eco: segundo');
    assert.ok(t.includes('HTTP/1.1 101'), `no 101 in ${t.slice(0, 120)}`);
    assert.ok(t.includes('<< hola ana'), 'the server greeting carries the header that was sent');
    assert.ok(t.includes('>> {"a":1}') && t.includes('<< eco: {"a":1}'), 'the first message and its echo');
    assert.ok(t.includes('-- closed after 800 ms'), 'it closes when @timeout is up: ' + t.slice(-80));
  });
});

describe('Rest Client · tools for agents', () => {
  before(async () => {
    const ext = vscode.extensions.getExtension('vscode-restclient.restclient');
    await ext!.activate();
    await setSetting('previewResponseInUntitledDocument', true);
  });

  after(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  it('P-44 · the language model tools list the requests and send one by name', async function () {
    const lm = (vscode as unknown as { lm?: { invokeTool?: Function } }).lm;
    if (!lm?.invokeTool) {
      this.skip();
      return;
    }
    const file = write('agente.http', j('# @name saludo', `GET ${BASE}/echo/agente`, 'X-Test: desde-agente', '', '###', '', `GET ${BASE}/otra`, ''));
    assert.ok(fs.existsSync(file));
    const token = new vscode.CancellationTokenSource().token;
    const text = (r: { content: { value?: string }[] }) => r.content.map((p) => p.value ?? '').join('');

    const list = await lm.invokeTool('rest_client_list_requests', { input: { file: 'agente.http' }, toolInvocationToken: undefined }, token);
    const data = JSON.parse(text(list));
    assert.strictEqual(data.requests.length, 2, JSON.stringify(data));
    assert.strictEqual(data.requests[0].name, 'saludo');
    assert.strictEqual(data.requests[0].method, 'GET');
    assert.strictEqual(data.requests[1].name, undefined);

    const envio = await lm.invokeTool('rest_client_send_request', { input: { file: 'agente.http', name: 'saludo' }, toolInvocationToken: undefined }, token);
    const r = JSON.parse(text(envio));
    assert.strictEqual(r.status, 200, JSON.stringify(r).slice(0, 200));
    assert.ok(r.body.includes('desde-agente'), 'the header reached the server: ' + r.body.slice(0, 120));
    assert.ok(typeof r.ms === 'number');

    await assert.rejects(
      () => lm!.invokeTool!('rest_client_list_requests', { input: { file: '../fuera.http' }, toolInvocationToken: undefined }, token),
      /outside the workspace/,
    );
  });
});

describe('RestClient · what was ported from rest-client-next', () => {
  before(async () => {
    const ext = vscode.extensions.getExtension('vscode-restclient.restclient');
    await ext!.activate();
    await setSetting('previewResponseInUntitledDocument', true);
  });

  after(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  it('P-47 · Basic Auth: the password may contain colons and spaces (upstream #1419)', async () => {
    // "admin:it's a total eclipse": it used to be split on every space and
    // every ':', and arrived truncated.
    const key = "it's a total: eclipse";
    const file = write('basic.http', j(`GET ${BASE}/echo/basic`, `Authorization: Basic admin:${key}`, ''));
    const t = await sendFile(file, 0, '/echo/basic');
    const recibida = /"authorization":\s*"Basic ([^"]+)"/.exec(t)?.[1] ?? '';
    assert.ok(recibida, 'no Authorization header arrived: ' + t.slice(0, 200));
    assert.strictEqual(Buffer.from(recibida, 'base64').toString('utf8'), `admin:${key}`);
  });

  it('P-48 · Basic Auth: the space-separated "user password" form still works', async () => {
    const file = write('basic2.http', j(`GET ${BASE}/echo/basic2`, 'Authorization: Basic ana secreta', ''));
    const t = await sendFile(file, 0, '/echo/basic2');
    const recibida = /"authorization":\s*"Basic ([^"]+)"/.exec(t)?.[1] ?? '';
    assert.strictEqual(Buffer.from(recibida, 'base64').toString('utf8'), 'ana:secreta');
  });

  it('P-49 · completion inside {{ }} does not duplicate the braces', async () => {
    const file = write('completar.http', j('@host = http://ejemplo', 'GET {{host}}/x?id={{', ''));
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(file));
    await vscode.window.showTextDocument(doc, { preview: false });
    const line = 1;
    const posicion = new vscode.Position(line, doc.lineAt(line).text.length);
    const list = (await vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider', doc.uri, posicion)) as vscode.CompletionList;

    const variables = list.items.filter((i) => typeof i.label === 'string' && (i.label === '$guid' || i.label === 'host'));
    assert.ok(variables.length >= 1, 'no variable proposals: ' + list.items.map((i) => i.label).slice(0, 10).join(', '));
    for (const item of variables) {
      const text = typeof item.insertText === 'string' ? item.insertText : (item.insertText as vscode.SnippetString)?.value ?? '';
      assert.ok(!text.includes('{{'), `"${String(item.label)}" would insert braces again: ${text}`);
      assert.ok(item.range, `"${String(item.label)}" does not replace the gap between the braces`);
    }
  });

  it('P-50 · Basic Auth: the password preserves spaces and apostrophes with a space separator', async () => {
    // "admin:it's a total eclipse": it used to be split on every space and
    // every ':', and arrived truncated.
    const key = "it's a super eclipse";
    const file = write('basic3.http', j(`GET ${BASE}/echo/basic3`, `Authorization: Basic admin ${key}`, ''));
    const t = await sendFile(file, 0, '/echo/basic3');
    const recibida = /"authorization":\s*"Basic ([^"]+)"/.exec(t)?.[1] ?? '';
    assert.ok(recibida, 'no Authorization header arrived: ' + t.slice(0, 200));
    assert.strictEqual(Buffer.from(recibida, 'base64').toString('utf8'), `admin:${key}`);
  });
});

describe('the QUERY method (ported from upstream #1438)', () => {
  before(async () => {
    const ext = vscode.extensions.getExtension('vscode-restclient.restclient');
    await ext!.activate();
    await setSetting('previewResponseInUntitledDocument', true);
  });

  after(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  it('P-66 · QUERY arrives as QUERY and with its body', async function () {
    this.timeout(60000);
    const file = write('query.http', j(
      `QUERY ${BASE}/buscar`,
      'Content-Type: application/json',
      '',
      '{"filtro":"activo"}',
      '',
    ));
    const t = await sendFile(file, 0, '"/buscar"', 40);
    assert.ok(t.includes('HTTP/1.1 200'), `no 200 in:\n${t.slice(0, 200)}`);
    assert.ok(/"method":\s*"QUERY"/.test(t), 'the server must receive the QUERY method: ' + t.slice(0, 250));
    assert.ok(/"received":\s*"\{\\"filtro\\":\\"activo\\"\}"/.test(t) || t.includes('filtro'), 'the body must travel with the request: ' + t.slice(0, 250));
  });
});

describe('faker in the editor (lazy loading)', () => {
  it('P-64 · {{$faker internet.email}} is resolved on send (the chunk loads on the fly)', async function () {
    this.timeout(60000);
    const file = write('faker.http', j(
      `GET ${BASE}/echo?email={{$faker internet.email}}`,
      'X-Test: faker-mark',
    ));
    const text = await sendFile(file, 0, 'faker-mark', 40);
    const email = /email=([^&"\\]+)/.exec(text)?.[1] ?? '';
    assert.ok(/%40|@/.test(email), `no parece un email: ${email || text.slice(0, 200)}`);
    assert.ok(!email.includes('faker'), 'the variable was left unresolved');
  });
});
