import test from 'node:test';
import assert from 'node:assert/strict';
import { applyTicketEdits, createTicketPersistence, TICKET_CACHE_KEY } from '../src/pumpdown/ticketPersistence.js';

class Storage {
  values = new Map();
  get length() { return this.values.size; }
  key(i) { return [...this.values.keys()][i] ?? null; }
  getItem(key) { return this.values.get(key) ?? null; }
  setItem(key, value) { this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}
const ticket = { id: 'a', job: 'Original', status: 'running' };
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
function database(tickets = [ticket]) {
  const db = { tickets, updated_at: '2026-10-18T00:00:00.000Z', writes: 0, fail: false, beforeRead: null, beforeWrite: null };
  db.client = { from() {
    let payload;
    const filters = {};
    const query = {
      select() { return query; },
      abortSignal() { return query; },
      eq(key, value) { filters[key] = value; return query; },
      update(value) { payload = value; return query; },
      maybeSingle() { return execute(); },
      then(resolve, reject) { return execute().then(resolve, reject); },
    };
    async function execute() {
      if (db.fail) return { error: new Error('Offline') };
      if (!payload) {
        await db.beforeRead?.();
        return { data: { tickets: structuredClone(db.tickets), updated_at: db.updated_at } };
      }
      await db.beforeWrite?.();
      if (filters.updated_at !== db.updated_at) return { data: [] };
      db.writes++;
      Object.assign(db, structuredClone(payload));
      return { data: [{ updated_at: db.updated_at }] };
    }
    return query;
  } };
  return db;
}
function setup(t, db, storage = new Storage()) {
  let visible;
  const statuses = [];
  const persistence = createTicketPersistence({
    client: db.client, storage, initialTickets: [ticket], normalize: value => value,
    onTickets: value => { visible = value; }, onStatus: (...args) => statuses.push(args),
  });
  t.after(() => persistence.stop());
  persistence.start();
  return { persistence, storage, statuses, visible: () => visible };
}

test('field changes preserve unrelated tickets and fields; deletes stay deleted', () => {
  assert.deepEqual(applyTicketEdits([ticket, { id: 'b' }], [
    { type: 'update', id: 'a', fields: { job: 'Edited' } },
    { type: 'remove', id: 'b' },
    { type: 'update', id: 'b', fields: { job: 'Stale edit' } },
  ]), [{ ...ticket, job: 'Edited' }]);
});

test('opening the page does not write a stale cached list to the server', async t => {
  const db = database([{ id: 'remote' }]);
  const state = setup(t, db);
  await state.persistence.sync();
  assert.equal(db.writes, 0);
  assert.deepEqual(state.visible(), [{ id: 'remote' }]);
});

test('edits during loading survive and are backed up synchronously', async t => {
  const db = database();
  const gate = deferred();
  db.beforeRead = () => gate.promise;
  const state = setup(t, db);
  state.persistence.edit({ type: 'add', ticket: { id: 'new', job: 'New ticket' } });
  assert.equal(JSON.parse(state.storage.getItem(TICKET_CACHE_KEY))[0].id, 'new');
  gate.resolve();
  await state.persistence.sync();
  assert.equal(db.tickets[0].id, 'new');
  assert.equal(state.persistence.hasPending(), false);
});

test('conditional save retries a concurrent change without losing either user’s work', async t => {
  const db = database();
  const state = setup(t, db);
  await state.persistence.sync();
  state.persistence.edit({ type: 'update', id: 'a', fields: { job: 'My edit' } });
  db.beforeWrite = () => {
    db.beforeWrite = null;
    db.tickets = [{ ...ticket, status: 'in IDK' }, { id: 'other-user-ticket' }];
    db.updated_at = '2026-10-18T00:00:01.000Z';
  };
  await state.persistence.sync();
  assert.deepEqual(db.tickets, [{ ...ticket, job: 'My edit', status: 'in IDK' }, { id: 'other-user-ticket' }]);
});

test('failed saves keep the outbox and a reopened page recovers it', async t => {
  const db = database();
  const first = setup(t, db);
  await first.persistence.sync();
  db.fail = true;
  first.persistence.edit({ type: 'add', ticket: { id: 'offline' } });
  await first.persistence.sync();
  assert.equal(first.persistence.hasPending(), true);
  first.persistence.stop();
  db.fail = false;
  const reopened = setup(t, db, first.storage);
  await reopened.persistence.sync();
  assert.ok(db.tickets.some(value => value.id === 'offline'));
  assert.equal(reopened.persistence.hasPending(), false);
});

test('new typing during an in-flight save stays queued after that save finishes', async t => {
  const db = database();
  const state = setup(t, db);
  await state.persistence.sync();
  state.persistence.edit({ type: 'update', id: 'a', fields: { job: 'First' } });
  const gate = deferred();
  const entered = deferred();
  db.beforeWrite = async () => { entered.resolve(); await gate.promise; };
  const saving = state.persistence.sync();
  await entered.promise;
  state.persistence.edit({ type: 'update', id: 'a', fields: { job: 'Second' } });
  gate.resolve();
  await saving;
  assert.equal(state.visible()[0].job, 'Second');
  assert.equal(state.persistence.hasPending(), true);
  db.beforeWrite = null;
  await state.persistence.sync();
  assert.equal(db.tickets[0].job, 'Second');
  assert.equal(state.persistence.hasPending(), false);
});

test('an old completed ticket remains in shared data on save', async t => {
  const old = { ...ticket, status: 'in IDK', endDate: '2026-01-01', endMode: 'date' };
  const db = database([old]);
  const state = setup(t, db);
  await state.persistence.sync();
  state.persistence.edit({ type: 'add', ticket: { id: 'new' } });
  await state.persistence.sync();
  assert.ok(db.tickets.some(value => value.id === 'a'));
});

test('two tabs can acknowledge the same durable outbox without replaying it forever', async t => {
  const db = database();
  const storage = new Storage();
  const first = setup(t, db, storage);
  const second = setup(t, db, storage);
  await Promise.all([first.persistence.sync(), second.persistence.sync()]);
  first.persistence.edit({ type: 'add', ticket: { id: 'first' } });
  second.persistence.edit({ type: 'add', ticket: { id: 'second' } });
  await Promise.all([first.persistence.sync(), second.persistence.sync()]);
  assert.equal(db.tickets.length, 3);
  assert.equal(first.persistence.hasPending(), false);
  assert.equal(second.persistence.hasPending(), false);
  const writes = db.writes;
  await Promise.all([first.persistence.sync(), second.persistence.sync()]);
  assert.equal(db.writes, writes);
});

test('storage quota failure keeps edits in memory and reports the backup failure', async t => {
  const db = database();
  const state = setup(t, db);
  await state.persistence.sync();
  state.storage.setItem = () => { throw new Error('Quota exceeded'); };
  state.persistence.edit({ type: 'add', ticket: { id: 'memory-only' } });
  assert.equal(state.persistence.hasPending(), true);
  assert.match(state.statuses.at(-1)[0], /backup failed/);
  await state.persistence.sync();
  assert.ok(db.tickets.some(value => value.id === 'memory-only'));
  assert.equal(state.persistence.hasPending(), false);
  assert.match(state.statuses.at(-1)[0], /backup unavailable/);
});
