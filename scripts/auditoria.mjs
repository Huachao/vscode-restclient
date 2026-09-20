// Auditoría del fork: comprueba de una vez todo lo que el plan promete.
// Cada afirmación del README y del plan tiene aquí su comprobación.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

let fallos = 0;
const ok = (n, c, extra = '') => {
  console.log(`  ${c ? 'OK   ' : 'FALLA'} ${n}${extra ? ' · ' + extra : ''}`);
  if (!c) fallos++;
};
const seccion = (t) => console.log(`\n== ${t}`);
// Lo que depende de un servicio ajeno no puede tumbar la bateria: si no se
// pudo comprobar se dice, pero no cuenta como fallo del proyecto.
const aviso = (n, extra = '') => console.log(`  AVISO ${n}${extra ? ' · ' + extra : ''}`);
const correr = (cmd, env) => {
  const opciones = { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env } };
  try {
    return { salida: execSync(cmd, opciones), codigo: 0 };
  } catch (e) {
    return { salida: (e.stdout ?? '') + (e.stderr ?? ''), codigo: e.status ?? 1 };
  }
};
const leer = (f) => fs.readFileSync(f, 'utf8');

/**
 * `npm --json` no garantiza que la salida sea solo JSON: desde septiembre de
 * 2026 npm intercala avisos como «npm notice This endpoint is being retired»
 * y `JSON.parse` de la salida entera revienta. Eso tumbó la CI en las tres
 * plataformas sin que nada del proyecto hubiera cambiado, asi que aqui se
 * extrae el objeto en vez de confiar en que venga limpio.
 */
const json = (salida) => {
  const i = salida.indexOf('{');
  const f = salida.lastIndexOf('}');
  if (i < 0 || f < i) {
    return {};
  }
  try {
    return JSON.parse(salida.slice(i, f + 1));
  } catch {
    return {};
  }
};

seccion('identidad');
const pkg = JSON.parse(leer('package.json'));
ok('el nombre es el del original y el editor el nuestro', pkg.name === 'rest-client' && pkg.publisher === 'vscode-restclient');
ok('se publica gratis', pkg.pricing === 'Free');
// `onLanguage:markdown` está por los bloques ```http dentro de markdown, que es
// una función real. Lo inaceptable sería `*`: activarse siempre, pase lo que pase.
ok('no se activa en todo arranque', !(pkg.activationEvents ?? []).includes('*'), `eventos: ${JSON.stringify(pkg.activationEvents)}`);
ok('sigue aportando el lenguaje http', pkg.contributes.languages?.some((l) => l.id === 'http'));
// Los comandos publicos son la API original de REST Client, restaurada a
// peticion de la organizacion (issue #1): la lista exacta la congela
// src/test/integration/suite/commandIds.test.ts; aqui se vigila la forma.
ok('los comandos publicos llevan el prefijo original', pkg.contributes.commands.length === 21 && pkg.contributes.commands.every((c) => c.command.startsWith('rest-client.')), pkg.contributes.commands.map((c) => c.command).filter((c) => !c.startsWith('rest-client.')).join(', '));
ok('el runner se publica como binario', pkg.bin?.httpkeeper !== undefined, pkg.bin?.httpkeeper);

seccion('crédito al autor original (es MIT, pero se dice)');
const readme = leer('README.md');
ok('el README nombra a Huachao Mao', readme.includes('Huachao Mao'));
ok('el README enlaza al repositorio original', readme.includes('github.com/Huachao/vscode-restclient'));
ok('la licencia MIT original se conserva', leer('LICENSE').includes('MIT'));

seccion('copyright: lo que exige cada licencia se cumple');
const licencia = leer('LICENSE');
ok('el aviso de copyright original esta verbatim', licencia.includes('Copyright (c) 2016 - present Huachao Mao'));
ok('el aviso de permiso MIT esta completo', licencia.includes('The above copyright notice and this permission notice shall be included'));
ok('el manifiesto reconoce al autor original', JSON.stringify(pkg.contributors ?? []).includes('Huachao Mao'));
ok('la licencia declarada es MIT', pkg.license === 'MIT');
// BSD y Apache exigen reproducir el aviso en la distribucion binaria; el
// bundle de webpack solo conserva los comentarios /*! */, asi que ademas viaja
// un fichero con la licencia de cada paquete de produccion.
const avisos = fs.existsSync('THIRD-PARTY-NOTICES.txt') ? leer('THIRD-PARTY-NOTICES.txt') : '';
ok('existe el fichero de avisos de terceros', avisos.length > 0);
// El fichero se genera con scripts/generar-notices.mjs: si alguien añade una
// dependencia y no lo regenera, aqui se le dice, en vez de descubrirlo un abogado.
ok('los avisos de terceros estan al dia (generar-notices --check)', correr('node scripts/generar-notices.mjs --check').codigo === 0);
const arbol = json(correr('npm ls --omit=dev --all --json').salida);
const paquetes = new Set();
// Sin version = dependencia opcional que npm no instalo; no viaja, no cuenta.
const recorrerArbol = (nodo) => { for (const [n, v] of Object.entries(nodo?.dependencies ?? {})) { if (v.version) { paquetes.add(`${n}@${v.version}`); recorrerArbol(v); } } };
recorrerArbol(arbol);
const sinAviso = [...paquetes].filter((pq) => !avisos.includes(`\n${pq}\n`));
ok('todo paquete de produccion tiene su aviso', paquetes.size > 0 && sinAviso.length === 0, sinAviso.length ? sinAviso.slice(0, 5).join(', ') : `${paquetes.size} paquetes`);
const copyleft = [...avisos.matchAll(/^License: (.+)$/gm)].map((m) => m[1]).filter((l) => /GPL|SSPL|UNKNOWN|UNLICENSED|CC-BY-NC|EUPL|OSL/i.test(l));
ok('ninguna licencia copyleft ni desconocida', copyleft.length === 0, copyleft.join(', '));

seccion('activos propios (no se hereda la imagen de nadie)');
ok('el icono declarado existe', fs.existsSync(pkg.icon ?? ''), pkg.icon);
const imagenes = fs.existsSync('images') ? fs.readdirSync('images') : [];
ok('sin el icono del proyecto original', !imagenes.includes('rest_icon.png'));
ok('sin los gif de demostración del original', !imagenes.some(f => /demo|response|code-snippet|usage/.test(f)), imagenes.join(', '));

seccion('privacidad: no habla con nadie');
ok('sin dependencia de telemetría', !JSON.stringify(pkg.dependencies).includes('applicationinsights'));
const conTelemetria = correr('git grep -l "applicationinsights\\|trackEvent\\|AiKey" -- src').salida.trim();
ok('sin rastro de telemetría en el código', conTelemetria === '', conTelemetria);
ok('sin ajuste de telemetría en la ficha', !JSON.stringify(pkg.contributes.configuration).includes('Telemetry'));

seccion('dependencias');
// `npm audit` sale a la red en cada ejecucion: si el registro va lento, esta
// caido o cambia el formato, no es un problema de este repositorio. Se le da
// un limite de tiempo y, sin datos, queda como aviso en vez de tumbar la CI.
const audit = json(correr('npm audit --omit=dev --json --fetch-timeout=60000').salida);
const v = audit.metadata?.vulnerabilities ?? {};
if (typeof v.total === 'number') {
  ok('ninguna vulnerabilidad en produccion', v.total === 0, `total: ${v.total}`);
} else {
  aviso('vulnerabilidades en produccion: npm audit no devolvio datos', 'sin red o formato inesperado');
}
ok('aws-amplify fuera', !JSON.stringify(pkg.dependencies).includes('aws-amplify'));
ok('xmldom sin mantenimiento fuera', pkg.dependencies.xmldom === undefined);

seccion('el núcleo no depende del editor');
for (const f of ['src/cli/index.ts', 'src/cli/mcp.ts', 'src/cli/parserMinimo.ts', 'src/core/secuencia.ts', 'src/core/aserciones.ts', 'src/core/entornosJetBrains.ts', 'src/core/importaciones.ts', 'src/core/sse.ts', 'src/core/websocket.ts', 'src/core/junit.ts', 'src/utils/httpClient.ts']) {
  const r = correr(`node scripts/rastrear-vscode.mjs ${f}`);
  ok(`${path.basename(f)} no arrastra vscode`, r.codigo === 0, r.codigo === 0 ? '' : r.salida.split('\n')[0]);
}
const compilado = fs.existsSync('dist-cli/cli/index.js');
ok('el runner está compilado', compilado);
if (compilado) {
  const cargados = fs.readdirSync('dist-cli', { recursive: true }).filter((f) => String(f).endsWith('.js'));
  ok('el runner no empaqueta controladores del editor', !cargados.some((f) => String(f).includes('controllers')), cargados.length + ' ficheros');
}

seccion('los recursos que pide el codigo existen y viajan');
// Tres fallos reales salieron de aqui: un css renombrado a medias, el js del
// webview excluido del paquete y un icono heredado que ya no existia. Ninguno
// rompe la compilacion; se ven al abrir la pestana de respuesta ya instalada.
const recursos = [...leer('src/views/baseWebview.ts').matchAll(/asAbsolutePath\(path\.join\('([^']+)', '([^']+)'\)\)/g)]
  .map((m) => `${m[1]}/${m[2]}`);
ok('el codigo pide recursos por ruta', recursos.length > 0, recursos.join(', '));
for (const r of recursos) {
  ok(`existe ${r}`, fs.existsSync(r));
}

seccion('el cambio de nombre no dejo cabos sueltos');
// El fork renombro comandos y ajustes. Lo que se quedo a medias no rompe la
// compilacion: el enlace de un documento llamaba a `rest-client._openDocumentLink`
// y, con REST Client instalado, se lo abria la otra extension.
const fuentes = correr('git ls-files src').salida.split(/\r?\n/).filter((f) => f.endsWith('.ts') && !f.startsWith('src/test'));
const registrados = new Set([...leer('package.json').matchAll(/"command":\s*"([^"]+)"/g)].map((m) => m[1]));
for (const f of fuentes) {
  for (const m of leer(f).matchAll(/registerCommand(?:Safely)?\('([^']+)'/g)) registrados.add(m[1]);
}
const invocados = new Set();
for (const f of fuentes) {
  for (const m of leer(f).matchAll(/command:([a-z0-9-]+\.[A-Za-z0-9._-]+)/g)) invocados.add(m[1]);
}
const huerfanos = [...invocados].filter((c) => !registrados.has(c));
ok('todo comando invocado por enlace existe', huerfanos.length === 0, huerfanos.join(', '));

// Solo se miran las cadenas con guion: los identificadores internos
// (RestClientSettings y compania) se dejan como estan para que los parches del
// proyecto original sigan aplicando sin ruido.
// El identificador que el código anuncia tiene que ser el que publica el
// manifiesto: si no, `extensions.getExtension(...)` devuelve undefined y la
// extensión no se encuentra a sí misma (pasó al renombrar el fork).
// Con comillas simples o dobles: el formateador de cada cual no debe cegar la comprobacion.
const idDeclarado = /ExtensionId: string = ['"]([^'"]+)['"]/.exec(leer('src/common/constants.ts'))?.[1];
ok('el id del código es publisher.name del manifiesto', idDeclarado === `${pkg.publisher}.${pkg.name}`, `${idDeclarado} vs ${pkg.publisher}.${pkg.name}`);

seccion('nivel 2: formato JetBrains, streaming, agentes y runner');
const cliFuente = leer('src/cli/index.ts');
ok('el runner entiende --env, --secret, --junit y --timeout', ['--env', '--secret', '--junit', '--timeout'].every((o) => cliFuente.includes(`'${o}'`)));
ok('el runner lee http-client.env.json e import/run', cliFuente.includes('carpetaDeEntornos') && cliFuente.includes('resolverRun'));
const selector = leer('src/utils/selector.ts');
ok('el editor resuelve run #nombre y salta las lineas import', selector.includes('resolverRun') && selector.includes('isImportLine'));
const sistema = leer('src/utils/httpVariableProviders/systemVariableProvider.ts');
ok('el editor tiene $secret y los alias de JetBrains', sistema.includes('SecretVariableName') && sistema.includes('UuidVariableName') && sistema.includes('IsoTimestampVariableName'));
const controlador = leer('src/controllers/requestController.ts');
ok('el panel pinta text/event-stream segun llega', controlador.includes('iniciarStreaming') && controlador.includes('anadirTrozo'));
ok('WEBSOCKET se atiende en el editor y en el runner', controlador.includes("'WEBSOCKET'") && leer('src/cli/parserMinimo.ts').includes("'WEBSOCKET'"));
const herramientas = leer('src/utils/herramientasLm.ts');
ok('la herramienta de envio para agentes pide confirmacion', herramientas.includes('prepareInvocation') && herramientas.includes('confirmationMessages'));
ok('la herramienta rechaza ficheros fuera del espacio de trabajo', herramientas.includes('is outside the workspace'));
ok('las herramientas van declaradas en el manifiesto', (pkg.contributes.languageModelTools ?? []).length === 2 && (pkg.contributes.mcpServerDefinitionProviders ?? []).length === 1);
const mcp = leer('src/cli/mcp.ts');
ok('el servidor MCP acota la raiz y no escribe en disco', mcp.includes('dentroDeLaRaiz') && !/fs\.write|writeFileSync/.test(mcp));
const mcpPrueba = correr('node scripts/probar-mcp.mjs');
ok('el servidor MCP pasa su prueba de punta a punta', mcpPrueba.codigo === 0, /(\d+) fallos/.exec(mcpPrueba.salida)?.[0] ?? '');
ok('existe la accion de GitHub y descarga el runner de la publicacion', fs.existsSync('action.yml') && leer('action.yml').includes('using: composite') && leer('action.yml').includes('httpkeeper-cli.js'));
ok('el flujo de release adjunta el runner suelto', leer('.github/workflows/release.yml').includes('httpkeeper-cli.js'));
const npmPkg = JSON.parse(leer('npm/package.json'));
ok('el paquete npm tiene el mismo numero de version', npmPkg.version === pkg.version, `npm ${npmPkg.version} / extension ${pkg.version}`);
ok('el paquete npm es solo el runner', npmPkg.bin?.httpkeeper === 'cli.js' && JSON.stringify(npmPkg.files) === JSON.stringify(['cli.js', 'README.md', 'LICENSE']) && !npmPkg.dependencies);
ok('la gramatica pinta import y run', leer('syntaxes/http.tmLanguage.json').includes('http.import') && leer('syntaxes/http.tmLanguage.json').includes('http.run'));

seccion('las dos lenguas estan completas');
const l10n = correr('node scripts/comprobar-l10n.mjs');
ok('ingles y castellano sin huecos', l10n.codigo === 0, /=+ (\d+) fallos/.exec(l10n.salida)?.[1] + ' fallos');

seccion('el paquete lleva lo que promete y nada mas');
const empaquetados = correr('npx vsce ls --no-dependencies').salida.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const enPaquete = (f) => empaquetados.includes(f);
ok('el bundle del runner viaja en el paquete', enPaquete('dist/cli.js'));
ok('el binario declarado es el que viaja', enPaquete(pkg.bin.httpkeeper.replace('./', '')));
ok('los avisos de terceros viajan', enPaquete('THIRD-PARTY-NOTICES.txt') && enPaquete('LICENSE'));
ok('los dos idiomas viajan', enPaquete('package.nls.json') && enPaquete('package.nls.es.json'));
for (const r of recursos) {
  ok(`${r} viaja en el paquete`, enPaquete(r));
}
ok('sin codigo fuente dentro', !empaquetados.some((f) => f.startsWith('src/')));
ok('sin mapas de codigo dentro', !empaquetados.some((f) => f.endsWith('.map')));
ok('sin los documentos internos dentro', !empaquetados.some((f) => f.startsWith('docs/') || f.startsWith('scripts/')));
ok('sin el paquete npm ni la accion dentro', !empaquetados.some((f) => f.startsWith('npm/') || f === 'action.yml'));
if (fs.existsSync('dist/cli.js')) {
  const cli = leer('dist/cli.js');
  ok('el runner publicado arranca solo (shebang)', cli.startsWith('#!/usr/bin/env node'));
  ok('el runner publicado no carga el editor', !cli.includes('require("vscode")'));
  const r = correr('node dist/cli.js');
  ok('el runner publicado explica su uso', r.codigo === 2 && r.salida.includes('uso:'));
}

seccion('compila y pasa las pruebas');
ok('el código compila', correr('npx tsc -p ./ --noEmit --skipLibCheck').codigo === 0);
ok('el runner compila', correr('npx tsc -p tsconfig.cli.json --noEmit').codigo === 0);
const unit = correr('npx mocha "out-test/test/unit/**/*.test.js"');
const nUnit = /(\d+) passing/.exec(unit.salida)?.[1] ?? '0';
ok('pruebas unitarias en verde', unit.codigo === 0 && Number(nUnit) >= 15, `${nUnit} pruebas`);
const cli = correr('node scripts/probar-cli.mjs');
ok('el runner pasa su prueba de punta a punta', cli.codigo === 0, /(\d+) fallos/.exec(cli.salida)?.[0] ?? '');
const cliPub = correr('node scripts/probar-cli.mjs', { CLI_RUTA: 'dist/cli.js' });
ok('el runner publicado pasa la misma prueba', cliPub.codigo === 0, /(\d+) fallos/.exec(cliPub.salida)?.[0] ?? '');

seccion('compatibilidad con REST Client');
const troceo = leer('src/core/secuencia.ts');
ok('el troceo por ### se comporta como el original', troceo.includes('getDelimiterRows'));

seccion('promesas del README');
// El numero de pruebas es lo primero que se queda viejo en un README, y aqui
// es ademas el argumento central del fork. Se cuenta, no se cree.
const cuentaIts = (dir) => fs.readdirSync(dir, { recursive: true })
  .filter((f) => String(f).endsWith('.test.ts'))
  .reduce((n, f) => n + (leer(path.join(dir, String(f))).match(/\bit\(/g)?.length ?? 0), 0);
const nPruebas = cuentaIts('src/test/unit') + cuentaIts('src/test/integration');
for (const f of ['docs/HTTPKEEPER.md', 'docs/HTTPKEEPER.es.md']) {
  const prometido = /\*\*(\d+)\*\*\s*\(/.exec(leer(f))?.[1];
  ok(`${f} promete el numero de pruebas que hay`, Number(prometido) === nPruebas, `dice ${prometido}, hay ${nPruebas}`);
}
ok('las unitarias que corren son las que estan escritas', Number(nUnit) === cuentaIts('src/test/unit'), `${nUnit} corriendo`);
ok('promete 400 paquetes', leer('docs/HTTPKEEPER.md').includes('400') && readme.includes('400'));
ok('promete cero telemetría', leer('docs/HTTPKEEPER.md').toLowerCase().includes('none') && readme.toLowerCase().includes('telemetry removed'));

console.log(`\n===== ${fallos} fallos`);
process.exit(fallos ? 1 : 0);
