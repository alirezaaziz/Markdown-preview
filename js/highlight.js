/* Hamsoo — Markdown syntax colouring + line numbers for the editor.
 * A layer behind the (transparent-text) textarea renders the same text with colours. Only colours are
 * applied (no bold/italic) so glyph widths, wrapping and bidi stay identical to the textarea.
 * Lines are diffed on every input, so only changed lines are re-rendered. */
(function () {
  'use strict';

  const MAX_CHARS = 600000; // above this, colouring is switched off for responsiveness
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
  const esc = (s) => s.replace(/[&<>]/g, (c) => ESC[c]);
  const span = (cls, text) => text ? '<span class="' + cls + '">' + esc(text) + '</span>' : '';

  // Inline tokens, in priority order (first alternative that matches at a position wins).
  const INLINE = new RegExp([
    '(`+)[^`]*?\\1',                                   // 1 code span
    '!?\\[(?:[^\\]\\\\]|\\\\.)*\\]\\((?:[^()\\s]|\\([^)]*\\))*(?:\\s+"[^"]*")?\\)', // link/image
    '\\[\\^[^\\]\\s]+\\]',                              // footnote ref
    '\\*\\*(?=\\S)[^*]*?\\S\\*\\*|__(?=\\S)[^_]*?\\S__', // strong
    '\\*(?=[^\\s*])[^*]*?[^\\s*]\\*|\\*[^\\s*]\\*|(?<![\\w])_(?=[^\\s_])[^_]*?[^\\s_]_(?![\\w])', // emphasis
    '~~(?=\\S)[^~]*?\\S~~',                             // strikethrough
    '\\$(?![\\s$])[^$\\n]*?[^\\s\\\\]\\$|\\$[^\\s$]\\$', // inline math
    '<\\/?[A-Za-z][\\w-]*(?:\\s[^<>]*)?\\/?>|<!--.*?-->', // html
    '(?:https?:\\/\\/|www\\.)[^\\s<>()]+',              // bare url
    '\\\\[\\\\`*_{}\\[\\]()#+\\-.!|~$<>]'               // escape
  ].map((r) => '(' + r + ')').join('|'), 'g');

  function inline(text, tablePipes) {
    let out = '', last = 0, m;
    INLINE.lastIndex = 0;
    while ((m = INLINE.exec(text))) {
      if (m.index > last) out += plain(text.slice(last, m.index), tablePipes);
      const tok = m[0];
      if (m[1]) out += span('tk-icode', tok);
      else if (m[3]) {
        const b = tok.indexOf('](');
        out += span('tk-punct', tok.slice(0, tok[0] === '!' ? 2 : 1)) + span('tk-ltext', tok.slice(tok[0] === '!' ? 2 : 1, b)) +
          span('tk-punct', '](') + span('tk-url', tok.slice(b + 2, -1)) + span('tk-punct', ')');
      }
      else if (m[4]) out += span('tk-link', tok);
      else if (m[5]) out += span('tk-strong', tok);
      else if (m[6]) out += span('tk-em', tok);
      else if (m[7]) out += span('tk-del', tok);
      else if (m[8]) out += span('tk-math', tok);
      else if (m[9]) out += span('tk-html', tok);
      else if (m[10]) out += span('tk-url', tok);
      else out += span('tk-punct', tok);
      last = m.index + tok.length;
      if (!tok.length) INLINE.lastIndex++;
    }
    if (last < text.length) out += plain(text.slice(last), tablePipes);
    return out;
  }
  function plain(text, tablePipes) {
    if (!tablePipes || text.indexOf('|') < 0) return esc(text);
    return text.split('|').map(esc).join('<span class="tk-pipe">|</span>');
  }

  const FENCE = /^(\s{0,3})(`{3,}|~{3,})(.*)$/;

  /** Render one line. state: '' | 'f:<char><len>' (inside fenced code) | 'm' (inside $$ math). Returns [html, nextState]. */
  function line(text, state) {
    if (state && state[0] === 'f') {
      const ch = state[2], len = +state.slice(3);
      const m = FENCE.exec(text);
      if (m && m[2][0] === ch && m[2].length >= len && !m[3].trim()) return [span('tk-fence', text), ''];
      return [span('tk-code', text), state];
    }
    if (state === 'm') {
      if (/^\s{0,3}\$\$\s*$/.test(text)) return [span('tk-math', text), ''];
      return [span('tk-math', text), 'm'];
    }
    let m = FENCE.exec(text);
    if (m && !(m[2][0] === '`' && m[3].includes('`'))) return [span('tk-fence', text), 'f:' + m[2][0] + m[2].length];
    if (/^\s{0,3}\$\$\s*$/.test(text)) return [span('tk-math', text), 'm'];
    if (/^\s{0,3}\$\$.*\$\$\s*$/.test(text)) return [span('tk-math', text), ''];

    m = /^(\s{0,3})(#{1,6})(?=\s|$)(.*)$/.exec(text);
    if (m) return [esc(m[1]) + span('tk-hmark', m[2]) + '<span class="tk-h">' + inline(m[3]) + '</span>', ''];
    if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(text)) return [span('tk-hr', text), ''];
    if (/^\s{0,3}(=+|-+)\s*$/.test(text)) return [span('tk-hmark', text), ''];

    let out = '', rest = text;
    m = /^((?:\s*>)+\s?)/.exec(rest);
    if (m) { out += span('tk-quote', m[1]); rest = rest.slice(m[1].length); }
    m = /^(\s*)([-*+]|\d{1,9}[.)])(\s+)(\[[ xX]\](?=\s))?/.exec(rest);
    if (m) {
      out += esc(m[1]) + span('tk-list', m[2]) + esc(m[3]) + (m[4] ? span(/x/i.test(m[4]) ? 'tk-task done' : 'tk-task', m[4]) : '');
      rest = rest.slice(m[0].length);
    }
    m = /^(\s{0,3}\[[^\]]+\]:)(\s.*)?$/.exec(rest);
    if (m && !out) return [span('tk-link', m[1]) + span('tk-url', m[2] || ''), ''];
    const isTable = /^\s*\|/.test(rest) || /^\s*:?-{2,}:?\s*\|/.test(rest) || (rest.includes('|') && /\|\s*$/.test(rest));
    if (isTable && /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$/.test(rest)) return [out + span('tk-pipe', rest), ''];
    return [out + inline(rest, isTable), ''];
  }

  function create(ta, layer) {
    let src = [];       // source line strings currently rendered
    let states = [];    // state *before* each line
    let enabled = true; // layer active (colours and/or line numbers)
    let colors = true;  // syntax colours on
    let off = false;    // auto-disabled for huge docs
    const lineFn = (text, state) => (colors ? line(text, state) : [esc(text), '']);

    function render(i, text, state) {
      const [html, next] = lineFn(text, state);
      return ['<div class="hl-line">' + (html || '<br>') + '</div>', next];
    }

    function full() {
      const lines = ta.value.split('\n');
      let state = '';
      const parts = new Array(lines.length);
      states = new Array(lines.length);
      for (let i = 0; i < lines.length; i++) {
        states[i] = state;
        const r = render(i, lines[i], state);
        parts[i] = r[0];
        state = r[1];
      }
      layer.innerHTML = parts.join('');
      src = lines;
    }

    function update() {
      if (!enabled) return;
      if (ta.value.length > MAX_CHARS) {
        if (!off) { off = true; ta.classList.remove('hl-on'); layer.hidden = true; layer.replaceChildren(); src = []; states = []; }
        return;
      }
      if (off) { off = false; ta.classList.toggle('hl-on', colors); layer.hidden = false; src = []; }
      const lines = ta.value.split('\n');
      if (!src.length || !layer.firstChild) { full(); sync(); return; }
      const oldLen = src.length, newLen = lines.length;
      let p = 0;
      while (p < oldLen && p < newLen && src[p] === lines[p]) p++;
      if (p === oldLen && p === newLen) return;
      let q = 0;
      while (q < oldLen - p && q < newLen - p && src[oldLen - 1 - q] === lines[newLen - 1 - q]) q++;
      const oldEnd = oldLen - q, newEnd = newLen - q;

      const kids = layer.children;
      // remove changed old lines
      for (let i = oldEnd - 1; i >= p; i--) kids[i].remove();
      // insert new lines (state recomputed below)
      const ref = kids[p] || null;
      const tmp = document.createElement('div');
      let html = '';
      for (let i = p; i < newEnd; i++) html += '<div class="hl-line"></div>';
      tmp.innerHTML = html;
      const frag = document.createDocumentFragment();
      while (tmp.firstChild) frag.appendChild(tmp.firstChild);
      layer.insertBefore(frag, ref);
      states.splice(p, oldEnd - p, ...new Array(newEnd - p).fill(null));
      src = lines;

      // re-render from p until the incoming state matches what was there before
      let state = p === 0 ? '' : lineFn(src[p - 1], states[p - 1])[1];
      for (let i = p; i < newLen; i++) {
        if (i >= newEnd && states[i] === state) break;
        states[i] = state;
        const r = lineFn(src[i], state);
        kids[i].innerHTML = r[0] || '<br>';
        state = r[1];
      }
    }

    function sync() {
      layer.scrollTop = ta.scrollTop;
      layer.scrollLeft = ta.scrollLeft;
      layer.style.setProperty('--sx', ta.scrollLeft + 'px');
    }

    /** colours: syntax colouring; numbers: line-number gutter. */
    function setMode(opts) {
      colors = !!opts.colors;
      enabled = colors || !!opts.numbers;
      ta.classList.toggle('hl-on', colors && !off);
      layer.classList.toggle('plain', !colors);
      layer.hidden = !enabled || off;
      src = []; states = [];
      if (enabled) update(); else layer.replaceChildren();
    }

    return { update, sync, setMode, isOff: () => off };
  }

  window.HamsooHighlight = { create, line };
})();
