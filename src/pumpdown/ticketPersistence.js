const TABLE = 'pumpdown_ticket_state';
const OUTBOX_PREFIX = 'pumpdownTicketEdit:';
export const TICKET_CACHE_KEY = 'pumpdownTicketsDraft';
export const TICKET_BACKUP_KEY = 'pumpdownTicketsDraftBackup';

// Only apply the fields the user changed. Never replace another user's list.
export function applyTicketEdits(tickets, edits) {
  let result = tickets;
  for (const edit of edits) {
    if (edit.type === 'add') {
      if (!result.some(ticket => ticket.id === edit.ticket.id)) result = [edit.ticket, ...result];
    } else if (edit.type === 'remove') {
      result = result.filter(ticket => ticket.id !== edit.id);
    } else {
      result = result.map(ticket => ticket.id === edit.id ? { ...ticket, ...edit.fields } : ticket);
    }
  }
  return result;
}

export function createTicketPersistence({ client, storage, initialTickets, normalize, onTickets, onStatus }) {
  let current = initialTickets;
  let active = false;
  let running = null;
  let timer;
  let localWriteFailed = false;
  let lastEditTime = 0;
  const memoryEdits = new Map();
  const status = (message, type) => { if (active) onStatus(message, type); };
  const pending = () => {
    const edits = new Map(memoryEdits);
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(OUTBOX_PREFIX)) edits.set(key, JSON.parse(storage.getItem(key)));
    }
    return [...edits].sort(([a], [b]) => a.localeCompare(b));
  };
  const publish = tickets => {
    current = tickets;
    try {
      const previous = storage.getItem(TICKET_CACHE_KEY);
      if (previous && previous !== JSON.stringify(tickets)) storage.setItem(TICKET_BACKUP_KEY, previous);
      storage.setItem(TICKET_CACHE_KEY, JSON.stringify(tickets));
    } catch {
      localWriteFailed = true;
    }
    if (active) onTickets(tickets);
  };
  const schedule = (delay = 500) => {
    clearTimeout(timer);
    if (active) timer = setTimeout(() => { void sync(); }, delay);
  };
  async function runSync() {
    const controller = new AbortController();
    const requestTimeout = setTimeout(() => controller.abort(), 20000);
    try {
      if (!client) {
        status(localWriteFailed ? 'Unable to save locally; keep this page open' : 'Saved on this device; shared saving unavailable', 'warning');
        return;
      }
      status('Checking shared tickets…', 'info');
      // A conditional update detects concurrent writers. Read again and merge on conflict.
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error } = await client.from(TABLE).select('tickets, updated_at').eq('id', 'current').abortSignal(controller.signal).maybeSingle();
        if (error) throw error;
        if (!Array.isArray(data?.tickets) || !data.updated_at) throw new Error('Shared ticket row is missing; run supabase-pumpdown-ticket-state.sql');
        const batch = pending();
        const merged = applyTicketEdits(data.tickets.map(normalize), batch.map(([, edit]) => edit));
        if (batch.length) {
          status('Saving shared tickets…', 'info');
          const updatedAt = new Date(Math.max(Date.now(), Date.parse(data.updated_at) + 1)).toISOString();
          const saved = await client.from(TABLE).update({ tickets: merged, updated_at: updatedAt })
            .eq('id', 'current').eq('updated_at', data.updated_at).select('updated_at').abortSignal(controller.signal);
          if (saved.error) throw saved.error;
          if (!saved.data?.length) continue;
          for (const [key] of batch) {
            storage.removeItem(key);
            memoryEdits.delete(key);
          }
        }
        // Edits typed while the request was running remain visible and queued.
        const remaining = pending();
        publish(applyTicketEdits(merged, remaining.map(([, edit]) => edit)));
        status(remaining.length ? 'Changes waiting to save…' : localWriteFailed ? 'Shared tickets saved; device backup unavailable' : 'All changes saved', remaining.length || localWriteFailed ? 'warning' : 'success');
        return;
      }
      throw new Error('Shared tickets are busy');
    } catch (error) {
      console.error('Unable to sync pumpdown tickets', error);
      status(localWriteFailed ? 'Save failed; keep this page open and retry' : 'Shared save unavailable; device backup kept. Retrying…', 'error');
    } finally {
      clearTimeout(requestTimeout);
      schedule(5000);
    }
  }
  function sync() {
    if (running) return running;
    clearTimeout(timer);
    running = runSync().finally(() => { running = null; });
    return running;
  }
  return {
    start() {
      active = true;
      try { publish(applyTicketEdits(current, pending().map(([, edit]) => edit))); } catch { status('Device backup unavailable', 'error'); }
      void sync();
    },
    stop() {
      active = false;
      clearTimeout(timer);
      // The outbox was already written synchronously; navigation cannot discard it.
      void sync();
    },
    edit(edit) {
      lastEditTime = Math.max(Date.now(), lastEditTime + 1);
      const key = `${OUTBOX_PREFIX}${String(lastEditTime).padStart(16, '0')}:${crypto.randomUUID()}`;
      try { storage.setItem(key, JSON.stringify(edit)); } catch {
        memoryEdits.set(key, edit);
        localWriteFailed = true;
      }
      publish(applyTicketEdits(current, [edit]));
      status(localWriteFailed ? 'Device backup failed; keep this page open until saved' : 'Saved on this device; waiting for shared save…', localWriteFailed ? 'error' : 'info');
      schedule();
    },
    hasPending() {
      try { return pending().length > 0; } catch { return true; }
    },
    sync,
  };
}
