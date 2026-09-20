// Comprueba que las dos traducciones estan completas y sin sobras.
//
// Son dos mecanismos distintos y hay que mirar los dos:
//   - package.nls*.json  -> lo que se ve en la ficha, los comandos y los ajustes
//   - l10n/bundle.*.json -> las cadenas que el codigo pasa por vscode.l10n.t()
// Una clave que falta no rompe nada: sale en ingles y nadie se entera hasta que
// lo ve un usuario. Por eso se comprueba aqui y no a ojo.
import fs from 'node:fs';
import path from 'node:path';

let fallos = 0;
const ok = (n, c, extra = '') => {
    console.log(`  ${c ? 'OK   ' : 'FALLA'} ${n}${extra ? ' · ' + extra : ''}`);
    if (!c) fallos++;
};
const leerJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));

// --- 1. La ficha, los comandos y los ajustes -------------------------------
const base = leerJson('package.nls.json');
const es = leerJson('package.nls.es.json');
const clavesBase = Object.keys(base);
const faltan = clavesBase.filter((k) => !(k in es));
const sobran = Object.keys(es).filter((k) => !(k in base));
const sinTraducir = clavesBase.filter((k) => k in es && es[k] === base[k]);

console.log('== package.nls (ficha, comandos y ajustes)');
ok('el ingles tiene claves', clavesBase.length > 0, `${clavesBase.length} claves`);
ok('el castellano no deja ninguna fuera', faltan.length === 0, faltan.join(', '));
ok('el castellano no inventa claves', sobran.length === 0, sobran.join(', '));
ok('ninguna quedo copiada del ingles', sinTraducir.length === 0, sinTraducir.join(', '));

// Toda clave declarada tiene que usarse en el manifiesto, y al reves.
const manifiesto = fs.readFileSync('package.json', 'utf8');
const usadas = new Set([...manifiesto.matchAll(/"%([^%"]+)%"/g)].map((m) => m[1]));
const declaradasSinUsar = clavesBase.filter((k) => !usadas.has(k));
const usadasSinDeclarar = [...usadas].filter((k) => !(k in base));
ok('no sobra ninguna clave declarada', declaradasSinUsar.length === 0, declaradasSinUsar.join(', '));
ok('el manifiesto no pide claves que no existen', usadasSinDeclarar.length === 0, usadasSinDeclarar.join(', '));

// --- 2. Las cadenas del codigo ---------------------------------------------
console.log('\n== l10n (cadenas del codigo)');
const pkg = leerJson('package.json');
ok('el manifiesto declara la carpeta l10n', pkg.l10n === './l10n', pkg.l10n ?? 'sin declarar');

const ficherosTs = [];
const recorrer = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
            if (e.name !== 'test') recorrer(p);
        } else if (e.name.endsWith('.ts')) {
            ficherosTs.push(p);
        }
    }
};
recorrer('src');

// l10n.t('...') y l10n.t("...") con literal; las plantillas con backtick no se
// pueden traducir y se cazan aparte.
const literales = new Map();
const conPlantilla = [];
for (const f of ficherosTs) {
    const texto = fs.readFileSync(f, 'utf8');
    for (const m of texto.matchAll(/l10n\.t\(\s*'((?:[^'\\]|\\.)*)'/g)) {
        literales.set(m[1].replace(/\\'/g, "'").replace(/\\"/g, '"'), f);
    }
    for (const m of texto.matchAll(/l10n\.t\(\s*"((?:[^"\\]|\\.)*)"/g)) {
        literales.set(m[1].replace(/\\"/g, '"'), f);
    }
    if (/l10n\.t\(\s*`/.test(texto)) conPlantilla.push(f);
}

const bundleEs = leerJson('l10n/bundle.l10n.es.json');
const sinBundle = [...literales.keys()].filter((k) => !(k in bundleEs));
const bundleSobra = Object.keys(bundleEs).filter((k) => !literales.has(k));

ok('el codigo pasa cadenas por l10n.t', literales.size > 0, `${literales.size} cadenas`);
ok('todas tienen castellano', sinBundle.length === 0, sinBundle.slice(0, 5).join(' | '));
ok('el castellano no traduce fantasmas', bundleSobra.length === 0, bundleSobra.slice(0, 5).join(' | '));
ok('ninguna se paso con plantilla (no se traduciria)', conPlantilla.length === 0, conPlantilla.join(', '));

// Los huecos {0}, {1}... tienen que ser los mismos a los dos lados: si el
// castellano se deja uno, el usuario ve el texto sin el dato.
const huecos = (s) => [...s.matchAll(/\{(\d+)\}/g)].map((m) => m[1]).sort().join(',');
const descuadre = [...literales.keys()].filter((k) => k in bundleEs && huecos(k) !== huecos(bundleEs[k]));
ok('los huecos {0} cuadran en las dos lenguas', descuadre.length === 0, descuadre.join(' | '));

console.log(`\n===== ${fallos} fallos`);
process.exit(fallos ? 1 : 0);
