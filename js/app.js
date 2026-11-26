/* Hamsoo — application controller. No network requests; all state lives in this browser. */
(function () {
  'use strict';

  const { STR, HELP, WELCOME, LANGS } = window.HamsooI18n;
  const R = window.HamsooRender;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const root = document.documentElement;
  const app = $('#app');
  const editor = $('#editor');
  const preview = $('#preview');
  const previewPane = $('#preview-pane');
  const workspace = $('#workspace');
  const highlights = $('#editor-highlights');
  const syntaxLayer = $('#editor-syntax');
  const editorWrap = $('#editor-wrap');
  const E = window.HamsooEditor.create(editor);
  const HL = window.HamsooHighlight.create(editor, syntaxLayer);

  /* ------------------------------------------------------------------ storage */
  const store = {
    get(k, fallback) {
      try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set(k, v) {
      try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) {
        if (e && (e.name === 'QuotaExceededError' || e.code === 22)) toast(t('storageFull'), 'error');
        return false;
      }
    },
    del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
  };

  const DEFAULTS = {
    theme: 'system', lang: null, dir: 'auto', view: 'split', split: 50, toc: false, sync: true,
    fontSize: 15, previewSize: 16, editorFont: 'mono', wrap: true, spellcheck: false, breaks: false,
    previewWidth: true, smartPaste: true, remoteImages: true, syntax: true, lineNumbers: true
  };
  const settings = Object.assign({}, DEFAULTS, store.get('hamsoo:settings', {}));
  if (!settings.lang || !STR[settings.lang]) {
    const nav = (navigator.language || 'en').toLowerCase().slice(0, 2);
    settings.lang = STR[nav] ? nav : 'en';
  }
  const saveSettings = () => store.set('hamsoo:settings', settings);

  const t = (k) => (STR[settings.lang] && STR[settings.lang][k]) || STR.en[k] || k;
  const locale = () => (LANGS[settings.lang] || LANGS.en).locale;
  const nf = () => new Intl.NumberFormat(locale());

  /* ------------------------------------------------------------------ toasts */
  function toast(msg, kind) {
    const el = document.createElement('div');
    el.className = 'toast' + (kind === 'error' ? ' error' : '');
    el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; }, 2200);
    setTimeout(() => el.remove(), 2600);
  }

  /* ------------------------------------------------------------------ documents */
  // Metadata lives in memory (docs); content and file handles live in IndexedDB (see js/storage.js).
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  let S = null;                 // storage backend, set in init()
  let docs = [];                // [{id,title,updated,size,file?,remote?}]
  let currentId = store.get('hamsoo:current', null);
  let dirty = false;            // editor differs from what is stored
  const bc = 'BroadcastChannel' in window ? new BroadcastChannel('hamsoo-docs') : null;

  const curDoc = () => docs.find((d) => d.id === currentId);
  const sortDocs = () => docs.sort((a, b) => (b.updated || 0) - (a.updated || 0));
  function deriveTitle(text) {
    const h = text.match(/^\s{0,3}#{1,6}\s+(.+?)\s*#*\s*$/m);
    let title = h ? h[1] : (text.split('\n').find((l) => l.trim()) || '');
    title = title.replace(/[*_`~\[\]<>#]|\(.*?\)/g, '').trim();
    return title.slice(0, 80) || t('untitled');
  }
  function setCurrent(id) { currentId = id; store.set('hamsoo:current', id); }
  function notifyOtherTabs() { try { bc && bc.postMessage({ type: 'docs' }); } catch (e) { /* */ } }
  function storageError(e) {
    console.error(e);
    toast(e && (e.name === 'QuotaExceededError' || e.code === 22) ? t('storageFull') : t('saveFailed'), 'error');
  }

  async function createDoc(content, title, extra) {
    const meta = Object.assign({ id: uid(), title: title || deriveTitle(content), updated: Date.now(), size: content.length }, extra || {});
    await S.put(meta, content);
    docs.unshift(meta);
    notifyOtherTabs();
    return meta;
  }

  let saveTimer = null;
  function setSaveStatus(pending) {
    const el = $('#stat-save');
    el.classList.toggle('pending', pending);
    el.textContent = pending ? t('saving') : t('saved');
  }
  function scheduleSave() {
    dirty = true;
    setSaveStatus(true);
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { saveNow(); }, 400);
  }
  let saveChain = Promise.resolve();
  function saveNow() {
    clearTimeout(saveTimer);
    const doc = curDoc();
    if (!doc || !S || !dirty) return saveChain;
    const v = editor.value;
    dirty = false;
    doc.title = deriveTitle(v);
    doc.updated = Date.now();
    doc.size = v.length;
    const snapshot = Object.assign({}, doc);
    saveChain = saveChain.then(() => S.put(snapshot, v)).then(() => {
      try { localStorage.removeItem('hamsoo:pending'); } catch (e) { /* */ }
      if (!dirty) setSaveStatus(false);
      document.title = doc.title + ' — Hamsoo';
      notifyOtherTabs();
      Hooks.afterSave.forEach((fn) => fn(doc, v));
    }).catch((e) => { dirty = true; storageError(e); });
    return saveChain;
  }
  // Emergency copy: IndexedDB writes may not finish while the page unloads, localStorage writes do.
  function savePendingSync() {
    if (!dirty || !currentId) return;
    try { localStorage.setItem('hamsoo:pending', JSON.stringify({ id: currentId, content: editor.value, t: Date.now() })); } catch (e) { /* too big */ }
  }
  async function recoverPending() {
    let p = null;
    try { p = JSON.parse(localStorage.getItem('hamsoo:pending') || 'null'); } catch (e) { /* */ }
    if (!p || typeof p.id !== 'string' || typeof p.content !== 'string') return;
    const doc = docs.find((d) => d.id === p.id);
    if (doc && (!doc.updated || p.t > doc.updated)) {
      Object.assign(doc, { title: deriveTitle(p.content), updated: p.t, size: p.content.length });
      await S.put(Object.assign({}, doc), p.content);
    }
    try { localStorage.removeItem('hamsoo:pending'); } catch (e) { /* */ }
  }

  // Extension points used by file access
  const Hooks = { afterSave: [], afterLoad: [], ready: [] };

  async function loadDoc(id) {
    if (currentId && currentId !== id) await saveNow();
    const doc = docs.find((d) => d.id === id);
    if (!doc) return;
    const content = await S.getContent(id);
    setCurrent(id);
    dirty = false;
    editor.value = content;
    editor.setSelectionRange(0, 0);
    editor.scrollTop = 0;
    previewPane.scrollTop = 0;
    document.title = doc.title + ' — Hamsoo';
    setSaveStatus(false);
    renderNow();
    updateCursor();
    Hooks.afterLoad.forEach((fn) => fn(doc));
  }

  async function newDoc(content, title, extra) {
    await saveNow();
    const doc = await createDoc(content || '', title, extra);
    await loadDoc(doc.id);
    if (!content) editor.focus();
    return doc;
  }

  /** Replace the current document's text (keeps undo history). */
  function replaceEditorText(text) {
    const st = editor.scrollTop, pos = Math.min(editor.selectionStart, text.length);
    E.replaceRange(0, editor.value.length, text, pos);
    editor.scrollTop = st;
  }

  /* ------------------------------------------------------------------ theme / language / direction */
  const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
  const isDark = () => settings.theme === 'dark' || (settings.theme === 'system' && mqDark.matches);

  function applyTheme() {
    if (settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', settings.theme);
    const icon = { system: 'i-monitor', light: 'i-sun', dark: 'i-moon' }[settings.theme];
    $('#theme-icon use').setAttribute('href', '#' + icon);
    $$('[data-theme-opt]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.themeOpt === settings.theme)));
    $$('meta[name="theme-color"]').forEach((m) => { m.content = isDark() ? '#0f1117' : '#f6f7fb'; m.removeAttribute('media'); });
    if (preview.querySelector('.mermaid-block')) scheduleRender(0);
  }
  mqDark.addEventListener('change', () => { if (settings.theme === 'system') applyTheme(); });

  function applyLang() {
    const L = settings.lang;
    const info = LANGS[L] || LANGS.en;
    root.lang = L;
    root.dir = info.dir;
    $('#lang-badge').textContent = info.code;
    $('#lang-menu').replaceChildren(...Object.entries(LANGS).map(([code, l]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'menuitemradio');
      b.setAttribute('aria-checked', String(code === L));
      b.dataset.lang = code;
      b.innerHTML = '<svg><use href="#i-check"/></svg><span></span><span class="lang-code"></span>';
      b.children[1].textContent = l.name;
      b.children[1].setAttribute('lang', code);
      b.children[1].setAttribute('dir', l.dir);
      b.children[2].textContent = l.code;
      return b;
    }));
    $$('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    $$('[data-i18n-title]').forEach((el) => { const v = t(el.dataset.i18nTitle); el.title = v; el.setAttribute('aria-label', v); });
    $$('[data-i18n-ph]').forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
    const help = HELP[L] || HELP.en;
    $('#help-features').replaceChildren(...help.features.map((f) => { const li = document.createElement('li'); li.textContent = f; return li; }));
    $('#help-shortcuts').replaceChildren(...help.shortcuts.map(([k, d]) => {
      const tr = document.createElement('tr');
      const a = document.createElement('td'); const kb = document.createElement('kbd'); kb.textContent = k; a.appendChild(kb);
      const b = document.createElement('td'); b.textContent = d;
      tr.append(a, b); return tr;
    }));
    editor.setAttribute('aria-label', 'Markdown editor');
    updateStats(); updateCursor();
    $('#stat-save').textContent = t('saved');
    buildToc();
  }

  function applyDirUI() {
    $$('[data-dir]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.dir === settings.dir)));
    $('#dir-badge').textContent = { auto: 'A', rtl: 'R', ltr: 'L' }[settings.dir];
  }

  function applyView() {
    app.dataset.view = settings.view;
    $$('[data-view-btn]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.viewBtn === settings.view)));
    workspace.style.setProperty('--split', settings.split + '%');
    invalidateSync();
  }

  /** Keep the background layers exactly as wide as the textarea's text area (minus its scrollbar). */
  function fitLayers() {
    const sbw = Math.max(0, editor.offsetWidth - editor.clientWidth);
    syntaxLayer.style.right = highlights.style.right = sbw + 'px';
  }
  function applyEditorSettings() {
    editor.style.fontSize = highlights.style.fontSize = syntaxLayer.style.fontSize = settings.fontSize + 'px';
    syntaxLayer.classList.toggle('sans', settings.editorFont === 'sans');
    syntaxLayer.classList.toggle('nowrap', !settings.wrap);
    editorWrap.classList.toggle('numbers', !!settings.lineNumbers);
    HL.setMode({ colors: settings.syntax, numbers: settings.lineNumbers });
    fitLayers();
    HL.sync();
    preview.style.setProperty('--md-size', settings.previewSize + 'px');
    editor.classList.toggle('sans', settings.editorFont === 'sans');
    highlights.classList.toggle('sans', settings.editorFont === 'sans');
    editor.classList.toggle('nowrap', !settings.wrap);
    highlights.classList.toggle('nowrap', !settings.wrap);
    editor.spellcheck = !!settings.spellcheck;
    app.classList.toggle('narrow-preview', !!settings.previewWidth);
    app.classList.toggle('show-toc', !!settings.toc);
    $('[data-action="toc"]').setAttribute('aria-pressed', String(!!settings.toc));
    $('[data-action="sync"]').setAttribute('aria-pressed', String(!!settings.sync));
    invalidateSync();
  }

  /* ------------------------------------------------------------------ rendering */
  let renderTimer = null, renderSeq = 0, lastLines = [], lastRender = Promise.resolve();
  function scheduleRender(delay) {
    clearTimeout(renderTimer);
    const len = editor.value.length;
    renderTimer = setTimeout(renderNow, delay != null ? delay : len < 20000 ? 50 : len < 200000 ? 200 : 500);
  }

  function renderNow() {
    clearTimeout(renderTimer);
    const seq = ++renderSeq;
    HL.update();
    const src = editor.value;
    const { html, lines } = R.render(src, {
      breaks: settings.breaks, remoteImages: settings.remoteImages, blockedLabel: t('imageBlocked')
    });
    preview.innerHTML = html;
    lastLines = lines;

    // map top-level blocks to source lines (for scroll sync / jump)
    const blocks = Array.from(preview.children).filter((el) => !el.matches('section.footnotes'));
    if (blocks.length === lines.length) blocks.forEach((el, i) => { el.dataset.line = lines[i]; });

    const docDir = R.applyDirections(preview, settings.dir);
    applyEditorDir(src, docDir);
    enhancePreview();
    buildToc();
    updateStats();
    invalidateSync();

    const dark = isDark();
    lastRender = Promise.resolve()
      .then(() => R.renderMath(preview, t('mathError')))
      .then(() => seq === renderSeq && R.renderMermaid(preview, dark, t('diagramError')))
      .catch((e) => console.warn(e))
      .finally(() => { if (seq === renderSeq) invalidateSync(); });

    if (findState.open) updateFind(false);
  }

  function applyEditorDir(src, docDir) {
    if (settings.dir === 'auto') {
      const sample = src.replace(/^(```|~~~)[\s\S]*?^\1/gm, '').slice(0, 20000);
      const d = R.detectDir(sample) || docDir || 'ltr';
      editor.setAttribute('dir', d);
      editor.classList.add('bidi-plain');
      highlights.setAttribute('dir', d);
      highlights.classList.add('bidi-plain');
      syntaxLayer.setAttribute('dir', d);
      syntaxLayer.classList.add('bidi-plain');
    } else {
      editor.setAttribute('dir', settings.dir);
      editor.classList.remove('bidi-plain');
      highlights.setAttribute('dir', settings.dir);
      highlights.classList.remove('bidi-plain');
      syntaxLayer.setAttribute('dir', settings.dir);
      syntaxLayer.classList.remove('bidi-plain');
    }
  }

  const COPY_SVG = '<svg aria-hidden="true"><use href="#i-copy"/></svg>';
  function enhancePreview() {
    preview.querySelectorAll('pre:not(.mermaid-src)').forEach((pre) => {
      if (pre.closest('.mermaid-block')) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'copy-code';
      b.title = t('copy');
      b.setAttribute('aria-label', t('copy'));
      b.innerHTML = COPY_SVG;
      pre.appendChild(b);
    });
    if (!preview.childElementCount) {
      const p = document.createElement('p');
      p.className = 'preview-empty';
      p.textContent = t('emptyPreview');
      preview.appendChild(p);
    }
  }

  /* ------------------------------------------------------------------ stats / cursor */
  function updateStats() {
    const src = editor.value;
    const text = preview.textContent || '';
    const words = (text.match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}'’‌-]*/gu) || []).length;
    const lines = src ? src.split('\n').length : 0;
    const f = nf();
    $('#stat-words').textContent = f.format(words) + ' ' + t('words');
    $('#stat-chars').textContent = f.format(src.length) + ' ' + t('chars');
    $('#stat-lines').textContent = f.format(lines) + ' ' + t('lines');
    $('#stat-read').textContent = f.format(Math.max(1, Math.round(words / 200))) + ' ' + t('minRead');
  }
  function updateCursor() {
    const c = E.cursorInfo();
    const f = nf();
    $('#stat-cursor').textContent = t('ln') + ' ' + f.format(c.line) + ', ' + t('col') + ' ' + f.format(c.col) + (c.selected ? ' (' + f.format(c.selected) + ')' : '');
  }

  /* ------------------------------------------------------------------ outline */
  let tocHeadings = [];
  function buildToc() {
    const list = $('#toc-list');
    tocHeadings = $$('h1, h2, h3, h4, h5, h6', preview).filter((h) => !h.classList.contains('sr-only'));
    if (!tocHeadings.length) {
      const d = document.createElement('div');
      d.className = 'toc-empty';
      d.textContent = t('noHeadings');
      list.replaceChildren(d);
      return;
    }
    list.replaceChildren(...tocHeadings.map((h, i) => {
      const a = document.createElement('a');
      a.href = '#' + (h.id || '');
      a.textContent = h.textContent;
      a.dataset.level = h.tagName[1];
      a.dataset.idx = i;
      a.setAttribute('dir', h.getAttribute('dir') || 'auto');
      return a;
    }));
    highlightToc();
  }
  function highlightToc() {
    if (!settings.toc || !tocHeadings.length) return;
    const top = previewPane.getBoundingClientRect().top + 40;
    let idx = 0;
    tocHeadings.forEach((h, i) => { if (h.getBoundingClientRect().top <= top) idx = i; });
    $$('#toc-list a').forEach((a, i) => a.classList.toggle('active', i === idx));
  }
  $('#toc-list').addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a) return;
    e.preventDefault();
    const h = tocHeadings[+a.dataset.idx];
    if (!h) return;
    scrollPreviewTo(h);
    const line = h.dataset.line;
    if (line != null) scrollEditorToLine(+line, false);
    if (window.innerWidth <= 860) { settings.toc = false; applyEditorSettings(); saveSettings(); }
  });

  // On small screens the outline is a drawer: tapping outside closes it.
  workspace.addEventListener('pointerdown', (e) => {
    if (settings.toc && window.innerWidth <= 860 && !e.target.closest('#toc')) {
      settings.toc = false; applyEditorSettings(); saveSettings();
    }
  });

  function previewTop(el) {
    return el.getBoundingClientRect().top - previewPane.getBoundingClientRect().top + previewPane.scrollTop;
  }
  function scrollPreviewTo(el) {
    syncLock = 'preview-jump';
    previewPane.scrollTop = Math.max(0, previewTop(el) - 16);
    setTimeout(() => { syncLock = null; }, 120);
  }
  function lineStartIndex(line) {
    const v = editor.value;
    let idx = 0;
    for (let i = 0; i < line && idx !== -1; i++) idx = v.indexOf('\n', idx) + 1 || -1;
    return idx < 0 ? v.length : idx;
  }
  function scrollEditorToLine(line, focus) {
    const idx = lineStartIndex(line);
    const [y] = E.offsetsOf([idx]);
    syncLock = 'editor-jump';
    editor.scrollTop = Math.max(0, y - 24);
    editor.setSelectionRange(idx, idx);
    if (focus) editor.focus({ preventScroll: true });
    setTimeout(() => { syncLock = null; }, 120);
    updateCursor();
  }

  /* ------------------------------------------------------------------ scroll sync */
  let syncMap = null, syncLock = null, syncRaf = 0;
  function invalidateSync() { syncMap = null; }
  function buildSyncMap() {
    const els = $$(':scope > [data-line]', preview);
    const v = editor.value;
    const starts = [0];
    for (let i = 0; i < v.length; i++) if (v.charCodeAt(i) === 10) starts.push(i + 1);
    const idx = els.map((el) => starts[Math.min(+el.dataset.line, starts.length - 1)]);
    const eTops = els.length ? E.offsetsOf(idx) : [];
    const pts = [{ e: 0, p: 0 }];
    els.forEach((el, i) => {
      const p = previewTop(el);
      const e = eTops[i];
      const last = pts[pts.length - 1];
      if (e > last.e && p > last.p) pts.push({ e, p });
    });
    pts.push({ e: Math.max(editor.scrollHeight, (pts[pts.length - 1].e) + 1), p: Math.max(previewPane.scrollHeight, pts[pts.length - 1].p + 1) });
    syncMap = pts;
  }
  function mapScroll(y, from, to) {
    const pts = syncMap;
    let i = 0;
    while (i < pts.length - 2 && pts[i + 1][from] <= y) i++;
    const a = pts[i], b = pts[i + 1];
    const r = b[from] === a[from] ? 0 : (y - a[from]) / (b[from] - a[from]);
    return a[to] + r * (b[to] - a[to]);
  }
  function syncFrom(source) {
    if (!settings.sync || settings.view !== 'split' || window.innerWidth <= 860) return;
    if (syncLock && syncLock !== source) return;
    syncLock = source;
    cancelAnimationFrame(syncRaf);
    syncRaf = requestAnimationFrame(() => {
      if (!syncMap) buildSyncMap();
      const src = source === 'editor' ? editor : previewPane;
      const dst = source === 'editor' ? previewPane : editor;
      const srcMax = src.scrollHeight - src.clientHeight;
      const dstMax = dst.scrollHeight - dst.clientHeight;
      let target;
      if (src.scrollTop <= 0) target = 0;
      else if (src.scrollTop >= srcMax - 2) target = dstMax;
      else target = mapScroll(src.scrollTop, source === 'editor' ? 'e' : 'p', source === 'editor' ? 'p' : 'e');
      dst.scrollTop = Math.round(Math.min(dstMax, Math.max(0, target)));
      clearTimeout(syncFrom.timer);
      syncFrom.timer = setTimeout(() => { syncLock = null; }, 90);
    });
  }
  editor.addEventListener('scroll', () => {
    highlights.scrollTop = editor.scrollTop;
    highlights.scrollLeft = editor.scrollLeft;
    HL.sync();
    syncFrom('editor');
  }, { passive: true });
  previewPane.addEventListener('scroll', () => { syncFrom('preview'); highlightToc(); }, { passive: true });
  window.addEventListener('resize', () => { invalidateSync(); fitLayers(); if (findState.open) paintHighlights(); });
  if ('ResizeObserver' in window) new ResizeObserver(() => { fitLayers(); HL.sync(); }).observe(editor);

  /* ------------------------------------------------------------------ editor events */
  editor.addEventListener('input', () => {
    HL.update();
    HL.sync();
    const fileChip = $('#stat-file');
    if (!fileChip.hidden) fileChip.classList.add('unsaved');
    scheduleRender();
    scheduleSave();
    if (findState.open) { clearTimeout(findState.t); findState.t = setTimeout(() => updateFind(false), 120); }
  });
  ['keyup', 'click', 'select'].forEach((ev) => editor.addEventListener(ev, updateCursor));
  document.addEventListener('selectionchange', () => { if (document.activeElement === editor) updateCursor(); });

  let tabEscapes = false;
  editor.addEventListener('keydown', (e) => {
    if (e.isComposing || e.keyCode === 229) return;
    const mod = e.ctrlKey || e.metaKey;
    if (e.key === 'Escape') { tabEscapes = true; return; }
    if (e.key === 'Tab' && !mod && !e.altKey) {
      if (tabEscapes) { tabEscapes = false; return; }
      e.preventDefault();
      E.indent(e.shiftKey);
      return;
    }
    tabEscapes = false;
    if (e.key === 'Enter' && !mod && !e.shiftKey && !e.altKey) {
      if (E.handleEnter()) e.preventDefault();
      return;
    }
    if (!mod || e.altKey) return;
    const k = e.key.toLowerCase();
    const map = { b: 'bold', i: 'italic', k: 'link', e: 'code', '1': 'h1', '2': 'h2', '3': 'h3' };
    if (e.shiftKey && k === 'x') { e.preventDefault(); format('strike'); return; }
    if (!e.shiftKey && map[k]) { e.preventDefault(); format(map[k]); }
  });

  /* ------------------------------------------------------------------ formatting */
  function format(cmd) {
    if (settings.view === 'preview' && !['undo', 'redo'].includes(cmd)) { settings.view = 'split'; applyView(); saveSettings(); }
    editor.focus({ preventScroll: true });
    switch (cmd) {
      case 'undo': document.execCommand('undo'); break;
      case 'redo': document.execCommand('redo'); break;
      case 'bold': E.wrap('**', '**', t('phBold')); break;
      case 'italic': E.wrap('*', '*', t('phItalic')); break;
      case 'strike': E.wrap('~~', '~~', t('phStrike')); break;
      case 'code': E.wrap('`', '`', 'code'); break;
      case 'h1': E.setHeading(1); break;
      case 'h2': E.setHeading(2); break;
      case 'h3': E.setHeading(3); break;
      case 'quote': E.toggleQuote(); break;
      case 'ul': E.toggleList('ul'); break;
      case 'ol': E.toggleList('ol'); break;
      case 'task': E.toggleList('task'); break;
      case 'link': E.link(t('phLink')); break;
      case 'image': E.image(t('phAlt')); break;
      case 'codeblock': E.codeBlock(); break;
      case 'hr': E.insertBlock('---'); break;
      case 'table': {
        const f = nf();
        const head = [1, 2, 3].map((n) => t('tCol') + ' ' + f.format(n));
        const row = '| ' + [1, 2, 3].map(() => t('tCell')).join(' | ') + ' |';
        const tb = '| ' + head.join(' | ') + ' |\n| --- | --- | --- |\n' + row + '\n' + row;
        const { text } = window.HamsooEditor.formatTables(tb);
        E.insertBlock(text, 2, head[0].length);
        break;
      }
      case 'math': E.insertBlock('$$\nE = mc^2\n$$', 3, 8); break;
      case 'mermaid': E.insertBlock('```mermaid\ngraph TD\n  A[' + t('mmStart') + '] --> B{' + t('mmDecide') + '}\n  B -->|' + t('mmYes') + '| C[OK]\n  B -->|' + t('mmNo') + '| D[Retry]\n```'); break;
      case 'footnote': E.footnote(); break;
      case 'format-tables': formatTables(); break;
    }
  }
  function formatTables() {
    const { text, count } = window.HamsooEditor.formatTables(editor.value);
    if (!count) { toast(t('noTables')); return; }
    if (text !== editor.value) {
      const pos = editor.selectionStart, st = editor.scrollTop;
      E.replaceRange(0, editor.value.length, text, Math.min(pos, text.length));
      editor.scrollTop = st;
    }
    toast(t('tablesFormatted'));
  }
  $('.toolbar').addEventListener('mousedown', (e) => { if (e.target.closest('[data-fmt]')) e.preventDefault(); });
  $('.toolbar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-fmt]');
    if (b) format(b.dataset.fmt);
  });

  /* ------------------------------------------------------------------ preview interactions */
  preview.addEventListener('click', async (e) => {
    const copyBtn = e.target.closest('.copy-code');
    if (copyBtn) {
      const code = copyBtn.parentElement.querySelector('code');
      const ok = await copyText(code ? code.innerText : copyBtn.parentElement.innerText);
      copyBtn.classList.toggle('ok', ok);
      copyBtn.innerHTML = ok ? '<svg aria-hidden="true"><use href="#i-check"/></svg>' : COPY_SVG;
      setTimeout(() => { copyBtn.classList.remove('ok'); copyBtn.innerHTML = COPY_SVG; }, 1400);
      return;
    }
    const cb = e.target.closest('input.task-checkbox');
    if (cb) {
      e.preventDefault();
      toggleTask($$('input.task-checkbox', preview).indexOf(cb));
      return;
    }
    const img = e.target.closest('img.img-blocked');
    if (img) { unblockImage(img); return; }
    const a = e.target.closest('a[href^="#"]');
    if (a) {
      e.preventDefault();
      let id = a.getAttribute('href').slice(1);
      try { id = decodeURIComponent(id); } catch (err) { /* keep raw */ }
      const target = id && preview.querySelector('#' + CSS.escape(id));
      if (target) {
        scrollPreviewTo(target);
        target.classList.add('flash');
        setTimeout(() => target.classList.remove('flash'), 1200);
      }
    }
  });
  preview.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('img.img-blocked')) { e.preventDefault(); unblockImage(e.target); }
  });
  function unblockImage(img) {
    const src = img.getAttribute('data-blocked-src');
    if (!src || !/^\s*(https?:)?\/\//i.test(src)) return;
    img.removeAttribute('data-blocked-src');
    img.classList.remove('img-blocked');
    img.removeAttribute('role'); img.removeAttribute('tabindex'); img.removeAttribute('title');
    img.src = src;
  }
  preview.addEventListener('dblclick', (e) => {
    if (settings.view !== 'split' || e.target.closest('a, input, button, .copy-code')) return;
    const block = e.target.closest('#preview > [data-line]');
    if (block) scrollEditorToLine(+block.dataset.line, true);
  });

  function toggleTask(index) {
    if (index < 0) return;
    const v = editor.value;
    const re = /^((?:[ \t]*>)*[ \t]*(?:[-*+]|\d+[.)])[ \t]+)\[([ xX])\]/;
    let pos = 0, count = 0, fence = null;
    const lines = v.split('\n');
    for (const line of lines) {
      const f = line.match(/^\s*(`{3,}|~{3,})/);
      if (f) {
        if (!fence) fence = f[1][0];
        else if (f[1][0] === fence) fence = null;
      } else if (!fence) {
        const m = line.match(re);
        if (m) {
          if (count === index) {
            const at = pos + m[1].length;
            const next = m[2] === ' ' ? '[x]' : '[ ]';
            const sel = [editor.selectionStart, editor.selectionEnd], st = editor.scrollTop;
            E.replaceRange(at, at + 3, next, sel[0], sel[1]);
            editor.scrollTop = st;
            renderNow();
            return;
          }
          count++;
        }
      }
      pos += line.length + 1;
    }
  }

  /* ------------------------------------------------------------------ find & replace */
  const findState = { open: false, matches: [], cur: -1, t: null };
  const findInput = $('#find-input'), replaceInput = $('#replace-input');

  function openFind() {
    findState.open = true;
    $('#findbar').hidden = false;
    if (settings.view === 'preview') { settings.view = 'split'; applyView(); }
    const sel = editor.value.slice(editor.selectionStart, editor.selectionEnd);
    if (sel && !sel.includes('\n') && sel.length < 200) findInput.value = sel;
    findInput.focus();
    findInput.select();
    updateFind(true);
  }
  function closeFind() {
    findState.open = false;
    $('#findbar').hidden = true;
    highlights.replaceChildren();
    editor.focus({ preventScroll: true });
  }
  function buildRegex() {
    const q = findInput.value;
    if (!q) return null;
    const flags = 'g' + ($('#find-case').checked ? '' : 'i') + 'u';
    try {
      return new RegExp($('#find-regex').checked ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), flags);
    } catch (e) { return null; }
  }
  function updateFind(jump) {
    const re = buildRegex();
    const v = editor.value;
    findState.matches = [];
    if (re) {
      let m, guard = 0;
      while ((m = re.exec(v)) && guard++ < 20000) {
        if (m[0] === '') { re.lastIndex++; continue; }
        findState.matches.push([m.index, m.index + m[0].length]);
      }
    }
    const pos = editor.selectionStart;
    if (findState.matches.length) {
      let i = findState.matches.findIndex(([s]) => s >= (jump ? pos : Math.max(0, pos - 1)));
      if (findState.cur >= 0 && !jump && findState.cur < findState.matches.length) i = findState.cur;
      findState.cur = i < 0 ? 0 : i;
    } else findState.cur = -1;
    paintHighlights();
    if (jump && findState.cur >= 0) revealMatch();
    updateFindCount();
  }
  function updateFindCount() {
    const n = findState.matches.length, f = nf();
    $('#find-count').textContent = !findInput.value ? '' : n ? f.format(findState.cur + 1) + ' ' + t('of') + ' ' + f.format(n) : t('noMatch');
  }
  function paintHighlights() {
    const v = editor.value;
    const frag = document.createDocumentFragment();
    let last = 0;
    const max = Math.min(findState.matches.length, 5000);
    for (let i = 0; i < max; i++) {
      const [s, e] = findState.matches[i];
      frag.appendChild(document.createTextNode(v.slice(last, s)));
      const mk = document.createElement('mark');
      if (i === findState.cur) mk.className = 'cur';
      mk.textContent = v.slice(s, e);
      frag.appendChild(mk);
      last = e;
    }
    frag.appendChild(document.createTextNode(v.slice(last) + '\n'));
    highlights.replaceChildren(frag);
    highlights.style.right = (editor.offsetWidth - editor.clientWidth) + 'px';
    highlights.style.width = 'auto';
    highlights.scrollTop = editor.scrollTop;
  }
  function revealMatch() {
    const m = findState.matches[findState.cur];
    if (!m) return;
    editor.setSelectionRange(m[0], m[1]);
    const [y] = E.offsetsOf([m[0]]);
    if (y < editor.scrollTop + 20 || y > editor.scrollTop + editor.clientHeight - 60) {
      editor.scrollTop = Math.max(0, y - editor.clientHeight / 3);
    }
    highlights.scrollTop = editor.scrollTop;
    updateCursor();
  }
  function stepFind(dir) {
    const n = findState.matches.length;
    if (!n) return;
    findState.cur = (findState.cur + dir + n) % n;
    paintHighlights();
    revealMatch();
    updateFindCount();
  }
  function replaceOne() {
    const m = findState.matches[findState.cur];
    if (!m) return;
    const re = buildRegex();
    let rep = replaceInput.value;
    if ($('#find-regex').checked && re) {
      const src = editor.value.slice(m[0], m[1]);
      rep = src.replace(new RegExp(re.source, re.flags.replace('g', '')), rep);
    }
    E.replaceRange(m[0], m[1], rep, m[0] + rep.length);
    findInput.focus();
    findState.cur = -1;
    updateFind(true);
  }
  function replaceAll() {
    const re = buildRegex();
    if (!re || !findState.matches.length) return;
    const n = findState.matches.length;
    const rep = $('#find-regex').checked ? replaceInput.value : replaceInput.value.replace(/\$/g, '$$$$');
    const out = editor.value.replace(re, rep);
    const st = editor.scrollTop;
    E.replaceRange(0, editor.value.length, out, 0);
    editor.scrollTop = st;
    findInput.focus();
    updateFind(false);
    toast(t('replacedN').replace('{n}', nf().format(n)));
  }
  findInput.addEventListener('input', () => { findState.cur = -1; updateFind(true); });
  findInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); stepFind(e.shiftKey ? -1 : 1); }
    if (e.key === 'Escape') { e.preventDefault(); closeFind(); }
  });
  replaceInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); (e.ctrlKey || e.metaKey) ? replaceAll() : replaceOne(); }
    if (e.key === 'Escape') { e.preventDefault(); closeFind(); }
  });
  $('#find-case').addEventListener('change', () => updateFind(true));
  $('#find-regex').addEventListener('change', () => updateFind(true));
  $('#find-next').addEventListener('click', () => stepFind(1));
  $('#find-prev').addEventListener('click', () => stepFind(-1));
  $('#find-close').addEventListener('click', closeFind);
  $('#replace-one').addEventListener('click', replaceOne);
  $('#replace-all').addEventListener('click', replaceAll);

  /* ------------------------------------------------------------------ files: open / drop / paste */
  const MAX_FILE = 10 * 1024 * 1024;
  const TEXT_EXT = /\.(md|markdown|mdown|mkd|mkdn|mdx|txt|text)$/i;
  const HTML_EXT = /\.(html?|xhtml)$/i;

  let turndownSvc = null;
  async function htmlToMarkdown(html) {
    if (!turndownSvc) {
      await R.loadScript('vendor/turndown.js');
      await R.loadScript('vendor/turndown-gfm.js');
      turndownSvc = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced', bulletListMarker: '-', emDelimiter: '*', hr: '---' });
      turndownSvc.use(turndownPluginGfm.gfm);
      turndownSvc.remove(['script', 'style', 'noscript', 'iframe', 'object', 'embed', 'form', 'button', 'select', 'textarea', 'meta', 'link', 'title', 'head']);
    }
    // Parse inertly and sanitise before conversion; no scripts run, no resources load.
    const clean = DOMPurify.sanitize(html, { WHOLE_DOCUMENT: false, FORBID_TAGS: ['style', 'form', 'button', 'select', 'textarea'], FORBID_ATTR: ['style'] });
    const doc = new DOMParser().parseFromString('<!doctype html><body>' + clean, 'text/html');
    // Google Docs wraps everything in <b style="font-weight:normal">
    doc.querySelectorAll('b[id^="docs-internal-guid"]').forEach((b) => b.replaceWith(...b.childNodes));
    return turndownSvc.turndown(doc.body)
      .replace(/^(\s*)([-*+]) {2,}/gm, '$1$2 ')
      .replace(/^(\s*)(\d+\.) {2,}/gm, '$1$2 ')
      .replace(/\n{3,}/g, '\n\n').trim() + '\n';
  }

  function normalizeText(s) {
    return String(s).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  }

  /**
   * Open a File. When a FileSystemFileHandle is given (Chrome/Edge), the document stays linked
   * to that file on disk so Ctrl+S writes back to it.
   */
  async function openFile(file, handle) {
    if (!file) return;
    if (file.size > MAX_FILE) { toast(t('fileTooBig'), 'error'); return; }
    const name = file.name || '';
    const isHtml = HTML_EXT.test(name) || file.type === 'text/html';
    const isText = TEXT_EXT.test(name) || /^text\//.test(file.type) || (!file.type && !/\.[a-z0-9]{1,6}$/i.test(name));
    if (!isHtml && !isText) { toast(t('unsupported'), 'error'); return; }
    try {
      let text = normalizeText(await file.text());
      if (isHtml) { text = await htmlToMarkdown(text); handle = null; } // never overwrite an .html file with Markdown
      // Same file opened before? Re-use that document instead of creating a duplicate.
      if (handle) {
        const existing = await Disk.findDocFor(handle);
        if (existing) {
          await loadDoc(existing.id);
          if (editor.value !== text) replaceEditorText(text);
          existing.file = { name, lastModified: file.lastModified };
          dirty = true; await saveNow();
          Disk.markClean(text);
          toast(t('opened') + ': ' + name);
          return;
        }
      }
      const title = name.replace(/\.[^.]+$/, '') || undefined;
      const extra = handle ? { file: { name, lastModified: file.lastModified } } : undefined;
      const doc = await newDoc(text, deriveTitle(text) !== t('untitled') ? undefined : title, extra);
      if (handle) { await S.setHandle(doc.id, handle); Disk.markClean(text); }
      toast(t('opened') + ': ' + name);
    } catch (err) {
      console.error(err);
      toast(t('unsupported'), 'error');
    }
  }

  /* ------------------------------------------------------------------ files on disk (File System Access API) */
  const FS_TYPES = [{ description: 'Markdown', accept: { 'text/markdown': ['.md', '.markdown', '.mdown', '.mkd', '.mkdn', '.mdx'], 'text/plain': ['.txt', '.text'] } }];
  const Disk = {
    supported: 'showOpenFilePicker' in window && 'showSaveFilePicker' in window,
    cleanText: null,            // text last written to / read from the linked file
    async findDocFor(handle) {
      for (const [id, h] of await S.allHandles()) {
        try { if (h && await h.isSameEntry(handle) && docs.find((d) => d.id === id)) return docs.find((d) => d.id === id); } catch (e) { /* stale */ }
      }
      return null;
    },
    markClean(text) { this.cleanText = text; updateFileStatus(); },
    async permission(handle, ask) {
      const opts = { mode: 'readwrite' };
      try {
        if ((await handle.queryPermission(opts)) === 'granted') return true;
        if (ask && (await handle.requestPermission(opts)) === 'granted') return true;
      } catch (e) { /* */ }
      return false;
    },
    async write(handle, text) {
      const w = await handle.createWritable();
      await w.write(text);
      await w.close();
    },
    async open() {
      let handle;
      try {
        [handle] = await window.showOpenFilePicker({
          types: [...FS_TYPES, { description: 'HTML', accept: { 'text/html': ['.html', '.htm'] } }], multiple: false
        });
      } catch (e) { return; } // cancelled
      await openFile(await handle.getFile(), handle);
    },
    /** Save to the linked file; if none, ask where to save. */
    async save(saveAs) {
      const doc = curDoc();
      if (!doc) return;
      await saveNow();
      if (!this.supported) { ACTIONS['export-md'](); return; }
      let handle = saveAs ? null : await S.getHandle(doc.id);
      try {
        if (!handle) {
          handle = await window.showSaveFilePicker({ suggestedName: fileBase() + '.md', types: FS_TYPES });
          await S.setHandle(doc.id, handle);
        } else if (!(await this.permission(handle, true))) {
          toast(t('permissionDenied'), 'error');
          return;
        }
        const text = editor.value;
        await this.write(handle, text);
        const f = await handle.getFile();
        doc.file = { name: handle.name, lastModified: f.lastModified };
        await S.putMeta(Object.assign({}, doc));
        this.markClean(text);
        toast(t('savedToFile').replace('{name}', handle.name));
      } catch (e) {
        if (e && e.name === 'AbortError') return; // picker cancelled
        console.error(e);
        toast(t('saveFailed'), 'error');
      }
    },
    /** Quietly write to the linked file when permission was already granted this session. */
    async autoSave(doc, text) {
      if (!this.supported || !doc.file || text === this.cleanText) return;
      const handle = await S.getHandle(doc.id);
      if (!handle || !(await this.permission(handle, false))) return;
      try {
        await this.write(handle, text);
        const f = await handle.getFile();
        doc.file.lastModified = f.lastModified;
        await S.putMeta(Object.assign({}, doc));
        this.markClean(text);
      } catch (e) { console.warn('auto-save to file failed', e); }
    },
    /** If the file changed on disk (edited elsewhere) and we have no unsaved edits, reload it. */
    async checkExternal() {
      const doc = curDoc();
      if (!this.supported || !doc || !doc.file) return;
      const handle = await S.getHandle(doc.id);
      if (!handle) return;
      try {
        if ((await handle.queryPermission({ mode: 'read' })) !== 'granted') return;
        const f = await handle.getFile();
        if (f.lastModified <= (doc.file.lastModified || 0)) return;
        const text = normalizeText(await f.text());
        doc.file.lastModified = f.lastModified;
        if (editor.value === this.cleanText || this.cleanText == null) {
          if (text !== editor.value) { replaceEditorText(text); toast(t('reloadedFromDisk')); }
          this.markClean(text);
        }
        await S.putMeta(Object.assign({}, doc));
      } catch (e) { /* file moved or deleted */ }
    },
    async unlink() {
      const doc = curDoc();
      if (!doc) return;
      delete doc.file;
      await S.delHandle(doc.id);
      await S.putMeta(Object.assign({}, doc));
      this.cleanText = null;
      updateFileStatus();
    }
  };
  let fileAutoTimer = null;
  Hooks.afterSave.push((doc, text) => {
    updateFileStatus();
    clearTimeout(fileAutoTimer);
    if (doc.file) fileAutoTimer = setTimeout(() => Disk.autoSave(doc, editor.value), 1200);
  });
  Hooks.afterLoad.push(async (doc) => {
    Disk.cleanText = null;
    if (doc.file) {
      const h = await S.getHandle(doc.id);
      if (h && (await h.queryPermission({ mode: 'read' }).catch(() => 'denied')) === 'granted') {
        try { Disk.cleanText = normalizeText(await (await h.getFile()).text()); } catch (e) { /* */ }
      }
      Disk.checkExternal();
    }
    updateFileStatus();
  });
  window.addEventListener('focus', () => Disk.checkExternal());
  if (!Disk.supported) $$('.fs-only').forEach((e) => { e.hidden = true; });

  function updateFileStatus() {
    const el = $('#stat-file');
    const doc = curDoc();
    if (!el) return;
    if (!doc || !doc.file) { el.hidden = true; return; }
    el.hidden = false;
    const unsaved = Disk.cleanText == null || editor.value !== Disk.cleanText;
    el.classList.toggle('unsaved', unsaved);
    $('.file-name', el).textContent = doc.file.name;
    el.title = unsaved ? t('fileUnsaved') : t('fileSynced');
  }

  $('#file-input').addEventListener('change', (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = '';
    if (f) openFile(f);
    closeDialogs();
  });

  // Drag & drop anywhere
  let dragDepth = 0;
  const hasFiles = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
  window.addEventListener('dragenter', (e) => { if (!hasFiles(e)) return; e.preventDefault(); dragDepth++; $('#drop-overlay').hidden = false; });
  window.addEventListener('dragover', (e) => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; });
  window.addEventListener('dragleave', (e) => { if (!hasFiles(e)) return; dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) $('#drop-overlay').hidden = true; });
  window.addEventListener('drop', (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    dragDepth = 0;
    $('#drop-overlay').hidden = true;
    // Grab file handles synchronously (the DataTransfer is cleared after this event).
    const handleP = Disk.supported && e.dataTransfer.items && e.dataTransfer.items[0] && e.dataTransfer.items[0].getAsFileSystemHandle
      ? e.dataTransfer.items[0].getAsFileSystemHandle().catch(() => null) : Promise.resolve(null);
    const files = Array.from(e.dataTransfer.files || []);
    const img = files.find((f) => /^image\//.test(f.type));
    if (img && files.length === 1 && e.target === editor) { insertImageFile(img); return; }
    const f = files.find((x) => !/^image\//.test(x.type)) || files[0];
    if (f && /^image\//.test(f.type)) insertImageFile(f);
    else if (f) handleP.then((h) => openFile(f, h && h.kind === 'file' && files.length === 1 ? h : null));
  });

  function insertImageFile(file) {
    if (file.size > 2 * 1024 * 1024) { toast(t('imageTooBig'), 'error'); return; }
    if (!/^image\/(png|jpe?g|gif|webp|avif|bmp)$/.test(file.type)) { toast(t('unsupported'), 'error'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const alt = (file.name || 'image').replace(/\.[^.]+$/, '').replace(/[\[\]]/g, '');
      E.replaceRange(editor.selectionStart, editor.selectionEnd, '![' + alt + '](' + reader.result + ')');
    };
    reader.readAsDataURL(file);
  }

  // Smart paste
  editor.addEventListener('paste', async (e) => {
    const cd = e.clipboardData;
    if (!cd) return;
    const files = Array.from(cd.files || []);
    if (files.length && /^image\//.test(files[0].type) && !cd.getData('text/plain')) {
      e.preventDefault();
      insertImageFile(files[0]);
      return;
    }
    if (!settings.smartPaste) return;
    const html = cd.getData('text/html');
    const plain = cd.getData('text/plain');
    if (!html || html.length > 3 * 1024 * 1024) return;
    const looksMd = /(^|\n)\s{0,3}(#{1,6}\s|[-*+]\s|\d+\.\s|>|```|\|.*\|)|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\)/.test(plain);
    const fromCode = /white-space:\s*pre|font-family:[^;"]*(mono|consolas|menlo|courier)/i.test(html) || /vscode|monaco|CodeMirror/i.test(html);
    const rich = /<(h[1-6]|ul|ol|table|a\s[^>]*href|strong|b[\s>]|em[\s>]|i[\s>]|img|pre|blockquote|code)\b/i.test(html);
    if (looksMd || fromCode || !rich) return;
    e.preventDefault();
    const s = editor.selectionStart, en = editor.selectionEnd;
    try {
      const md = await htmlToMarkdown(html);
      E.replaceRange(s, en, md.replace(/\n$/, ''));
      toast(t('pastedConverted'));
    } catch (err) {
      E.replaceRange(s, en, normalizeText(plain));
    }
  });

  // PWA file handling (installed app opens .md files)
  if ('launchQueue' in window) {
    window.launchQueue.setConsumer(async (params) => {
      for (const h of params.files || []) { try { await openFile(await h.getFile(), h); } catch (e) { /* ignore */ } }
    });
  }

  /* ------------------------------------------------------------------ export */
  function fileBase() {
    const doc = docs.find((d) => d.id === currentId);
    return ((doc && doc.title) || 'document').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 80) || 'document';
  }
  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      ta.remove();
      return ok;
    }
  }
  function cleanPreviewHtml() {
    const clone = preview.cloneNode(true);
    clone.querySelectorAll('.copy-code, .preview-empty').forEach((el) => el.remove());
    clone.querySelectorAll('[data-line]').forEach((el) => el.removeAttribute('data-line'));
    clone.querySelectorAll('.flash').forEach((el) => el.classList.remove('flash'));
    clone.querySelectorAll('img.img-blocked').forEach((img) => {
      img.setAttribute('src', img.getAttribute('data-blocked-src'));
      img.removeAttribute('data-blocked-src'); img.classList.remove('img-blocked');
      img.removeAttribute('role'); img.removeAttribute('tabindex'); img.removeAttribute('title');
    });
    return clone;
  }
  function markdownCss() {
    const sheet = $('#md-css-link') && $('#md-css-link').sheet;
    try {
      return Array.from(sheet.cssRules).map((r) => r.cssText).filter((c) => !c.startsWith('@font-face')).join('\n');
    } catch (e) {
      return '.md{font-family:system-ui,sans-serif;line-height:1.8;max-width:860px;margin:auto;padding:32px}.md pre{background:#f6f8fa;padding:1em;border-radius:8px;overflow:auto}.md table{border-collapse:collapse}.md td,.md th{border:1px solid #ddd;padding:.4em .8em}.md blockquote{border-inline-start:4px solid #6366f1;margin:0;padding:.5em 1em;color:#555}';
    }
  }
  function exportHtml() {
    const clone = cleanPreviewHtml();
    const title = R.esc(fileBase());
    const dir = preview.getAttribute('dir') || 'ltr';
    const hasMath = !!clone.querySelector('.katex');
    const katexLink = hasMath ? '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css" crossorigin="anonymous">\n' : '';
    const csp = "default-src 'none'; style-src 'unsafe-inline'" + (hasMath ? ' https://cdn.jsdelivr.net' : '') + '; img-src data: https:; font-src https://cdn.jsdelivr.net data:; media-src data: https:';
    const doc = '<!doctype html>\n<html lang="' + (dir === 'rtl' ? 'fa' : 'en') + '" dir="' + dir + '">\n<head>\n<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<meta http-equiv="Content-Security-Policy" content="' + csp + '">\n<meta name="referrer" content="no-referrer">\n' +
      '<meta name="generator" content="Hamsoo">\n<title>' + title + '</title>\n' + katexLink +
      '<style>\nbody{margin:0;background:#fff}@media (prefers-color-scheme:dark){body{background:#151820}}\n.md{max-width:860px;margin:0 auto;padding:40px 24px 80px;font-family:Vazirmatn,system-ui,-apple-system,"Segoe UI",Roboto,Tahoma,sans-serif}\n' +
      markdownCss() + '\n</style>\n</head>\n<body>\n<article class="md" dir="' + dir + '">\n' + clone.innerHTML + '\n</article>\n</body>\n</html>\n';
    download(fileBase() + '.html', doc, 'text/html;charset=utf-8');
  }
  async function exportDocx() {
    try {
      toast(t('loading'));
      renderNow();
      await lastRender;
      await R.loadScript('vendor/docx.min.js');
      await R.loadScript('js/docx-export.js');
      const blob = await window.HamsooDocx.exportDocx(preview, { title: fileBase() });
      download(fileBase() + '.docx', blob, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    } catch (e) {
      console.error(e);
      toast(t('exportFailed'), 'error');
    }
  }
  function printDoc() {
    saveNow();
    window.print();
  }
  let themeBeforePrint = null;
  window.addEventListener('beforeprint', () => {
    themeBeforePrint = root.getAttribute('data-theme');
    root.setAttribute('data-theme', 'light');
  });
  window.addEventListener('afterprint', () => {
    if (themeBeforePrint) root.setAttribute('data-theme', themeBeforePrint); else root.removeAttribute('data-theme');
  });

  async function copyRich() {
    const html = cleanPreviewHtml().innerHTML;
    const text = preview.innerText;
    try {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' })
      })]);
      toast(t('copied'));
    } catch (e) {
      // Fallback: select rendered preview and copy
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(preview);
      sel.removeAllRanges(); sel.addRange(range);
      let ok = false;
      try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
      sel.removeAllRanges();
      toast(ok ? t('copied') : t('copyFailed'), ok ? '' : 'error');
    }
  }

  /* ------------------------------------------------------------------ menus & dialogs */
  function closeMenus(except) {
    $$('.menu').forEach((m) => { if (m !== except) m.hidden = true; });
    $$('[data-menu]').forEach((b) => { if (!except || b.dataset.menu !== except.id) b.setAttribute('aria-expanded', 'false'); });
  }
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-menu]');
    if (trigger) {
      const menu = document.getElementById(trigger.dataset.menu);
      const open = menu.hidden;
      closeMenus(menu);
      menu.hidden = !open;
      trigger.setAttribute('aria-expanded', String(open));
      if (open) { const first = menu.querySelector('button'); first && first.focus(); }
      return;
    }
    if (!e.target.closest('.menu')) closeMenus();
  });
  document.addEventListener('keydown', (e) => {
    const menu = e.target.closest && e.target.closest('.menu');
    if (!menu) return;
    const items = $$('button', menu);
    const i = items.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
    if (e.key === 'Escape') { e.preventDefault(); closeMenus(); const tr = $('[data-menu="' + menu.id + '"]'); tr && tr.focus(); }
  });

  function openDialog(id) {
    closeMenus();
    const d = document.getElementById(id);
    if (!d.open) d.showModal();
  }
  function closeDialogs() { $$('dialog[open]').forEach((d) => d.close()); }
  $$('dialog').forEach((d) => {
    d.addEventListener('click', (e) => {
      if (e.target.closest('[data-close]')) { d.close(); return; }
      if (e.target === d) {
        const r = d.getBoundingClientRect();
        if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close();
      }
    });
  });

  function renderDocList() {
    const list = $('#doc-list');
    const fmt = new Intl.DateTimeFormat(locale(), { dateStyle: 'medium', timeStyle: 'short' });
    sortDocs();
    list.replaceChildren(...docs.map((d) => {
      const li = document.createElement('li');
      li.className = 'doc-item' + (d.id === currentId ? ' current' : '');
      li.innerHTML = '<span class="doc-icon"><svg><use href="#i-file"/></svg></span>' +
        '<button type="button" class="doc-main" data-doc-open><span class="doc-title"></span><span class="doc-meta"></span></button>' +
        '<button type="button" class="tb" data-doc-dup><svg><use href="#i-dup"/></svg></button>' +
        '<button type="button" class="tb" data-doc-del><svg><use href="#i-trash"/></svg></button>';
      li.dataset.id = d.id;
      $('.doc-title', li).textContent = d.title || t('untitled');
      const bits = [fmt.format(new Date(d.updated || Date.now())), nf().format(d.size || 0) + ' ' + t('chars')];
      if (d.file && d.file.name) bits.push('💾 ' + d.file.name);
      $('.doc-meta', li).textContent = bits.join(' · ');
      if (d.id === currentId) {
        const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = t('current');
        $('.doc-main', li).after(tag);
      }
      $('[data-doc-dup]', li).title = t('duplicate'); $('[data-doc-dup]', li).setAttribute('aria-label', t('duplicate'));
      $('[data-doc-del]', li).title = t('delete'); $('[data-doc-del]', li).setAttribute('aria-label', t('delete'));
      return li;
    }));
    updateStorageInfo();
  }
  async function updateStorageInfo() {
    const el = $('#storage-info');
    if (!el) return;
    const est = await window.HamsooStorage.estimate();
    if (!est || !est.quota) { el.textContent = ''; return; }
    const mb = (n) => nf().format(Math.round(n / 1048576 * 10) / 10) + ' MB';
    el.textContent = t('storageUsed').replace('{used}', mb(est.usage || 0)).replace('{total}', mb(est.quota));
  }
  $('#doc-list').addEventListener('click', async (e) => {
    const li = e.target.closest('.doc-item');
    if (!li) return;
    const id = li.dataset.id;
    try {
      if (e.target.closest('[data-doc-open]')) { closeDialogs(); await loadDoc(id); return; }
      if (e.target.closest('[data-doc-dup]')) {
        await saveNow();
        const src = docs.find((d) => d.id === id);
        await createDoc(await S.getContent(id), (src && src.title ? src.title : t('untitled')) + ' (2)');
        renderDocList();
        return;
      }
      if (e.target.closest('[data-doc-del]')) {
        if (!confirm(t('deleteConfirm'))) return;
        await S.del(id);
        docs = docs.filter((d) => d.id !== id);
        if (id === currentId) {
          setCurrent(null);
          dirty = false;
          if (docs.length) { sortDocs(); await loadDoc(docs[0].id); } else await newDoc('');
        }
        notifyOtherTabs();
        renderDocList();
        toast(t('deleted'));
      }
    } catch (err) { storageError(err); }
  });

  function bindSettingsForm() {
    $$('[data-setting]').forEach((input) => {
      const k = input.dataset.setting;
      if (input.type === 'checkbox') input.checked = !!settings[k];
      else if (input.type === 'radio') input.checked = settings[k] === input.value;
      else input.value = settings[k];
      const out = $('[data-out="' + k + '"]');
      if (out) out.textContent = settings[k] + 'px';
    });
  }
  $('#settings-dialog').addEventListener('input', (e) => {
    const input = e.target.closest('[data-setting]');
    if (!input) return;
    const k = input.dataset.setting;
    if (input.type === 'checkbox') settings[k] = input.checked;
    else if (input.type === 'range') settings[k] = parseInt(input.value, 10);
    else settings[k] = input.value;
    const out = $('[data-out="' + k + '"]');
    if (out) out.textContent = settings[k] + 'px';
    saveSettings();
    applyEditorSettings();
    if (['breaks', 'remoteImages', 'previewSize'].includes(k)) renderNow();
  });

  /* ------------------------------------------------------------------ actions */
  let deferredInstall = null;
  const ACTIONS = {
    new: () => { closeDialogs(); newDoc(''); toast(t('newDoc')); },
    open: () => { closeDialogs(); if (Disk.supported) Disk.open(); else $('#file-input').click(); },
    'save-file': () => Disk.save(false),
    'save-as': () => Disk.save(true),
    'unlink-file': () => Disk.unlink(),
    docs: () => { saveNow(); renderDocList(); openDialog('docs-dialog'); },
    settings: () => { bindSettingsForm(); openDialog('settings-dialog'); },
    help: () => openDialog('help-dialog'),
    'export-md': () => { download(fileBase() + '.md', editor.value, 'text/markdown;charset=utf-8'); },
    'export-txt': () => download(fileBase() + '.txt', preview.innerText, 'text/plain;charset=utf-8'),
    'export-html': exportHtml,
    'export-pdf': printDoc,
    'export-docx': exportDocx,
    'copy-md': async () => toast(await copyText(editor.value) ? t('copied') : t('copyFailed')),
    'copy-html': async () => toast(await copyText(cleanPreviewHtml().innerHTML) ? t('copied') : t('copyFailed')),
    'copy-rich': copyRich,
    find: () => (findState.open ? closeFind() : openFind()),
    toc: () => { settings.toc = !settings.toc; saveSettings(); applyEditorSettings(); highlightToc(); },
    sync: () => { settings.sync = !settings.sync; saveSettings(); applyEditorSettings(); },
    focus: () => toggleFocus(),
    'clear-all': async () => {
      if (!confirm(t('clearAllConfirm'))) return;
      try {
        await S.clear();
        docs = []; setCurrent(null); dirty = false;
        notifyOtherTabs();
        await newDoc('');
        renderDocList();
        toast(t('deleted'));
      } catch (e) { storageError(e); }
    },
    install: async () => {
      if (!deferredInstall) return;
      deferredInstall.prompt();
      try { await deferredInstall.userChoice; } catch (e) { /* ignore */ }
      deferredInstall = null;
      $('[data-action="install"]').hidden = true;
    }
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (!b || !ACTIONS[b.dataset.action]) return;
    closeMenus();
    ACTIONS[b.dataset.action]();
  });
  $$('[data-view-btn]').forEach((b) => b.addEventListener('click', () => {
    settings.view = b.dataset.viewBtn; saveSettings(); applyView();
    if (settings.view !== 'preview') editor.focus({ preventScroll: true });
  }));
  $$('[data-dir]').forEach((b) => b.addEventListener('click', () => {
    settings.dir = b.dataset.dir; saveSettings(); applyDirUI(); closeMenus(); renderNow();
  }));
  $('#lang-menu').addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]');
    if (!b) return;
    settings.lang = b.dataset.lang;
    saveSettings();
    closeMenus();
    applyLang();
    renderNow();
  });
  $$('[data-theme-opt]').forEach((b) => b.addEventListener('click', () => {
    settings.theme = b.dataset.themeOpt; saveSettings(); applyTheme(); closeMenus();
  }));

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstall = e;
    $('[data-action="install"]').hidden = false;
  });

  /* focus mode */
  let focusExit = null;
  function toggleFocus(force) {
    const on = force != null ? force : !app.classList.contains('focus');
    app.classList.toggle('focus', on);
    if (on && !focusExit) {
      focusExit = document.createElement('button');
      focusExit.type = 'button';
      focusExit.className = 'tb focus-exit';
      focusExit.innerHTML = '<svg><use href="#i-x"/></svg>';
      focusExit.title = t('close') + ' (Esc)';
      focusExit.setAttribute('aria-label', focusExit.title);
      focusExit.addEventListener('click', () => toggleFocus(false));
      document.body.appendChild(focusExit);
    } else if (!on && focusExit) { focusExit.remove(); focusExit = null; }
    invalidateSync();
    if (on && settings.view !== 'preview') editor.focus({ preventScroll: true });
  }

  /* global shortcuts */
  document.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (e.key === 'Escape') {
      if ($('dialog[open]')) return;
      if (findState.open && document.activeElement !== editor) return;
      if (app.classList.contains('focus')) { toggleFocus(false); return; }
      closeMenus();
    }
    if (!mod) return;
    if (k === 's') { e.preventDefault(); Disk.save(e.shiftKey); }
    else if (k === 'o' && !e.shiftKey) { e.preventDefault(); ACTIONS.open(); }
    else if (k === 'p' && !e.shiftKey) { e.preventDefault(); printDoc(); }
    else if (k === 'f' && e.shiftKey) { e.preventDefault(); toggleFocus(); }
    else if (k === 'f' && !e.shiftKey && !e.altKey) { e.preventDefault(); openFind(); }
    else if (k === 'n' && e.altKey) { e.preventDefault(); ACTIONS.new(); }
  });

  /* splitter */
  const splitter = $('#splitter');
  splitter.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    splitter.setPointerCapture(e.pointerId);
    splitter.classList.add('dragging');
    const rect = workspace.getBoundingClientRect();
    const tocW = settings.toc && window.innerWidth > 860 ? $('#toc').offsetWidth : 0;
    const rtl = root.dir === 'rtl';
    const move = (ev) => {
      const avail = rect.width - tocW;
      let x = rtl ? rect.right - tocW - ev.clientX : ev.clientX - rect.left - tocW;
      const pct = Math.min(80, Math.max(20, (x / avail) * 100));
      settings.split = Math.round(pct * 10) / 10;
      workspace.style.setProperty('--split', settings.split + '%');
    };
    const up = () => {
      splitter.classList.remove('dragging');
      splitter.removeEventListener('pointermove', move);
      splitter.removeEventListener('pointerup', up);
      splitter.removeEventListener('pointercancel', up);
      saveSettings();
      invalidateSync();
    };
    splitter.addEventListener('pointermove', move);
    splitter.addEventListener('pointerup', up);
    splitter.addEventListener('pointercancel', up);
  });
  splitter.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 10 : 2;
    const rtl = root.dir === 'rtl';
    if (e.key === 'ArrowLeft') settings.split += rtl ? step : -step;
    else if (e.key === 'ArrowRight') settings.split += rtl ? -step : step;
    else if (e.key === 'Home') settings.split = 50;
    else return;
    e.preventDefault();
    settings.split = Math.min(80, Math.max(20, settings.split));
    workspace.style.setProperty('--split', settings.split + '%');
    saveSettings();
    invalidateSync();
  });
  splitter.addEventListener('dblclick', () => { settings.split = 50; applyView(); saveSettings(); });

  /* keep tabs in sync */
  /* keep tabs in sync: another tab changed the document list */
  if (bc) bc.onmessage = async (e) => {
    if (!e.data || e.data.type !== 'docs' || !S) return;
    const fresh = await S.listMeta();
    const cur = curDoc();
    docs = fresh;
    if (cur && !docs.find((d) => d.id === cur.id)) docs.unshift(cur); // keep the open doc even if deleted elsewhere
    if ($('#docs-dialog').open) renderDocList();
  };
  window.addEventListener('pagehide', () => { savePendingSync(); saveNow(); });
  window.addEventListener('beforeunload', () => { savePendingSync(); saveNow(); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { savePendingSync(); saveNow(); } });

  /* ------------------------------------------------------------------ init */
  async function init() {
    applyTheme();
    applyDirUI();
    applyView();
    applyEditorSettings();
    applyLang();

    S = await window.HamsooStorage.init();
    docs = (await S.listMeta()).filter((d) => d && typeof d.id === 'string');
    await recoverPending();
    if (!docs.length) await createDoc(WELCOME[settings.lang] || WELCOME.en);
    sortDocs();
    if (!docs.find((d) => d.id === currentId)) setCurrent(docs[0].id);
    await loadDoc(currentId);
    Hooks.ready.forEach((fn) => fn());

    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      const reg = () => navigator.serviceWorker.register('sw.js').catch(() => {});
      if (document.readyState === 'complete') reg(); else window.addEventListener('load', reg, { once: true });
    }
  }
  init();
})();
