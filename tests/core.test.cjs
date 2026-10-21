const test = require('node:test');
const assert = require('node:assert/strict');
const { bizDate, shiftDate } = require('../miniprogram-1/miniprogram/utils/date');
const { createStore } = require('../miniprogram-1/miniprogram/services/store');
test('business date follows Beijing midnight and crosses year boundaries', () => {
  assert.equal(bizDate(Date.parse('2026-10-21T15:59:59Z')), '2026-10-21');
  assert.equal(bizDate(Date.parse('2026-10-21T16:00:00Z')), '2026-10-22');
  assert.equal(shiftDate('2026-12-31', 1), '2027-01-01');
  assert.equal(shiftDate('2028-03-01', -1), '2028-02-29');
});
test('storage persists snapshots without leaking mutable references', () => {
  let saved;
  const storage = { get: () => saved, set: value => { saved = value; } };
  const store = createStore(storage);
  store.write({ version: 1, items: [1] });
  store.read().items.push(2);
  assert.deepEqual(createStore(storage).read().items, [1]);
  storage.set = () => { throw new Error('disk full'); };
  assert.throws(() => store.write({ version: 1, items: [] }), /存储/);
  assert.deepEqual(store.read().items, [1]);
});
