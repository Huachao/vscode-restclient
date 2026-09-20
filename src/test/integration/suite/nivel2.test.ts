import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const PUERTO = process.env.RC_TEST_PUERTO!;
const BASE = `http://[::1]:${PUERTO}`;
const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));
const BR = String.fromCharCode(10);
const j = (...l: string[]) => l.join(BR);

const ajuste = (clave: string, valor: unknown) =>
  vscode.workspace.getConfiguration('rest-client').update(clave, valor, vscode.ConfigurationTarget.Global);

/** Carpeta del espacio de trabajo de la prueba: ahí van los ficheros de verdad. */
function carpeta(): string {
  const c = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  assert.ok(c, 'la prueba necesita un espacio de trabajo abierto');
  return c!;
}

function escribir(nombre: string, contenido: string): string {
  const ruta = path.join(carpeta(), nombre);
  fs.mkdirSync(path.dirname(ruta), { recursive: true });
  fs.writeFileSync(ruta, contenido);
  return ruta;
}

/**
 * Abre un fichero .http de disco, pone el cursor en la línea pedida, envía y
 * espera la respuesta que lleve la marca. La extensión reutiliza el documento
 * de respuesta, así que se busca la marca y no «un documento nuevo».
 */
async function enviarFichero(ruta: string, linea: number, marca: string, segundos = 20): Promise<string> {
  const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(ruta));
  const editor = await vscode.window.showTextDocument(doc, { preview: false });
  const pos = new vscode.Position(linea, 0);
  editor.selection = new vscode.Selection(pos, pos);
  await vscode.commands.executeCommand('rest-client.request');

  for (let i = 0; i < segundos * 4; i++) {
    await esperar(250);
    const respuesta = vscode.workspace.textDocuments.find(
      (d) => d.uri.toString() !== doc.uri.toString() && d.getText().includes(marca),
    );
    if (respuesta) return respuesta.getText();
  }
  const abiertos = vscode.workspace.textDocuments.map((d) => `${d.languageId}:${d.getText().slice(0, 60)}`).join(' | ');
  throw new Error(`sin respuesta con "${marca}" en ${segundos} s. Documentos: ${abiertos}`);
}

describe('Rest Client · formato JetBrains y secretos', () => {
  before(async () => {
    const ext = vscode.extensions.getExtension('vscode-restclient.rest-client');
    assert.ok(ext, 'la extensión no está cargada');
    await ext!.activate();
    await ajuste('previewResponseInUntitledDocument', true);
    await ajuste('previewResponsePanelTakeFocus', false);
  });

  after(async () => {
    // Sin entorno ni secretos: que las demás suites no hereden nada.
    await vscode.commands.executeCommand('rest-client.switch-environment', '');
    await vscode.commands.executeCommand('rest-client.delete-secret', 'API_KEY');
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  it('P-36 · http-client.env.json junto al fichero: el entorno elegido resuelve, y el privado manda', async () => {
    escribir('http-client.env.json', JSON.stringify({ dev: { host: BASE, ruta: '/publico' }, prod: { host: 'http://no-se-usa' } }));
    escribir('http-client.private.env.json', JSON.stringify({ dev: { ruta: '/privado-manda' } }));
    const fichero = escribir('entorno.http', j('GET {{host}}{{ruta}}', ''));

    await vscode.commands.executeCommand('rest-client.switch-environment', 'dev');
    const t = await enviarFichero(fichero, 0, '/privado-manda');
    assert.ok(t.includes('HTTP/1.1 200'), `sin 200 en:\n${t.slice(0, 200)}`);
    assert.ok(/"ruta":\s*"\/privado-manda"/.test(t), 'el privado debe mandar sobre el público');
  });

  it('P-37 · import + run #nombre: se envía la petición importada y su respuesta resuelve en el fichero que importa', async () => {
    escribir(path.join('lib', 'auth.http'), j(`@host = ${BASE}`, '', '# @name login', 'GET {{host}}/eco/login', ''));
    const fichero = escribir('api.http', j(
      'import ./lib/auth.http',
      '',
      'run #login',
      '',
      '###',
      '',
      'GET {{host}}/eco/facturas?desde={{login.response.body.$.ruta}}',
      '',
    ));

    const primera = await enviarFichero(fichero, 2, '"ruta": "/eco/login"');
    assert.ok(primera.includes('HTTP/1.1 200'), 'run #login debe enviar la petición importada');

    const segunda = await enviarFichero(fichero, 6, '/eco/facturas?desde=');
    assert.ok(/"ruta":\s*"\/eco\/facturas\?desde=\/eco\/login"/.test(segunda), 'la variable de petición del importado debe resolver: ' + segunda.slice(0, 200));
  });

  it('P-38 · $secret: guardado con el comando, se sustituye; el fichero no lo contiene', async () => {
    await vscode.commands.executeCommand('rest-client.set-secret', 'API_KEY', 'clave-secreta-123');
    const fichero = escribir('secreto.http', j(`GET ${BASE}/con-secreto`, 'X-Prueba: {{$secret API_KEY}}', ''));
    assert.ok(!fs.readFileSync(fichero, 'utf8').includes('clave-secreta-123'), 'el valor no está en el fichero');
    const t = await enviarFichero(fichero, 0, '/con-secreto');
    assert.ok(/"cabecera":\s*"clave-secreta-123"/.test(t), 'el secreto debe llegar en la cabecera: ' + t.slice(0, 200));
  });

  it('P-39 · alias de JetBrains: $uuid, $isoTimestamp y $random.integer(min,max)', async () => {
    const fichero = escribir('alias.http', j(`GET ${BASE}/alias?u={{$uuid}}&t={{$isoTimestamp}}&r={{$random.integer(5,6)}}`, ''));
    const t = await enviarFichero(fichero, 0, '/alias?u=');
    const ruta = /"ruta":\s*"([^"]+)"/.exec(t)?.[1] ?? '';
    assert.ok(/u=[0-9a-f-]{36}&/.test(ruta), `sin uuid en ${ruta}`);
    assert.ok(/t=\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(ruta), `sin fecha ISO en ${ruta}`);
    assert.ok(/r=5$/.test(ruta), `random.integer(5,6) solo puede dar 5: ${ruta}`);
  });
});

describe('Rest Client · streaming', () => {
  before(async () => {
    const ext = vscode.extensions.getExtension('vscode-restclient.rest-client');
    await ext!.activate();
    await ajuste('previewResponseInUntitledDocument', true);
    await ajuste('previewResponsePanelTakeFocus', false);
  });

  after(async () => {
    await ajuste('previewResponseInUntitledDocument', true);
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  it('P-42 · text/event-stream: el panel se abre en streaming antes de que termine, y al final llegan los 3 eventos', async () => {
    // Primero en modo panel: tiene que aparecer una pestaña «streaming» ANTES
    // del último evento (el servidor los espacia 200 ms).
    await ajuste('previewResponseInUntitledDocument', false);
    await esperar(300);
    const doc = await vscode.workspace.openTextDocument({ language: 'http', content: `GET ${BASE}/sse${BR}` });
    await vscode.window.showTextDocument(doc, { preview: false });
    // El comando no resuelve hasta que la petición TERMINA: hay que sondear
    // mientras está en vuelo, no después.
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
      assert.ok(vistoStreaming, 'el panel debe abrirse en modo streaming con el primer evento; pestañas vistas: ' + [...vistas].join(' | '));
      assert.ok(vistoFinal, 'al terminar el stream el panel pasa a la respuesta completa; pestañas vistas: ' + [...vistas].join(' | '));
    } finally {
      await envio;
      await ajuste('previewResponseInUntitledDocument', true);
    }

    // Y en modo documento, el cuerpo final trae los tres eventos.
    const fichero = escribir('sse.http', j(`GET ${BASE}/sse`, ''));
    const t = await enviarFichero(fichero, 0, '[DONE]');
    assert.ok(t.includes('content-type: text/event-stream'), 'la cabecera del stream');
    assert.ok(t.includes('data: {"delta":"Hola"}') && t.includes('data: {"delta":" mundo"}'), 'los tres eventos llegan enteros');
  });

  it('P-43 · WEBSOCKET: saludo del servidor, eco de dos mensajes y estado 101', async () => {
    const fichero = escribir('socket.http', j(
      '# @timeout 800',
      `WEBSOCKET ws://[::1]:${PUERTO}/socket`,
      'X-Prueba: ana',
      '',
      '{"a":1}',
      '===',
      'segundo',
      '',
    ));
    const t = await enviarFichero(fichero, 1, 'eco: segundo');
    assert.ok(t.includes('HTTP/1.1 101'), `sin 101 en ${t.slice(0, 120)}`);
    assert.ok(t.includes('<< hola ana'), 'el saludo del servidor lleva la cabecera enviada');
    assert.ok(t.includes('>> {"a":1}') && t.includes('<< eco: {"a":1}'), 'el primer mensaje y su eco');
    assert.ok(t.includes('-- closed after 800 ms'), 'se cierra al cumplirse @timeout: ' + t.slice(-80));
  });
});

describe('Rest Client · herramientas para agentes', () => {
  before(async () => {
    const ext = vscode.extensions.getExtension('vscode-restclient.rest-client');
    await ext!.activate();
    await ajuste('previewResponseInUntitledDocument', true);
  });

  after(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  it('P-44 · las herramientas de modelo de lenguaje listan las peticiones y envían una por su nombre', async function () {
    const lm = (vscode as unknown as { lm?: { invokeTool?: Function } }).lm;
    if (!lm?.invokeTool) {
      this.skip();
      return;
    }
    const fichero = escribir('agente.http', j('# @name saludo', `GET ${BASE}/eco/agente`, 'X-Prueba: desde-agente', '', '###', '', `GET ${BASE}/otra`, ''));
    assert.ok(fs.existsSync(fichero));
    const token = new vscode.CancellationTokenSource().token;
    const texto = (r: { content: { value?: string }[] }) => r.content.map((p) => p.value ?? '').join('');

    const lista = await lm.invokeTool('httpkeeper_list_requests', { input: { file: 'agente.http' }, toolInvocationToken: undefined }, token);
    const datos = JSON.parse(texto(lista));
    assert.strictEqual(datos.requests.length, 2, JSON.stringify(datos));
    assert.strictEqual(datos.requests[0].name, 'saludo');
    assert.strictEqual(datos.requests[0].method, 'GET');
    assert.strictEqual(datos.requests[1].name, undefined);

    const envio = await lm.invokeTool('httpkeeper_send_request', { input: { file: 'agente.http', name: 'saludo' }, toolInvocationToken: undefined }, token);
    const r = JSON.parse(texto(envio));
    assert.strictEqual(r.status, 200, JSON.stringify(r).slice(0, 200));
    assert.ok(r.body.includes('desde-agente'), 'la cabecera llegó al servidor: ' + r.body.slice(0, 120));
    assert.ok(typeof r.ms === 'number');

    await assert.rejects(
      () => lm!.invokeTool!('httpkeeper_list_requests', { input: { file: '../fuera.http' }, toolInvocationToken: undefined }, token),
      /outside the workspace/,
    );
  });
});

describe('HttpKeeper · lo portado de rest-client-next', () => {
  before(async () => {
    const ext = vscode.extensions.getExtension('vscode-restclient.rest-client');
    await ext!.activate();
    await ajuste('previewResponseInUntitledDocument', true);
  });

  after(async () => {
    await vscode.commands.executeCommand('workbench.action.closeAllEditors');
  });

  it('P-47 · Basic Auth: la contraseña puede llevar dos puntos y espacios (upstream #1419)', async () => {
    // «admin:it's a total eclipse»: antes se partía por cada espacio y por cada
    // ':', y llegaba truncada.
    const clave = "it's a total: eclipse";
    const fichero = escribir('basic.http', j(`GET ${BASE}/eco/basic`, `Authorization: Basic admin:${clave}`, ''));
    const t = await enviarFichero(fichero, 0, '/eco/basic');
    const recibida = /"autorizacion":\s*"Basic ([^"]+)"/.exec(t)?.[1] ?? '';
    assert.ok(recibida, 'no llegó cabecera Authorization: ' + t.slice(0, 200));
    assert.strictEqual(Buffer.from(recibida, 'base64').toString('utf8'), `admin:${clave}`);
  });

  it('P-48 · Basic Auth: la forma «usuario contraseña» separada por espacio sigue funcionando', async () => {
    const fichero = escribir('basic2.http', j(`GET ${BASE}/eco/basic2`, 'Authorization: Basic ana secreta', ''));
    const t = await enviarFichero(fichero, 0, '/eco/basic2');
    const recibida = /"autorizacion":\s*"Basic ([^"]+)"/.exec(t)?.[1] ?? '';
    assert.strictEqual(Buffer.from(recibida, 'base64').toString('utf8'), 'ana:secreta');
  });

  it('P-49 · autocompletar dentro de {{ }} no duplica las llaves', async () => {
    const fichero = escribir('completar.http', j('@host = http://ejemplo', 'GET {{host}}/x?id={{', ''));
    const doc = await vscode.workspace.openTextDocument(vscode.Uri.file(fichero));
    await vscode.window.showTextDocument(doc, { preview: false });
    const linea = 1;
    const posicion = new vscode.Position(linea, doc.lineAt(linea).text.length);
    const lista = (await vscode.commands.executeCommand(
      'vscode.executeCompletionItemProvider', doc.uri, posicion)) as vscode.CompletionList;

    const variables = lista.items.filter((i) => typeof i.label === 'string' && (i.label === '$guid' || i.label === 'host'));
    assert.ok(variables.length >= 1, 'sin propuestas de variable: ' + lista.items.map((i) => i.label).slice(0, 10).join(', '));
    for (const item of variables) {
      const texto = typeof item.insertText === 'string' ? item.insertText : (item.insertText as vscode.SnippetString)?.value ?? '';
      assert.ok(!texto.includes('{{'), `«${String(item.label)}» insertaría llaves otra vez: ${texto}`);
      assert.ok(item.range, `«${String(item.label)}» no sustituye el hueco entre llaves`);
    }
  });
});

describe('faker en el editor (carga diferida)', () => {
  it('P-64 · {{$faker internet.email}} se resuelve al enviar (el chunk se carga en caliente)', async function () {
    this.timeout(60000);
    const fichero = escribir('faker.http', j(
      `GET ${BASE}/eco?correo={{$faker internet.email}}`,
      'X-Prueba: marca-faker',
    ));
    const texto = await enviarFichero(fichero, 0, 'marca-faker', 40);
    const correo = /correo=([^&"\\]+)/.exec(texto)?.[1] ?? '';
    assert.ok(/%40|@/.test(correo), `no parece un email: ${correo || texto.slice(0, 200)}`);
    assert.ok(!correo.includes('faker'), 'la variable quedo sin resolver');
  });
});
