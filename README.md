# Hamsoo (همسو) — Private Markdown Studio

A fast, private Markdown editor and viewer that runs **entirely in the browser**.
It handles right-to-left text (Persian, Arabic, Hebrew), left-to-right text, and documents that mix both.

**Privacy:** there is no backend, no analytics, no cookies and no third-party requests. Every library and font is served from this folder. Documents are stored only in the visitor's browser (IndexedDB).

## Features

- **Automatic RTL/LTR per paragraph.** Each heading, paragraph, list item, quote and table cell gets its own direction. Code and math always stay LTR. You can also force RTL or LTR.
- Live split preview with scroll sync, a resizable splitter, and editor-only / preview-only views
- GitHub-flavored Markdown: tables, task lists (click to tick), strikethrough, footnotes, `> [!NOTE]` alerts
- Syntax highlighting (highlight.js), LaTeX math (KaTeX) and Mermaid diagrams. KaTeX and Mermaid load only when a document uses them.
- Open files with a button, drag & drop, or paste. `.html` files and rich text pasted from the web are converted to Markdown.
- Export to `.md`, `.docx`, `.html` (standalone), `.txt` or PDF (print); copy as Markdown, HTML or rich text
- **Save straight to the file on disk:** open a `.md` file and Ctrl+S writes back to it. Later edits are auto-saved to the file, and changes made in other apps are picked up. This uses the File System Access API (Chrome, Edge, Opera); other browsers fall back to downloading the file.
- **Large documents:** storage uses IndexedDB (hundreds of MB instead of about 5 MB). Documents from v1.0 are migrated automatically.
- **Editor with syntax colouring and line numbers.** Lines are re-coloured incrementally, so it stays fast on large files. Both can be turned off in Settings.
- **Word export (.docx)** with right-to-left paragraphs, runs and tables, lists, links, code, embedded images and Mermaid diagrams
- Multiple documents with autosave, an outline (TOC), find & replace (with regex), a table formatter, focus mode, and word/character/reading-time stats
- Light, dark or system theme; UI in English, Persian, Arabic and German; installable PWA that works offline

## Security

- All rendered HTML goes through **DOMPurify**. `script`, `iframe`, `form`, `style`, event handlers and `javascript:` URLs are removed.
- A strict **Content-Security-Policy** (`script-src 'self'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`, `frame-src 'none'`) blocks inline scripts even if sanitizing ever fails.
- Mermaid runs with `securityLevel: 'strict'`, and its SVG output is sanitized again. KaTeX runs with `trust: false`.
- Links open with `rel="noopener noreferrer"`, and `Referrer-Policy: no-referrer` is set everywhere.
- Remote images can be switched off in Settings. When they are off, no request is made to third-party hosts.
- `connect-src 'self'`: the page cannot send data to any other server.

## Deploy

The site is fully static, with no build step. Upload the folder as-is to any static host:

- **Netlify / Cloudflare Pages:** drag the folder in. `_headers` adds the security headers, including `frame-ancestors`.
- **GitHub Pages / Vercel / any web server:** works as-is. The CSP is also set with a `<meta>` tag.

To run it locally: `python3 -m http.server 8080`, then open http://localhost:8080.
Opening `index.html` directly with `file://` also works, but the offline service worker only runs over http(s).

## License

Hamsoo is released under the [MIT License](LICENSE). To report a vulnerability, see [SECURITY.md](SECURITY.md).

## Third-party libraries (bundled in `vendor/` and `fonts/`)

Full license texts are in [`vendor/licenses/`](vendor/licenses/). `vendor/marked-footnote.js` has one small local patch: a null-check, so that a footnote reference with no definition doesn't crash rendering.

| Library | Version | License |
|---|---|---|
| marked | 12.0.2 | MIT |
| marked-footnote | 1.2.2 | MIT |
| DOMPurify | 3.2.6 | Apache-2.0 / MPL-2.0 |
| highlight.js | 11.9.0 | BSD-3-Clause |
| KaTeX | 0.16.11 | MIT |
| Mermaid | 10.9.3 | MIT |
| Turndown + GFM plugin | 7.1.3 / 1.0.2 | MIT |
| docx | 8.5.0 | MIT |
| Vazirmatn font | 33.0.3 | OFL-1.1 |
