/* Hamsoo — export the rendered preview to a Word document (.docx), entirely in the browser.
 * Right-to-left paragraphs, runs and tables are marked as such so Word lays them out correctly.
 * Loaded on demand; depends on vendor/docx.min.js (global `docx`). */
(function () {
  'use strict';

  const RTL_CHARS = /[֐-ࣿיִ-﷿ﹰ-﻿]/;
  const BLOCK_TAGS = new Set(['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'UL', 'OL', 'PRE', 'BLOCKQUOTE', 'TABLE', 'HR', 'DIV', 'SECTION', 'DETAILS', 'DL', 'FIGURE']);
  const MONO = 'Consolas';
  const BODY_FONT = { ascii: 'Calibri', hAnsi: 'Calibri', cs: 'Tahoma', eastAsia: 'Calibri' };
  const MAX_IMG_W = 600; // px (≈ page width at 96dpi)

  async function exportDocx(root, opts) {
    const D = window.docx;
    const ctxBase = { D, images: opts.images || new Map(), olInstance: 0 };

    const isRtl = (el) => {
      const d = el && el.closest && el.closest('[dir]');
      return !!d && d.getAttribute('dir') === 'rtl';
    };

    /* ---------- inline content → runs ---------- */
    function textRun(text, f) {
      const o = {
        text, font: f.code ? { ascii: MONO, hAnsi: MONO, cs: MONO } : undefined,
        bold: f.bold || undefined, boldComplexScript: f.bold || undefined,
        italics: f.italics || undefined, italicsComplexScript: f.italics || undefined,
        strike: f.strike || undefined, superScript: f.sup || undefined, subScript: f.sub || undefined,
        highlight: f.mark ? 'yellow' : undefined, rightToLeft: RTL_CHARS.test(text) || undefined,
        style: f.link ? 'Hyperlink' : undefined, color: f.color || undefined,
        size: f.code ? 19 : undefined, sizeComplexScript: f.code ? 19 : undefined
      };
      if (f.code) o.shading = { type: D.ShadingType.CLEAR, fill: 'F1F2F6', color: 'auto' };
      return new D.TextRun(o);
    }

    function collectInline(node, f, out, pre) {
      for (const n of node.childNodes) {
        if (n.nodeType === 3) {
          let text = n.nodeValue;
          if (!pre) text = text.replace(/[\s\n]+/g, ' ');
          if (text) out.push({ text, f });
          continue;
        }
        if (n.nodeType !== 1) continue;
        const tag = n.tagName;
        if (BLOCK_TAGS.has(tag) && !n.classList.contains('math-inline')) continue; // handled by block walker
        if (n.classList.contains('copy-code') || n.classList.contains('sr-only')) continue;
        if (n.classList.contains('katex') || n.classList.contains('math-inline')) {
          const ann = n.querySelector('annotation[encoding="application/x-tex"]');
          out.push({ text: ann ? ann.textContent : n.textContent, f: Object.assign({}, f, { italics: true, color: '5B21B6' }) });
          continue;
        }
        if (tag === 'BR') { out.push({ br: true }); continue; }
        if (tag === 'IMG') { out.push({ img: n }); continue; }
        if (tag === 'INPUT' && n.type === 'checkbox') { out.push({ text: n.checked ? '☑ ' : '☐ ', f }); continue; }
        const g = Object.assign({}, f);
        if (tag === 'STRONG' || tag === 'B') g.bold = true;
        if (tag === 'EM' || tag === 'I') g.italics = true;
        if (tag === 'DEL' || tag === 'S' || tag === 'STRIKE') g.strike = true;
        if (tag === 'CODE' || tag === 'KBD' || tag === 'SAMP') g.code = true;
        if (tag === 'SUP') g.sup = true;
        if (tag === 'SUB') g.sub = true;
        if (tag === 'MARK') g.mark = true;
        if (tag === 'A') {
          const href = n.getAttribute('href') || '';
          if (/^(https?:|mailto:)/i.test(href)) { g.link = href; }
        }
        collectInline(n, g, out, pre);
      }
      return out;
    }

    async function runsFrom(items) {
      const runs = [];
      // trim leading/trailing whitespace of the paragraph
      while (items.length && items[0].text != null && !items[0].text.trim()) items.shift();
      if (items.length && items[0].text != null) items[0] = Object.assign({}, items[0], { text: items[0].text.replace(/^\s+/, '') });
      const last = items.length - 1;
      if (last >= 0 && items[last].text != null) items[last] = Object.assign({}, items[last], { text: items[last].text.replace(/\s+$/, '') });

      let i = 0;
      while (i < items.length) {
        const it = items[i];
        if (it.br) { runs.push(new D.TextRun({ text: '', break: 1 })); i++; continue; }
        if (it.img) { runs.push(await imageRun(it.img)); i++; continue; }
        if (it.f.link) {
          // group consecutive pieces of the same link into one hyperlink
          const link = it.f.link, children = [];
          while (i < items.length && items[i].f && items[i].f.link === link) { children.push(textRun(items[i].text, items[i].f)); i++; }
          runs.push(new D.ExternalHyperlink({ link, children }));
          continue;
        }
        if (it.text) runs.push(textRun(it.text, it.f));
        i++;
      }
      return runs;
    }

    /* ---------- images ---------- */
    function dataUrlBytes(url) {
      const m = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(url);
      if (!m) return null;
      if (m[2]) {
        const bin = atob(m[3]);
        const u = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        return { type: m[1] || '', bytes: u };
      }
      return { type: m[1] || '', bytes: new TextEncoder().encode(decodeURIComponent(m[3])) };
    }
    function loadImage(src) {
      return new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(im);
        im.onerror = reject;
        im.src = src;
      });
    }
    async function rasterize(src, w, h) {
      const im = await loadImage(src);
      const width = w || im.naturalWidth || 600, height = h || im.naturalHeight || 400;
      const c = document.createElement('canvas');
      const scale = 2;
      c.width = Math.round(width * scale); c.height = Math.round(height * scale);
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(im, 0, 0, c.width, c.height);
      const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
      return { bytes: new Uint8Array(await blob.arrayBuffer()), width, height };
    }
    function fit(w, h) {
      if (!w || !h) return { width: 400, height: 300 };
      if (w > MAX_IMG_W) { h = Math.round(h * MAX_IMG_W / w); w = MAX_IMG_W; }
      return { width: Math.round(w), height: Math.round(h) };
    }
    async function imageRun(img) {
      const src = img.getAttribute('src') || img.getAttribute('data-blocked-src') || '';
      const alt = img.getAttribute('alt') || 'image';
      try {
        if (/^data:image\//i.test(src)) {
          const d = dataUrlBytes(src);
          const w = img.naturalWidth, h = img.naturalHeight;
          if (/png|jpe?g|gif|bmp/i.test(d.type)) return new D.ImageRun({ data: d.bytes, transformation: fit(w, h) });
          const r = await rasterize(src, w, h);
          return new D.ImageRun({ data: r.bytes, transformation: fit(r.width, r.height) });
        }
      } catch (e) { /* fall through to link */ }
      // Remote images are not downloaded (no network access); keep a link instead.
      if (/^https?:/i.test(src)) {
        return new D.ExternalHyperlink({ link: src, children: [new D.TextRun({ text: '[' + alt + ']', style: 'Hyperlink' })] });
      }
      return new D.TextRun({ text: '[' + alt + ']', italics: true });
    }
    async function svgRun(svg) {
      const r = svg.getBoundingClientRect();
      const vb = svg.viewBox && svg.viewBox.baseVal;
      const w = r.width || (vb && vb.width) || 600, h = r.height || (vb && vb.height) || 400;
      const clone = svg.cloneNode(true);
      clone.setAttribute('width', w); clone.setAttribute('height', h);
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      const xml = new XMLSerializer().serializeToString(clone);
      const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
      try {
        const out = await rasterize(url, w, h);
        return new D.ImageRun({ data: out.bytes, transformation: fit(out.width, out.height) });
      } finally { URL.revokeObjectURL(url); }
    }

    /* ---------- blocks ---------- */
    function para(children, el, extra) {
      const rtl = isRtl(el);
      // Explicit start alignment: some renderers ignore the implicit alignment of bidi paragraphs.
      return new D.Paragraph(Object.assign({ children, bidirectional: rtl || undefined, alignment: rtl ? D.AlignmentType.START : undefined }, extra || {}));
    }
    const QUOTE = (color) => ({
      indent: { left: 400 },
      border: { left: { style: D.BorderStyle.SINGLE, size: 18, color: color || '6366F1', space: 10 } },
      shading: { type: D.ShadingType.CLEAR, fill: 'F5F5FF', color: 'auto' }
    });

    async function walk(container, ctx) {
      const out = [];
      let loose = [];
      const flushLoose = async () => {
        if (!loose.length) return;
        const items = [];
        for (const n of loose) {
          if (n.nodeType === 3) { const tx = n.nodeValue.replace(/\s+/g, ' '); if (tx.trim()) items.push({ text: tx, f: {} }); }
          else collectInline({ childNodes: [n] }, {}, items, false);
        }
        loose = [];
        if (items.some((x) => x.img || x.br || (x.text && x.text.trim()))) out.push(para(await runsFrom(items), container, ctx.pextra));
      };
      for (const n of Array.from(container.childNodes)) {
        if (n.nodeType === 3 || (n.nodeType === 1 && !BLOCK_TAGS.has(n.tagName))) { loose.push(n); continue; }
        if (n.nodeType !== 1) continue;
        await flushLoose();
        out.push(...await block(n, ctx));
      }
      await flushLoose();
      return out;
    }

    async function block(el, ctx) {
      const tag = el.tagName;
      const pextra = ctx.pextra || {};
      if (/^H[1-6]$/.test(tag)) {
        const lvl = +tag[1];
        return [para(await runsFrom(collectInline(el, {}, [], false)), el, { heading: D.HeadingLevel['HEADING_' + lvl] })];
      }
      if (tag === 'P') {
        const runs = await runsFrom(collectInline(el, {}, [], false));
        return runs.length ? [para(runs, el, pextra)] : [];
      }
      if (tag === 'HR') {
        return [new D.Paragraph({ children: [], border: { bottom: { style: D.BorderStyle.SINGLE, size: 6, color: 'D0D4DE', space: 1 } }, spacing: { after: 200 } })];
      }
      if (tag === 'PRE') {
        const code = el.querySelector('code') || el;
        const lines = code.textContent.replace(/\n$/, '').split('\n');
        return lines.map((ln, i) => new D.Paragraph({
          children: [new D.TextRun({ text: ln || ' ', font: { ascii: MONO, hAnsi: MONO, cs: MONO }, size: 19, sizeComplexScript: 19 })],
          shading: { type: D.ShadingType.CLEAR, fill: 'F6F7FB', color: 'auto' },
          spacing: { before: i === 0 ? 120 : 0, after: i === lines.length - 1 ? 160 : 0, line: 260 },
          indent: ctx.pextra && ctx.pextra.indent ? ctx.pextra.indent : undefined
        }));
      }
      if (tag === 'BLOCKQUOTE') return walk(el, Object.assign({}, ctx, { pextra: QUOTE() }));
      if (el.classList.contains('md-alert')) {
        const colors = { note: '3B82F6', tip: '16A34A', important: '8B5CF6', warning: 'D97706', caution: 'DC2626' };
        const kind = (Array.from(el.classList).find((c) => c.startsWith('md-alert-')) || '').slice(9);
        return walk(el, Object.assign({}, ctx, { pextra: QUOTE(colors[kind]) }));
      }
      if (el.classList.contains('math-block')) {
        const ann = el.querySelector('annotation[encoding="application/x-tex"]');
        const tex = ann ? ann.textContent : el.textContent;
        return [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [new D.TextRun({ text: tex, italics: true, color: '5B21B6', font: { ascii: 'Cambria Math', hAnsi: 'Cambria Math' } })] })];
      }
      if (el.classList.contains('mermaid-block')) {
        const svg = el.querySelector('svg');
        if (svg) {
          try { return [new D.Paragraph({ alignment: D.AlignmentType.CENTER, children: [await svgRun(svg)] })]; } catch (e) { /* fall back to source */ }
        }
        const pre = el.querySelector('pre');
        return pre ? block(pre, ctx) : [];
      }
      if (tag === 'UL' || tag === 'OL') return list(el, ctx, 0);
      if (tag === 'TABLE') return [await table(el)];
      if (tag === 'DETAILS') {
        const sum = el.querySelector(':scope > summary');
        const out = sum ? [para(await runsFrom(collectInline(sum, { bold: true }, [], false)), sum)] : [];
        const clone = el.cloneNode(true);
        const s2 = clone.querySelector(':scope > summary'); if (s2) s2.remove();
        return out.concat(await walk(clone, ctx));
      }
      if (tag === 'DL') {
        const out = [];
        for (const c of el.children) {
          if (c.tagName === 'DT') out.push(para(await runsFrom(collectInline(c, { bold: true }, [], false)), c));
          else if (c.tagName === 'DD') out.push(...await walk(c, Object.assign({}, ctx, { pextra: { indent: { left: 567 } } })));
        }
        return out;
      }
      if (tag === 'SECTION' && el.classList.contains('footnotes')) {
        const out = [new D.Paragraph({ children: [], border: { top: { style: D.BorderStyle.SINGLE, size: 6, color: 'D0D4DE', space: 4 } } })];
        const ol = el.querySelector('ol');
        if (ol) out.push(...await list(ol, ctx, 0, true));
        return out;
      }
      if (el.classList.contains('preview-empty')) return [];
      return walk(el, ctx); // generic container
    }

    async function list(el, ctx, level, small) {
      const ordered = el.tagName === 'OL';
      const instance = ordered ? ++ctxBase.olInstance : 0;
      const out = [];
      for (const li of el.children) {
        if (li.tagName !== 'LI') continue;
        const isTask = !!li.querySelector(':scope > input[type="checkbox"], :scope > p > input[type="checkbox"]');
        // inline content directly in <li> (tight lists) or its first <p>
        const items = [];
        let rest = [];
        let firstP = null;
        for (const c of li.childNodes) {
          if (c.nodeType === 1 && (c.tagName === 'UL' || c.tagName === 'OL' || c.tagName === 'PRE' || c.tagName === 'BLOCKQUOTE' || c.tagName === 'TABLE' || c.tagName === 'DIV')) { rest.push(c); continue; }
          if (c.nodeType === 1 && c.tagName === 'P') { if (!firstP && !items.length) { firstP = c; collectInline(c, {}, items, false); } else rest.push(c); continue; }
          if (c.nodeType === 1) collectInline({ childNodes: [c] }, {}, items, false);
          else if (c.nodeType === 3) { const tx = c.nodeValue.replace(/\s+/g, ' '); if (tx.trim()) items.push({ text: tx, f: {} }); }
        }
        const runs = await runsFrom(items);
        const extra = isTask
          ? { indent: { left: 360 * (level + 1) } }
          : { numbering: ordered ? { reference: 'ol', level: Math.min(level, 8), instance } : { reference: 'ul', level: Math.min(level, 8) } };
        if (small) runs.forEach((r) => r);
        out.push(para(runs, li, extra));
        for (const c of rest) {
          if (c.tagName === 'UL' || c.tagName === 'OL') out.push(...await list(c, ctx, level + 1, small));
          else out.push(...await block(c, Object.assign({}, ctx, { pextra: { indent: { left: 720 * (level + 1) } } })));
        }
      }
      return out;
    }

    const CONTENT_W = 9900; // twips between page margins
    async function table(el) {
      const rtl = isRtl(el);
      const rows = [];
      const trs = Array.from(el.querySelectorAll('tr'));
      const nCols = Math.max(1, ...trs.map((tr) => tr.children.length));
      // Column widths proportional to the longest text in each column (min share so short columns stay readable).
      const longest = new Array(nCols).fill(4);
      trs.forEach((tr) => Array.from(tr.children).forEach((td, i) => { longest[i] = Math.max(longest[i], Math.min(60, td.textContent.trim().length)); }));
      const total = longest.reduce((a, b) => a + b, 0);
      const colW = longest.map((l) => Math.max(900, Math.round(CONTENT_W * l / total)));
      const scale = CONTENT_W / colW.reduce((a, b) => a + b, 0);
      for (let i = 0; i < nCols; i++) colW[i] = Math.floor(colW[i] * scale);
      for (const tr of trs) {
        const cells = [];
        let ci = 0;
        for (const td of tr.children) {
          const w = colW[ci++] || colW[colW.length - 1];
          const header = td.tagName === 'TH';
          const align = (td.getAttribute('align') || '').toLowerCase();
          const runs = await runsFrom(collectInline(td, header ? { bold: true } : {}, [], false));
          const cellRtl = isRtl(td);
          cells.push(new D.TableCell({
            width: { size: w, type: D.WidthType.DXA },
            children: [new D.Paragraph({
              children: runs, bidirectional: cellRtl || undefined,
              alignment: align === 'center' ? D.AlignmentType.CENTER : cellRtl ? D.AlignmentType.START : undefined
            })],
            shading: header ? { type: D.ShadingType.CLEAR, fill: 'F3F4FA', color: 'auto' } : undefined,
            margins: { top: 60, bottom: 60, left: 100, right: 100 }
          }));
        }
        if (cells.length) rows.push(new D.TableRow({ children: cells, tableHeader: tr.parentElement.tagName === 'THEAD' || undefined }));
      }
      return new D.Table({ rows, columnWidths: colW, width: { size: colW.reduce((a, b) => a + b, 0), type: D.WidthType.DXA }, visuallyRightToLeft: rtl || undefined });
    }

    /* ---------- document ---------- */
    const children = await walk(root, {});
    const lvl = (format, textFn) => Array.from({ length: 9 }, (_, i) => ({
      level: i, format, text: textFn(i), alignment: D.AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 540 + i * 420, hanging: 300 } } }
    }));
    const bullets = ['•', '◦', '▪'];
    const docRtl = (root.getAttribute('dir') || '') === 'rtl';
    const doc = new D.Document({
      creator: 'Hamsoo',
      title: opts.title || 'Document',
      styles: {
        default: {
          document: { run: { font: BODY_FONT, size: 22, sizeComplexScript: 22 }, paragraph: { spacing: { after: 120, line: 300 } } },
          heading1: { run: { size: 36, sizeComplexScript: 36, bold: true, boldComplexScript: true, color: '111827' }, paragraph: { spacing: { before: 360, after: 160 } } },
          heading2: { run: { size: 30, sizeComplexScript: 30, bold: true, boldComplexScript: true, color: '111827' }, paragraph: { spacing: { before: 300, after: 120 } } },
          heading3: { run: { size: 26, sizeComplexScript: 26, bold: true, boldComplexScript: true, color: '1F2430' }, paragraph: { spacing: { before: 240, after: 100 } } },
          heading4: { run: { size: 24, sizeComplexScript: 24, bold: true, boldComplexScript: true, color: '1F2430' } },
          heading5: { run: { size: 22, sizeComplexScript: 22, bold: true, boldComplexScript: true, color: '1F2430' } },
          heading6: { run: { size: 22, sizeComplexScript: 22, bold: true, boldComplexScript: true, color: '667085' } },
          hyperlink: { run: { color: '4F46E5', underline: { type: 'single' } } }
        }
      },
      numbering: {
        config: [
          { reference: 'ul', levels: lvl(D.LevelFormat.BULLET, (i) => bullets[i % 3]) },
          { reference: 'ol', levels: lvl(D.LevelFormat.DECIMAL, (i) => '%' + (i + 1) + '.') }
        ]
      },
      sections: [{
        properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } }, bidi: docRtl || undefined },
        children: children.length ? children : [new D.Paragraph('')]
      }]
    });
    return D.Packer.toBlob(doc);
  }

  window.HamsooDocx = { exportDocx };
})();
