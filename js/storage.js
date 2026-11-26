/* Hamsoo — document storage.
 * Uses IndexedDB (large quota, survives reloads); falls back to localStorage when IndexedDB is unavailable.
 * Stores: meta (id → {id,title,updated,size,file?,remote?}), content (id → string),
 *         handles (id → FileSystemFileHandle), kv (key → any). Everything stays on this device. */
(function () {
  'use strict';

  const DB_NAME = 'hamsoo';
  const DB_VERSION = 1;
  const LS_PREFIX = 'hamsoo:';

  const reqP = (req) => new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  /* ---------------- IndexedDB backend ---------------- */
  function idbBackend(db) {
    function run(stores, mode, fn) {
      return new Promise((resolve, reject) => {
        let result;
        const tx = db.transaction(stores, mode);
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new DOMException('Transaction aborted', 'AbortError'));
        Promise.resolve(fn(tx)).then((v) => { result = v; }, (e) => { try { tx.abort(); } catch (x) { /* */ } reject(e); });
      });
    }
    return {
      kind: 'indexeddb',
      listMeta: () => run('meta', 'readonly', (tx) => reqP(tx.objectStore('meta').getAll())),
      getContent: (id) => run('content', 'readonly', (tx) => reqP(tx.objectStore('content').get(id))).then((v) => v || ''),
      put: (meta, content) => run(['meta', 'content'], 'readwrite', (tx) => {
        tx.objectStore('meta').put(meta);
        if (content != null) tx.objectStore('content').put(content, meta.id);
      }),
      putMeta: (meta) => run('meta', 'readwrite', (tx) => { tx.objectStore('meta').put(meta); }),
      del: (id) => run(['meta', 'content', 'handles'], 'readwrite', (tx) => {
        tx.objectStore('meta').delete(id);
        tx.objectStore('content').delete(id);
        tx.objectStore('handles').delete(id);
      }),
      clear: () => run(['meta', 'content', 'handles'], 'readwrite', (tx) => {
        tx.objectStore('meta').clear();
        tx.objectStore('content').clear();
        tx.objectStore('handles').clear();
      }),
      getHandle: (id) => run('handles', 'readonly', (tx) => reqP(tx.objectStore('handles').get(id))),
      allHandles: () => run('handles', 'readonly', (tx) => Promise.all([
        reqP(tx.objectStore('handles').getAllKeys()), reqP(tx.objectStore('handles').getAll())
      ]).then(([k, v]) => k.map((id, i) => [id, v[i]]))),
      setHandle: (id, h) => run('handles', 'readwrite', (tx) => { tx.objectStore('handles').put(h, id); }),
      delHandle: (id) => run('handles', 'readwrite', (tx) => { tx.objectStore('handles').delete(id); }),
      kvGet: (k) => run('kv', 'readonly', (tx) => reqP(tx.objectStore('kv').get(k))),
      kvSet: (k, v) => run('kv', 'readwrite', (tx) => { tx.objectStore('kv').put(v, k); }),
      kvDel: (k) => run('kv', 'readwrite', (tx) => { tx.objectStore('kv').delete(k); })
    };
  }

  /* ---------------- localStorage fallback ---------------- */
  function lsBackend() {
    const get = (k, d) => { try { const v = localStorage.getItem(LS_PREFIX + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } };
    const set = (k, v) => { localStorage.setItem(LS_PREFIX + k, JSON.stringify(v)); };
    const del = (k) => { try { localStorage.removeItem(LS_PREFIX + k); } catch (e) { /* */ } };
    const metas = () => { const m = get('meta', []); return Array.isArray(m) ? m : []; };
    return {
      kind: 'localstorage',
      listMeta: async () => metas(),
      getContent: async (id) => get('content:' + id, ''),
      put: async (meta, content) => {
        if (content != null) set('content:' + meta.id, content);
        set('meta', [meta, ...metas().filter((m) => m.id !== meta.id)]);
      },
      putMeta: async (meta) => { set('meta', [meta, ...metas().filter((m) => m.id !== meta.id)]); },
      del: async (id) => { del('content:' + id); set('meta', metas().filter((m) => m.id !== id)); },
      clear: async () => { metas().forEach((m) => del('content:' + m.id)); set('meta', []); },
      getHandle: async () => undefined,
      allHandles: async () => [],
      setHandle: async () => {},
      delHandle: async () => {},
      kvGet: async (k) => get('kv:' + k, undefined),
      kvSet: async (k, v) => set('kv:' + k, v),
      kvDel: async (k) => del('kv:' + k)
    };
  }

  function openIdb() {
    return new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { reject(new Error('no indexedDB')); return; }
      let req;
      try { req = indexedDB.open(DB_NAME, DB_VERSION); } catch (e) { reject(e); return; }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'id' });
        if (!db.objectStoreNames.contains('content')) db.createObjectStore('content');
        if (!db.objectStoreNames.contains('handles')) db.createObjectStore('handles');
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => db.close();
        resolve(db);
      };
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('indexedDB blocked'));
    });
  }

  /** Moves documents saved by v1.0 (localStorage) into IndexedDB, then removes the old copies. */
  async function migrateLegacy(backend) {
    let index;
    try { index = JSON.parse(localStorage.getItem('hamsoo:docs') || 'null'); } catch (e) { index = null; }
    if (!Array.isArray(index)) return;
    for (const d of index) {
      if (!d || typeof d.id !== 'string' || !/^[a-z0-9]+$/.test(d.id)) continue;
      let content = '';
      try { content = JSON.parse(localStorage.getItem('hamsoo:doc:' + d.id) || '""') || ''; } catch (e) { /* */ }
      await backend.put({ id: d.id, title: String(d.title || ''), updated: +d.updated || Date.now(), size: content.length }, content);
    }
    for (const d of index) { try { localStorage.removeItem('hamsoo:doc:' + (d && d.id)); } catch (e) { /* */ } }
    try { localStorage.removeItem('hamsoo:docs'); } catch (e) { /* */ }
  }

  async function init() {
    let backend;
    try {
      backend = idbBackend(await openIdb());
      await migrateLegacy(backend);
    } catch (e) {
      console.warn('IndexedDB unavailable, using localStorage', e);
      backend = lsBackend();
    }
    // Ask the browser not to evict our data under storage pressure (best effort, silent).
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* */ }
    return backend;
  }

  async function estimate() {
    try {
      if (navigator.storage && navigator.storage.estimate) return await navigator.storage.estimate();
    } catch (e) { /* */ }
    return null;
  }

  window.HamsooStorage = { init, estimate };
})();
