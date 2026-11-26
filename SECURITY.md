# Security Policy

Hamsoo renders untrusted Markdown, so XSS issues are taken seriously.

**Please do not open a public issue for security problems.** Report them privately
through GitHub's "Report a vulnerability" button (Security → Advisories) on this repository.

Useful details: the Markdown input that triggers the issue, the browser and version,
and what happens (script execution, data leaving the page, etc.).

Scope: the sanitizer pipeline (DOMPurify config and hooks in `js/render.js`),
the Content-Security-Policy in `index.html` / `_headers`, Mermaid/KaTeX rendering,
HTML import and paste conversion, and HTML export.
