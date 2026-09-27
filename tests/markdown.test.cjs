const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

// DOMPurify needs a DOM; it's stubbed so these tests pin the renderer's own
// escaping and URL checks (the sanitizer is a second layer on top).
function load() {
  const exports = {};
  const sanitized = [];
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/markdown.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, {
    exports, URL,
    require: (id) => id === 'dompurify' ? { sanitize: (html, opts) => { sanitized.push(opts); return html; } } : {},
  });
  return { ...exports, sanitized };
}
const md = load();

test('basic Markdown is rendered', () => {
  assert.equal(md.markdownToHtml('# Titre\n\nUn **gras** et *italique*.\n\n- a\n- b'),
    '<h2>Titre</h2><p>Un <strong>gras</strong> et <em>italique</em>.</p><ul><li>a</li><li>b</li></ul>');
});
test('http(s) and same-site links are kept', () => {
  assert.equal(md.markdownToHtml('[CGU](/?legal=cgu)'), '<p><a href="/?legal=cgu" target="_blank" rel="noreferrer">CGU</a></p>');
  assert.equal(md.markdownToHtml('[site](https://dilchap.com/a?b=1&c=2)'), '<p><a href="https://dilchap.com/a?b=1&amp;c=2" target="_blank" rel="noreferrer">site</a></p>');
});
test('quotes never leave the attribute value', () => {
  for (const target of [`https://x.y/"a='b'`, `https://x"onmouseover="alert(1)"`, `/a'b`]) {
    const html = md.markdownToHtml(`[x](${target})`);
    assert.doesNotMatch(html, /<a /, target);
    assert.doesNotMatch(html, /["']on|"a=|'b/, target);
  }
  assert.match(md.markdownToHtml('[x](https://x.y/a%22b)'), /href="https:\/\/x\.y\/a%22b"/);
  assert.equal(md.markdownToHtml(`"quoted" 'text'`), '<p>&quot;quoted&quot; &#39;text&#39;</p>');
});
test('other hosts via // and non-http schemes are not linked', () => {
  for (const target of ['//evil.example', '/\\evil.example', 'javascript:alert(1)', 'data:text/html,x', 'mailto:a@b.c']) {
    assert.doesNotMatch(md.markdownToHtml(`[x](${target})`), /<a /, target);
  }
});
test('raw HTML is escaped and emphasis cannot rewrite a URL', () => {
  assert.equal(md.markdownToHtml('<img src=x>'), '<p>&lt;img src=x&gt;</p>');
  assert.equal(md.markdownToHtml('[a](https://x.y/*b*/c)'), '<p><a href="https://x.y/*b*/c" target="_blank" rel="noreferrer">a</a></p>');
});
test('output goes through DOMPurify with an allow-list', () => {
  md.renderMarkdown('texte');
  assert.ok(md.sanitized.at(-1).ALLOWED_TAGS.includes('a'));
  assert.ok(!md.sanitized.at(-1).ALLOWED_ATTR.includes('style'));
});

// Service worker notification click target.
function loadSw() {
  const listeners = {};
  const context = {
    URL,
    self: { location: { origin: 'https://dilchap.com' }, addEventListener: (t, fn) => { listeners[t] = fn; }, navigator: {} },
    caches: {}, fetch: async () => ({}),
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public/sw.js'), 'utf8'), context);
  return context;
}
test('service worker only treats the exact origin as the app', () => {
  const sw = loadSw();
  assert.equal(sw.isSameOrigin('https://dilchap.com/?listing=1'), true);
  assert.equal(sw.isSameOrigin('/?listing=1'), true);
  assert.equal(sw.isSameOrigin('https://dilchap.com.evil.example/'), false);
  assert.equal(sw.notificationTarget('/?listing=1'), 'https://dilchap.com/?listing=1');
  assert.equal(sw.notificationTarget('https://partner.example/promo'), 'https://partner.example/promo');
  for (const bad of ['//evil.example', '/\\evil.example', 'javascript:alert(1)', undefined, '']) {
    assert.equal(sw.notificationTarget(bad), 'https://dilchap.com/', String(bad));
  }
});
