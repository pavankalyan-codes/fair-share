const assert = require('node:assert/strict');
require('../js/storage');

const tests = [];

function test(name, fn) {
  tests.push({ fn, name });
}

function createMockService(initialSession = null) {
  let session = initialSession;
  let writes = 0;
  return {
    clearSession: async () => {
      session = null;
    },
    currentUser: () => ({ uid: 'user-123' }),
    getSession: () => session,
    getWrites: () => writes,
    loadSession: async () => session,
    saveSession: async state => {
      writes += 1;
      session = state;
    },
  };
}

test('saves Firestore session state through the injected Firebase service', async () => {
  const service = createMockService();
  const storage = globalThis.FairShareStorage.createFirestoreStorage(service, () => false);
  const state = {
    expenses: [{ amount: 12, desc: 'Lunch', payer: 0, splits: { 0: 6, 1: 6 } }],
    names: ['Ava', 'Ben'],
  };

  await storage.save(state);

  assert.deepEqual(service.getSession(), state);
  assert.equal(service.getWrites(), 1);
});

test('loads valid Firestore session data', async () => {
  const session = { expenses: [], names: ['Ava', 'Ben'] };
  const service = createMockService(session);
  const storage = globalThis.FairShareStorage.createFirestoreStorage(service, () => false);

  assert.deepEqual(await storage.load(), {
    found: true,
    migrated: false,
    state: session,
  });
});

test('ignores missing or incomplete Firestore session data', async () => {
  const service = createMockService({ expenses: [], names: ['Ava'] });
  const storage = globalThis.FairShareStorage.createFirestoreStorage(service, () => false);

  assert.deepEqual(await storage.load(), { found: false });
});

test('persists normalized legacy data after loading from Firestore', async () => {
  const session = { expenses: [{ amount: 9, payer: 0, splits: { 0: 4.51, 1: 4.49 } }], names: ['Ava', 'Ben'] };
  const service = createMockService(session);
  const storage = globalThis.FairShareStorage.createFirestoreStorage(service, (names, expenses) => {
    expenses[0].splits = { 0: 4.5, 1: 4.5 };
    return true;
  });

  const result = await storage.load();

  assert.equal(result.migrated, true);
  assert.deepEqual(service.getSession().expenses[0].splits, { 0: 4.5, 1: 4.5 });
  assert.equal(service.getWrites(), 1);
});

(async () => {
  for (const { fn, name } of tests) {
    try {
      await fn();
      console.log(`ok - ${name}`);
    } catch (err) {
      console.error(`not ok - ${name}`);
      throw err;
    }
  }
})();
