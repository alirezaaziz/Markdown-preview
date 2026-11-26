/* Hamsoo — textarea editing helpers (formatting, lists, measuring). Keeps native undo via execCommand. */
(function () {
  'use strict';

  function create(ta) {
    const val = () => ta.value;

    function replaceRange(start, end, text, selStart, selEnd) {
      ta.focus({ preventScroll: true });
      ta.setSelectionRange(start, end);
      let ok = false;
      try {
        ok = text === '' ? (start === end ? true : document.execCommand('delete')) : document.execCommand('insertText', false, text);
      } catch (e) { ok = false; }
      if (!ok || ta.value.slice(start, start + text.length) !== text) {
        ta.setRangeText(text, start, end, 'end');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
      if (selStart != null) ta.setSelectionRange(selStart, selEnd == null ? selStart : selEnd);
    }

    function lineRange() {
      const v = val();
      let s = ta.selectionStart, e = ta.selectionEnd;
      if (e > s && v[e - 1] === '\n') e--;
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      let le = v.indexOf('\n', e);
      if (le < 0) le = v.length;
      return [ls, le];
    }

    function transformLines(fn) {
      const [ls, le] = lineRange();
      const lines = val().slice(ls, le).split('\n');
      const out = fn(lines).join('\n');
      replaceRange(ls, le, out, ls, ls + out.length);
    }

    function wrap(before, after, placeholder) {
      const v = val();
      const s = ta.selectionStart, e = ta.selectionEnd;
      const sel = v.slice(s, e);
      // Unwrap if already wrapped (inside or outside the selection)
      if (v.slice(s - before.length, s) === before && v.slice(e, e + after.length) === after) {
        replaceRange(s - before.length, e + after.length, sel, s - before.length, e - before.length);
        return;
      }
      if (sel.length >= before.length + after.length && sel.startsWith(before) && sel.endsWith(after)) {
        const inner = sel.slice(before.length, sel.length - after.length);
        replaceRange(s, e, inner, s, s + inner.length);
        return;
      }
      const text = sel || placeholder || '';
      replaceRange(s, e, before + text + after, s + before.length, s + before.length + text.length);
    }

    function setHeading(level) {
      transformLines((lines) => {
        const allSame = lines.every((l) => !l.trim() || new RegExp('^#{' + level + '}\\s').test(l));
        return lines.map((l) => {
          if (!l.trim()) return l;
          const stripped = l.replace(/^#{1,6}\s+/, '');
          return allSame ? stripped : '#'.repeat(level) + ' ' + stripped;
        });
      });
    }

    const LIST_RE = {
      task: /^(\s*)[-*+]\s+\[[ xX]\]\s+/,
      ul: /^(\s*)[-*+]\s+(?!\[[ xX]\]\s)/,
      ol: /^(\s*)\d+[.)]\s+/
    };
    const ANY_LIST = /^(\s*)(?:[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+[.)]\s+)/;

    function toggleList(kind) {
      transformLines((lines) => {
        const nonEmpty = lines.filter((l) => l.trim());
        const all = nonEmpty.length && nonEmpty.every((l) => LIST_RE[kind].test(l));
        let n = 0;
        return lines.map((l) => {
          if (!l.trim()) return l;
          if (all) return l.replace(LIST_RE[kind], '$1');
          const m = l.match(ANY_LIST);
          const indent = m ? m[1] : (l.match(/^\s*/) || [''])[0];
          const body = m ? l.slice(m[0].length) : l.trimStart();
          n++;
          const marker = kind === 'ul' ? '- ' : kind === 'task' ? '- [ ] ' : n + '. ';
          return indent + marker + body;
        });
      });
    }

    function toggleQuote() {
      transformLines((lines) => {
        const all = lines.filter((l) => l.trim()).every((l) => /^\s*>/.test(l));
        return lines.map((l) => (all ? l.replace(/^(\s*)>\s?/, '$1') : '> ' + l));
      });
    }

    function insertBlock(text, selectFrom, selectLen) {
      const v = val();
      const s = ta.selectionStart, e = ta.selectionEnd;
      const before = v.slice(0, s), after = v.slice(e);
      const pre = !before || /\n\n$/.test(before) ? '' : before.endsWith('\n') ? '\n' : '\n\n';
      const post = !after ? '' : /^\n\n/.test(after) ? '' : after.startsWith('\n') ? '\n' : '\n\n';
      const block = text.replace(/\n$/, '');
      const ins = pre + block + post;
      const base = s + pre.length;
      if (selectFrom != null) replaceRange(s, e, ins, base + selectFrom, base + selectFrom + (selectLen || 0));
      else replaceRange(s, e, ins, base + block.length);
    }

    function codeBlock() {
      const sel = val().slice(ta.selectionStart, ta.selectionEnd);
      if (sel) insertBlock('```\n' + sel.replace(/\n$/, '') + '\n```', 3, 0);
      else insertBlock('```\n\n```', 4, 0);
    }

    function link(placeholderText) {
      const s = ta.selectionStart, e = ta.selectionEnd;
      const sel = val().slice(s, e);
      if (/^(https?:\/\/|mailto:)\S+$/i.test(sel)) {
        const t = placeholderText;
        replaceRange(s, e, '[' + t + '](' + sel + ')', s + 1, s + 1 + t.length);
      } else {
        const t = sel || placeholderText;
        const url = 'https://';
        const out = '[' + t + '](' + url + ')';
        replaceRange(s, e, out, s + t.length + 3, s + t.length + 3 + url.length);
      }
    }

    function image(alt) {
      const s = ta.selectionStart, e = ta.selectionEnd;
      const t = val().slice(s, e) || alt;
      const url = 'https://';
      replaceRange(s, e, '![' + t + '](' + url + ')', s + t.length + 4, s + t.length + 4 + url.length);
    }

    function footnote() {
      const v = val();
      let n = 1;
      const used = new Set();
      v.replace(/\[\^(\d+)\]/g, (_, d) => used.add(+d));
      while (used.has(n)) n++;
      const s = ta.selectionStart;
      const ref = '[^' + n + ']';
      replaceRange(s, ta.selectionEnd, ref);
      const v2 = val();
      const tail = (v2.endsWith('\n') ? (v2.endsWith('\n\n') ? '' : '\n') : '\n\n') + '[^' + n + ']: ';
      replaceRange(v2.length, v2.length, tail, v2.length + tail.length);
    }

    /* Enter: continue lists / quotes. Returns true if handled. */
    function handleEnter() {
      const s = ta.selectionStart;
      if (s !== ta.selectionEnd) return false;
      const v = val();
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      const line = v.slice(ls, s);
      const m = line.match(/^(\s*(?:>\s?)*)(\s*)([-*+]\s+\[[ xX]\]\s+|[-*+]\s+|(\d+)([.)])\s+)?/);
      if (!m || (!m[1].includes('>') && !m[3])) return false;
      // Don't continue inside fenced code
      const fences = (v.slice(0, ls).match(/^\s*(```|~~~)/gm) || []).length;
      if (fences % 2 === 1) return false;
      const rest = line.slice(m[0].length);
      if (!rest.trim() && v.slice(s, v.indexOf('\n', s) < 0 ? v.length : v.indexOf('\n', s)).trim() === '') {
        // empty item: end the list
        replaceRange(ls, s, '', ls);
        return true;
      }
      let marker = '';
      if (m[3]) {
        if (m[4]) marker = (parseInt(m[4], 10) + 1) + m[5] + ' ';
        else if (/\[[ xX]\]/.test(m[3])) marker = m[3].replace(/\[[ xX]\]/, '[ ]').replace(/\s+$/, ' ');
        else marker = m[3].replace(/\s+$/, ' ');
      }
      const ins = '\n' + m[1] + m[2] + marker;
      replaceRange(s, s, ins, s + ins.length);
      return true;
    }

    const INDENT = '    ';
    function indent(outdent) {
      const s = ta.selectionStart, e = ta.selectionEnd;
      const v = val();
      const multi = v.slice(s, e).includes('\n');
      const ls = v.lastIndexOf('\n', s - 1) + 1;
      const lineIsList = ANY_LIST.test(v.slice(ls, (v.indexOf('\n', ls) + 1 || v.length + 1) - 1));
      if (!multi && !outdent && !lineIsList) {
        replaceRange(s, e, INDENT, s + INDENT.length);
        return;
      }
      transformLines((lines) => lines.map((l) => {
        if (!outdent) return l.trim() ? INDENT + l : l;
        return l.replace(/^( {1,4}|\t)/, '');
      }));
    }

    /* ---- text measurement (for sync scroll & find) ---- */
    let mirror = null;
    const COPY = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'lineHeight', 'letterSpacing', 'wordSpacing', 'tabSize',
      'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'whiteSpace', 'overflowWrap', 'wordBreak', 'textIndent',
      'direction', 'unicodeBidi', 'textAlign', 'fontFeatureSettings', 'fontVariantLigatures', 'textTransform'];
    /** Returns the y offset (content coordinates) of each char index. */
    function offsetsOf(indices) {
      if (!mirror) {
        mirror = document.createElement('div');
        mirror.setAttribute('aria-hidden', 'true');
        mirror.style.cssText = 'position:absolute;visibility:hidden;top:0;left:-99999px;border:0;box-sizing:border-box;overflow:hidden;contain:layout style;';
        document.body.appendChild(mirror);
      }
      const cs = getComputedStyle(ta);
      for (const k of COPY) mirror.style[k] = cs[k];
      mirror.style.width = ta.clientWidth + 'px';
      mirror.setAttribute('dir', ta.getAttribute('dir') || 'ltr');
      const v = val();
      const frag = document.createDocumentFragment();
      const markers = [];
      let last = 0;
      const sorted = indices.map((i, k) => [i, k]).sort((a, b) => a[0] - b[0]);
      for (const [i] of sorted) {
        if (i > last) frag.appendChild(document.createTextNode(v.slice(last, i)));
        const sp = document.createElement('span');
        frag.appendChild(sp);
        markers.push(sp);
        last = Math.max(last, i);
      }
      frag.appendChild(document.createTextNode(v.slice(last) + '​'));
      mirror.replaceChildren(frag);
      const out = new Array(indices.length);
      sorted.forEach(([, k], j) => { out[k] = markers[j].offsetTop - parseFloat(cs.paddingTop); });
      mirror.replaceChildren();
      return out;
    }

    function cursorInfo() {
      const v = val(), s = ta.selectionStart;
      const before = v.slice(0, s);
      const line = (before.match(/\n/g) || []).length + 1;
      const col = s - before.lastIndexOf('\n');
      return { line, col, selected: Math.abs(ta.selectionEnd - s) };
    }

    return { replaceRange, wrap, setHeading, toggleList, toggleQuote, insertBlock, codeBlock, link, image, footnote, handleEnter, indent, offsetsOf, cursorInfo };
  }

  /* ---- Table formatter ---- */
  function cellWidth(str) {
    let w = 0;
    for (const ch of str) {
      const cp = ch.codePointAt(0);
      if (/\p{M}/u.test(ch) || cp === 0x200c || cp === 0x200d || cp === 0xfe0f) continue;
      if ((cp >= 0x1100 && cp <= 0x115f) || (cp >= 0x2e80 && cp <= 0xa4cf) || (cp >= 0xac00 && cp <= 0xd7a3) ||
        (cp >= 0xf900 && cp <= 0xfaff) || (cp >= 0xfe30 && cp <= 0xfe4f) || (cp >= 0xff00 && cp <= 0xff60) ||
        (cp >= 0xffe0 && cp <= 0xffe6) || (cp >= 0x1f300 && cp <= 0x1faff) || (cp >= 0x20000 && cp <= 0x3fffd)) w += 2;
      else w += 1;
    }
    return w;
  }
  function splitRow(line) {
    let s = line.trim();
    if (s.startsWith('|')) s = s.slice(1);
    if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1);
    const cells = [];
    let cur = '', inCode = false;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c === '\\' && s[i + 1] === '|') { cur += '\\|'; i++; continue; }
      if (c === '`') inCode = !inCode;
      if (c === '|' && !inCode) { cells.push(cur.trim()); cur = ''; continue; }
      cur += c;
    }
    cells.push(cur.trim());
    return cells;
  }
  const DELIM = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;

  function formatTables(src) {
    const lines = src.split('\n');
    let inFence = false, count = 0;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*(```|~~~)/.test(lines[i])) { inFence = !inFence; continue; }
      if (inFence) continue;
      if (i + 1 < lines.length && lines[i].includes('|') && DELIM.test(lines[i + 1]) && lines[i + 1].includes('-')) {
        let end = i + 2;
        while (end < lines.length && lines[end].includes('|') && lines[end].trim()) end++;
        const indent = (lines[i].match(/^\s*/) || [''])[0];
        const rows = [lines[i], ...lines.slice(i + 2, end)].map(splitRow);
        const aligns = splitRow(lines[i + 1]).map((c) => {
          const l = c.startsWith(':'), r = c.endsWith(':');
          return l && r ? 'c' : r ? 'r' : l ? 'l' : '';
        });
        const cols = Math.max(rows[0].length, aligns.length);
        const widths = new Array(cols).fill(3);
        rows.forEach((r) => { for (let c = 0; c < cols; c++) widths[c] = Math.max(widths[c], cellWidth(r[c] || '')); });
        const pad = (txt, w, a) => {
          const d = w - cellWidth(txt);
          if (a === 'r') return ' '.repeat(d) + txt;
          if (a === 'c') return ' '.repeat(Math.floor(d / 2)) + txt + ' '.repeat(Math.ceil(d / 2));
          return txt + ' '.repeat(d);
        };
        const fmt = (r) => indent + '| ' + Array.from({ length: cols }, (_, c) => pad(r[c] || '', widths[c], aligns[c])).join(' | ') + ' |';
        const delim = indent + '| ' + widths.map((w, c) => {
          const a = aligns[c];
          if (a === 'c') return ':' + '-'.repeat(w - 2) + ':';
          if (a === 'r') return '-'.repeat(w - 1) + ':';
          if (a === 'l') return ':' + '-'.repeat(w - 1);
          return '-'.repeat(w);
        }).join(' | ') + ' |';
        const out = [fmt(rows[0]), delim, ...rows.slice(1).map(fmt)];
        lines.splice(i, end - i, ...out);
        i += out.length - 1;
        count++;
      }
    }
    return { text: lines.join('\n'), count };
  }

  window.HamsooEditor = { create, formatTables };
})();
