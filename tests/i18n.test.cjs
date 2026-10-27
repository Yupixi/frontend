const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

// node --test tests/i18n.test.cjs — the translation files and the small
// i18n runtime (src/i18n): French and English have the same keys, and the
// language detection / plurals / interpolation behave.

const root = path.join(__dirname, '..');
const locales = path.join(root, 'src/i18n/locales');

function load(rel, stubs = {}) {
  const exports = {};
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText
    .replace(/import\.meta\.env\.DEV/g, 'false');
  vm.runInNewContext(js, { exports, require: (id) => stubs[id] ?? {}, console, document: { documentElement: {} } }, { filename: rel });
  return exports;
}

test('every namespace has the same keys, placeholders and tags in fr and en', async () => {
  const { compareLocales } = await import(path.join(root, 'scripts/i18n-check.mjs').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));
  const fr = fs.readdirSync(path.join(locales, 'fr')).filter((f) => f.endsWith('.json')).sort();
  const en = fs.readdirSync(path.join(locales, 'en')).filter((f) => f.endsWith('.json')).sort();
  assert.deepEqual(en, fr, 'same namespace files');
  const problems = [];
  for (const f of fr) {
    const a = JSON.parse(fs.readFileSync(path.join(locales, 'fr', f), 'utf8'));
    const b = JSON.parse(fs.readFileSync(path.join(locales, 'en', f), 'utf8'));
    problems.push(...compareLocales(a, b, `${f}:`));
  }
  assert.deepEqual(problems, []);
});

test('the parity check catches a missing key, a renamed placeholder and a lost tag', async () => {
  const { compareLocales } = await import(path.join(root, 'scripts/i18n-check.mjs').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));
  assert.match(compareLocales({ a: 'x', b: 'y' }, { a: 'x' }).join(), /b: in fr, missing in en/);
  assert.match(compareLocales({ a: 'x' }, { a: 'x', c: 'z' }).join(), /c: in en, missing in fr/);
  assert.match(compareLocales({ a: 'Bonjour {{name}}' }, { a: 'Hello {{nom}}' }).join(), /placeholders differ/);
  assert.match(compareLocales({ a: '<b>Gras</b>' }, { a: 'Bold' }).join(), /tags differ/);
  // Plural forms: French « _one » + « _other » ↔ English « _one » + « _other »; « _zero » optional.
  assert.deepEqual(compareLocales({ n_zero: 'Aucune', n_one: '{{count}} annonce', n_other: '{{count}} annonces' }, { n_one: '{{count}} listing', n_other: '{{count}} listings' }), []);
});

test('language detection: ?lang ▸ member ▸ device ▸ browser ▸ country, only among enabled languages', () => {
  const { resolveLocale } = load('src/i18n/resolve.ts');
  const both = { enabled: ['fr', 'en'], countryDefault: 'fr' };
  assert.equal(resolveLocale({ ...both }), 'fr');
  assert.equal(resolveLocale({ ...both, urlLang: 'en', userLocale: 'fr', stored: 'fr' }), 'en');
  assert.equal(resolveLocale({ ...both, userLocale: 'en', stored: 'fr' }), 'en');
  assert.equal(resolveLocale({ ...both, stored: 'en', browser: ['fr-FR'] }), 'en');
  assert.equal(resolveLocale({ ...both, browser: ['en-US', 'fr'] }), 'en');
  assert.equal(resolveLocale({ ...both, browser: ['de-DE'] }), 'fr');
  assert.equal(resolveLocale({ enabled: ['fr', 'en'], countryDefault: 'en' }), 'en');
  // French only (the default): nothing else can win.
  const frOnly = { enabled: ['fr'], countryDefault: 'fr' };
  assert.equal(resolveLocale({ ...frOnly, urlLang: 'en', userLocale: 'en', stored: 'en', browser: ['en'] }), 'fr');
  assert.equal(resolveLocale({ ...both, urlLang: 'xx' }), 'fr');
});

test('runtime: interpolation, plurals (French 0 and 1 singular), fallback to French', () => {
  const react = { createElement: (type, props, ...children) => ({ type, props, children }), Fragment: 'Fragment', useSyncExternalStore: () => 'fr' };
  const core = load('src/i18n/core.ts', { react });
  const ns = core.defineNamespace('demo', {
    hello: 'Bonjour {{name}}',
    items_zero: 'Aucune annonce',
    items_one: '{{count}} annonce',
    items_other: '{{count}} annonces',
    only_fr: 'Seulement en français',
  });
  assert.equal(ns.t('hello', { name: 'Awa' }), 'Bonjour Awa');
  assert.equal(ns.t('items', { count: 0 }), 'Aucune annonce');
  assert.equal(ns.t('items', { count: 1 }), '1 annonce');
  assert.equal(ns.t('items', { count: 12500 }), '12 500 annonces');
  assert.equal(core.groupNumber(1234567.5, 'en'), '1,234,567.5');
  assert.equal(core.groupNumber(1234567, 'fr'), '1 234 567');
  assert.equal(ns.t('only_fr'), 'Seulement en français');
});
