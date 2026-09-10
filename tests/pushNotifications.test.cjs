const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');

function setup({ ios = false, pending = false, rotated = false } = {}) {
  const calls = [];
  const subscription = {
    options: { applicationServerKey: new Uint8Array(rotated ? [9] : [1, 2, 3]).buffer },
    unsubscribe: async () => calls.push('unsubscribe'),
    toJSON: () => ({ endpoint: 'https://push.example/sub', keys: { p256dh: 'key', auth: 'auth' } }),
  };
  const registration = { pushManager: {
    getSubscription: async () => subscription,
    subscribe: async () => { calls.push('subscribe'); return subscription; },
  } };
  const exports = {};
  const context = {
    exports, Uint8Array, atob,
    setTimeout: (fn) => setTimeout(fn, 5), clearTimeout,
    navigator: { userAgent: ios ? 'iPhone' : 'Chrome', serviceWorker: { ready: pending ? new Promise(() => {}) : Promise.resolve(registration) } },
    window: { matchMedia: () => ({ matches: false }), ...(ios ? {} : { PushManager: {}, Notification: {} }) },
    Notification: { permission: 'granted' },
    require: (id) => id === './apollo' ? { apolloClient: {
      query: async () => ({ data: { vapidPublicKey: 'AQID' } }),
      mutate: async () => { calls.push('save'); },
    } } : id === './serviceWorker' ? { registerServiceWorker: () => calls.push('register') } : {},
  };
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/pushNotifications.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
  return { api: exports, calls };
}

test('iPhone gives installation guidance even without PushManager', () => {
  assert.equal(setup({ ios: true }).api.getPushAvailability(), 'ios-install-required');
});
test('existing subscription is saved for the authenticated account', async () => {
  const { api, calls } = setup();
  assert.equal(await api.subscribeToPush(), 'subscribed');
  assert.deepEqual(calls, ['register', 'save']);
});
test('changed VAPID key replaces the old subscription', async () => {
  const { api, calls } = setup({ rotated: true });
  assert.equal(await api.subscribeToPush(), 'subscribed');
  assert.deepEqual(calls, ['register', 'unsubscribe', 'subscribe', 'save']);
});
test('worker that never activates returns an error instead of hanging', async () => {
  assert.equal(await setup({ pending: true }).api.subscribeToPush(), 'error');
});

test('service worker registration works after the page load event', async () => {
  let registered = false;
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/serviceWorker.ts'), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    exports,
    document: { readyState: 'complete' },
    window: { addEventListener: () => assert.fail('load already fired') },
    navigator: { serviceWorker: { register: async () => {
      registered = true;
      return { addEventListener() {} };
    } } },
  });
  exports.registerServiceWorker();
  assert.equal(registered, true);
});

