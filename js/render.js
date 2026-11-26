/* Hamsoo — Markdown rendering, sanitising and bidi direction detection.
 * Everything runs locally. Output HTML is always passed through DOMPurify. */
(function () {
  'use strict';

  /* ---------- helpers ---------- */
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

  /* ---------- bidi detection ---------- */
  // Hebrew, Arabic, Syriac, Thaana, NKo, Samaritan, Mandaic, Arabic ext + presentation forms
  const RTL_RE = /[֐-ࣿיִ-﷿ﹰ-﻿]/g;
  // Latin, Greek, Cyrillic, Armenian + common LTR scripts
  const LTR_RE = /[A-Za-zÀ-ʯͰ-ϿЀ-ԯ԰-֏ऀ-෿฀-໿Ḁ-῿぀-ヿ一-鿿가-힯]/g;
  const URLISH = /(?:https?:\/\/|www\.)\S+|\S+@\S+\.\S+/g;

  /** Returns 'rtl', 'ltr' or null (no strong characters). */
  function detectDir(text) {
    if (!text) return null;
    if (text.length > 4000) text = text.slice(0, 4000);
    text = text.replace(URLISH, ' ');
    const r = (text.match(RTL_RE) || []).length;
    const l = (text.match(LTR_RE) || []).length;
    if (!r && !l) return null;
    return r / (r + l) >= 0.4 ? 'rtl' : 'ltr';
  }

  const SKIP_SEL = 'pre, code, kbd, samp, .katex, .math-block, .math-inline, .mermaid-block, svg';

  /** Collects text of an element, ignoring code/math and (optionally) nested lists/blocks. */
  function dirText(el, skipNested) {
    let out = '';
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.nodeType === 1) {
          if (node !== el && (node.matches(SKIP_SEL) || (skipNested && node.matches('ul, ol, blockquote, table')))) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_SKIP;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    let n;
    while ((n = walker.nextNode())) {
      out += n.nodeValue;
      if (out.length > 4000) break;
    }
    return out;
  }

  const BLOCK_SEL = 'p, h1, h2, h3, h4, h5, h6, li, blockquote, th, td, dt, dd, figcaption, summary, details, caption, .md-alert';

  /**
   * Apply direction to rendered markdown.
   * mode: 'auto' | 'rtl' | 'ltr'
   * Returns the document's dominant direction.
   */
  function applyDirections(root, mode) {
    // Code-like content is always LTR, isolated from surrounding text.
    root.querySelectorAll('pre, .math-block, .mermaid-block').forEach((e) => e.setAttribute('dir', 'ltr'));
    root.querySelectorAll('code, kbd, .math-inline').forEach((e) => {
      if (!e.closest('pre')) e.setAttribute('dir', 'ltr');
    });

    if (mode === 'rtl' || mode === 'ltr') {
      root.setAttribute('dir', mode);
      return mode;
    }

    const docDir = detectDir(dirText(root, false)) || 'ltr';
    root.setAttribute('dir', docDir);

    root.querySelectorAll(BLOCK_SEL).forEach((el) => {
      const d = detectDir(dirText(el, el.tagName === 'LI' || el.tagName === 'BLOCKQUOTE' || el.tagName === 'DETAILS'));
      if (d) el.setAttribute('dir', d);
    });
    // Lists & tables take the majority direction of their items so bullets/columns sit on the right side.
    root.querySelectorAll('ul, ol').forEach((list) => {
      let r = 0, l = 0;
      for (const li of list.children) {
        const d = li.getAttribute('dir');
        if (d === 'rtl') r++; else if (d === 'ltr') l++;
      }
      if (r || l) list.setAttribute('dir', r >= l ? 'rtl' : 'ltr');
    });
    root.querySelectorAll('table').forEach((t) => {
      const d = detectDir(dirText(t, false));
      if (d) t.setAttribute('dir', d);
    });
    return docDir;
  }

  /* ---------- slugs (Unicode-aware, so Persian headings get anchors) ---------- */
  function makeSlugger() {
    const seen = new Map();
    return (raw) => {
      let base = String(raw).toLowerCase().trim()
        .replace(/<[^>]*>/g, '')
        .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, '')
        .replace(/\s+/g, '-') || 'section';
      let slug = base, i = seen.get(base) || 0;
      if (i) slug = base + '-' + i;
      seen.set(base, i + 1);
      return slug;
    };
  }

  /* ---------- marked setup ---------- */
  let slug = makeSlugger();

  const mathBlock = {
    name: 'mathBlock', level: 'block',
    start(src) { const m = src.match(/^ {0,3}\$\$/m); return m ? m.index : undefined; },
    tokenizer(src) {
      const m = /^ {0,3}\$\$([\s\S]+?)\$\$[ \t]*(?:\n|$)/.exec(src);
      if (m) return { type: 'mathBlock', raw: m[0], text: m[1].trim() };
    },
    renderer(t) { return `<div class="math-block" data-tex="${esc(t.text)}">${esc(t.text)}</div>\n`; }
  };
  const mathInline = {
    name: 'mathInline', level: 'inline',
    start(src) { const i = src.indexOf('$'); return i < 0 ? undefined : i; },
    tokenizer(src) {
      let m = /^\$\$(?!\s)([^$\n]+?)\$\$/.exec(src) || /^\$(?![\s$])((?:\\.|[^\\$\n])+?)(?<![\s\\])\$(?!\d)/.exec(src);
      if (m) return { type: 'mathInline', raw: m[0], text: m[1] };
    },
    renderer(t) { return `<span class="math-inline" data-tex="${esc(t.text)}">${esc(t.text)}</span>`; }
  };

  // GitHub-style alerts: > [!NOTE] ...
  const ALERTS = { note: 'Note', tip: 'Tip', important: 'Important', warning: 'Warning', caution: 'Caution' };

  function createMarked(opts) {
    const md = new marked.Marked({ gfm: true, breaks: !!opts.breaks, async: false });
    md.use(markedFootnote({ description: 'Footnotes' }));
    md.use({
      extensions: [mathBlock, mathInline],
      renderer: {
        code(code, info) {
          const lang = ((info || '').match(/^\S*/) || [''])[0].toLowerCase();
          if (lang === 'mermaid') {
            return `<div class="mermaid-block"><pre class="mermaid-src">${esc(code)}</pre></div>\n`;
          }
          if (lang === 'math' || lang === 'latex' || lang === 'katex' || lang === 'tex') {
            return `<div class="math-block" data-tex="${esc(code)}">${esc(code)}</div>\n`;
          }
          let body;
          if (lang && window.hljs && hljs.getLanguage(lang)) {
            try { body = hljs.highlight(code, { language: lang, ignoreIllegals: true }).value; } catch (e) { body = esc(code); }
          } else {
            body = esc(code);
          }
          const cls = lang ? ` class="hljs language-${esc(lang)}"` : ' class="hljs"';
          const label = lang ? ` data-lang="${esc(lang)}"` : '';
          return `<pre${label}><code${cls}>${body}</code></pre>\n`;
        },
        heading(text, level, raw) {
          return `<h${level} id="${esc(slug(raw))}">${text}</h${level}>\n`;
        },
        blockquote(quote) {
          const m = /^<p>\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(?:<br>)?\s*/i.exec(quote);
          if (m) {
            const kind = m[1].toLowerCase();
            const rest = quote.slice(m[0].length);
            const body = rest.startsWith('</p>') ? rest.slice(4) : '<p>' + rest;
            return `<div class="md-alert md-alert-${kind}"><p class="md-alert-title">${ALERTS[kind]}</p>${body}</div>\n`;
          }
          return `<blockquote>\n${quote}</blockquote>\n`;
        }
      }
    });
    return md;
  }

  /* ---------- sanitiser ---------- */
  const PURIFY_CFG = {
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['style', 'form', 'button', 'textarea', 'select', 'option', 'iframe', 'frame', 'frameset',
      'object', 'embed', 'link', 'meta', 'base', 'dialog', 'template', 'portal', 'noscript'],
    FORBID_ATTR: ['autofocus', 'formaction', 'srcset', 'ping', 'background', 'poster'],
    ALLOW_UNKNOWN_PROTOCOLS: false
  };
  let purifyState = { remoteImages: true, blockedLabel: 'Remote image blocked' };

  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    const tag = node.nodeName;
    if (tag === 'A' && node.hasAttribute('href')) {
      const href = node.getAttribute('href');
      if (href.startsWith('#')) {
        node.removeAttribute('target');
      } else {
        node.setAttribute('target', '_blank');
        node.setAttribute('rel', 'noopener noreferrer nofollow');
      }
    } else if (tag === 'A') {
      node.removeAttribute('target');
    } else if (tag === 'IMG') {
      const src = node.getAttribute('src') || '';
      node.setAttribute('loading', 'lazy');
      node.setAttribute('decoding', 'async');
      node.setAttribute('referrerpolicy', 'no-referrer');
      if (/^\s*(https?:)?\/\//i.test(src) && !purifyState.remoteImages) {
        node.setAttribute('data-blocked-src', src);
        node.removeAttribute('src');
        node.classList.add('img-blocked');
        node.setAttribute('title', purifyState.blockedLabel);
        node.setAttribute('role', 'button');
        node.setAttribute('tabindex', '0');
      } else if (/^\s*data:/i.test(src) && !/^\s*data:image\/(png|jpe?g|gif|webp|avif|bmp|svg\+xml)[;,]/i.test(src)) {
        node.removeAttribute('src');
      }
    } else if (tag === 'INPUT') {
      if ((node.getAttribute('type') || '').toLowerCase() !== 'checkbox') {
        node.remove();
        return;
      }
      node.removeAttribute('name');
      node.removeAttribute('disabled');
      node.classList.add('task-checkbox');
    } else if (tag === 'VIDEO' || tag === 'AUDIO' || tag === 'SOURCE') {
      const src = node.getAttribute('src') || '';
      if (/^\s*(https?:)?\/\//i.test(src) && !purifyState.remoteImages) node.removeAttribute('src');
      node.removeAttribute('autoplay');
    }
  });

  /* ---------- main render ---------- */
  let mdInstance = null, mdBreaks = null;

  /** Source line (0-based) at which each top-level rendered block starts. */
  function blockLines(tokens) {
    const lines = [];
    let line = 0;
    for (const t of tokens) {
      const raw = t.raw || '';
      if (t.type === 'footnotes') continue; // moved to the end by the plugin, not part of source flow
      if (!['space', 'def', 'footnote'].includes(t.type) && !(t.type === 'html' && /^\s*<!--[\s\S]*-->\s*$/.test(raw))) {
        // skip leading blank lines inside raw
        const lead = (raw.match(/^\n*/) || [''])[0].length;
        lines.push(line + lead);
      }
      line += (raw.match(/\n/g) || []).length;
    }
    return lines;
  }

  function render(src, opts) {
    if (!mdInstance || mdBreaks !== !!opts.breaks) {
      mdInstance = createMarked(opts);
      mdBreaks = !!opts.breaks;
    }
    purifyState.remoteImages = opts.remoteImages !== false;
    purifyState.blockedLabel = opts.blockedLabel || purifyState.blockedLabel;
    slug = makeSlugger();
    let html, lines = [];
    try {
      const tokens = mdInstance.lexer(src);
      if (mdInstance.defaults.walkTokens) mdInstance.walkTokens(tokens, mdInstance.defaults.walkTokens);
      lines = blockLines(tokens);
      html = mdInstance.parser(tokens);
    } catch (err) {
      console.error(err);
      html = `<pre class="render-error">${esc(String(err && err.message || err))}</pre>`;
    }
    return { html: DOMPurify.sanitize(html, PURIFY_CFG), lines };
  }

  /* ---------- lazy loaders for heavy features ---------- */
  const scriptCache = new Map();
  function loadScript(src) {
    if (!scriptCache.has(src)) {
      scriptCache.set(src, new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = () => { scriptCache.delete(src); reject(new Error('Failed to load ' + src)); };
        document.head.appendChild(s);
      }));
    }
    return scriptCache.get(src);
  }
  let katexCssLoaded = false;
  function loadKatex() {
    if (!katexCssLoaded) {
      const l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = 'vendor/katex/katex.min.css';
      document.head.appendChild(l);
      katexCssLoaded = true;
    }
    return loadScript('vendor/katex/katex.min.js');
  }

  async function renderMath(root, errLabel) {
    const nodes = root.querySelectorAll('.math-inline[data-tex], .math-block[data-tex]');
    if (!nodes.length) return;
    await loadKatex();
    nodes.forEach((el) => {
      if (!el.isConnected) return;
      const tex = el.getAttribute('data-tex');
      try {
        katex.render(tex, el, {
          displayMode: el.classList.contains('math-block'),
          throwOnError: false, trust: false, strict: 'ignore', output: 'htmlAndMathml', maxExpand: 500, maxSize: 50
        });
      } catch (e) {
        el.textContent = tex;
        el.classList.add('math-error');
        el.title = errLabel + ': ' + e.message;
      }
      el.removeAttribute('data-tex');
    });
  }

  const mermaidCache = new Map();
  let mermaidTheme = null, mermaidSeq = 0;
  async function renderMermaid(root, dark, errLabel) {
    const blocks = root.querySelectorAll('.mermaid-block');
    if (!blocks.length) return;
    await loadScript('vendor/mermaid.min.js');
    const theme = dark ? 'dark' : 'default';
    if (mermaidTheme !== theme) {
      mermaid.initialize({
        startOnLoad: false, securityLevel: 'strict', theme, fontFamily: 'Vazirmatn, system-ui, sans-serif',
        flowchart: { htmlLabels: false }, maxTextSize: 100000
      });
      mermaidTheme = theme;
      mermaidCache.clear();
    }
    for (const block of blocks) {
      const srcEl = block.querySelector('.mermaid-src');
      if (!srcEl) continue;
      const code = srcEl.textContent;
      let svg = mermaidCache.get(code);
      if (!svg) {
        const id = 'mmd-' + (++mermaidSeq);
        try {
          const out = await mermaid.render(id, code);
          svg = DOMPurify.sanitize(out.svg, {
            USE_PROFILES: { svg: true, svgFilters: true, html: true },
            ADD_TAGS: ['style', 'foreignObject'], FORBID_TAGS: ['script', 'a'], FORBID_ATTR: ['href', 'xlink:href']
          });
          mermaidCache.set(code, svg);
          if (mermaidCache.size > 50) mermaidCache.delete(mermaidCache.keys().next().value);
        } catch (e) {
          document.getElementById('d' + id)?.remove();
          document.getElementById(id)?.remove();
          if (!block.isConnected) return;
          block.innerHTML = '';
          const err = document.createElement('div');
          err.className = 'diagram-error';
          err.textContent = errLabel + ': ' + String(e && e.message || e).split('\n').slice(0, 3).join(' ');
          const pre = document.createElement('pre');
          pre.textContent = code;
          block.append(err, pre);
          continue;
        }
      }
      if (!block.isConnected) return; // a newer render replaced the DOM
      block.innerHTML = svg;
      block.classList.add('rendered');
    }
  }

  window.HamsooRender = { render, applyDirections, detectDir, renderMath, renderMermaid, esc, loadScript };
})();
