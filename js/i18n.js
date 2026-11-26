/* Hamsoo — UI strings (English / Persian / Arabic / German) */
(function () {
  'use strict';
  const STR = {
    en: {
      tagline: 'Private Markdown studio',
      new: 'New', open: 'Open', docs: 'Documents', export: 'Export',
      viewEditor: 'Editor', viewSplit: 'Split', viewPreview: 'Preview',
      direction: 'Text direction', dirAuto: 'Auto (per paragraph)', dirRtl: 'Right to left', dirLtr: 'Left to right',
      theme: 'Theme', themeSystem: 'System', themeLight: 'Light', themeDark: 'Dark',
      language: 'Language', settings: 'Settings', help: 'Help & shortcuts',
      bold: 'Bold', italic: 'Italic', strike: 'Strikethrough', heading: 'Heading', h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3',
      quote: 'Quote', code: 'Inline code', codeblock: 'Code block', link: 'Link', image: 'Image',
      ul: 'Bulleted list', ol: 'Numbered list', task: 'Task list', table: 'Table', hr: 'Divider',
      math: 'Math formula', mermaid: 'Diagram', footnote: 'Footnote',
      undo: 'Undo', redo: 'Redo', toc: 'Outline', find: 'Find & replace', focus: 'Focus mode', formatTables: 'Format tables',
      syncScroll: 'Sync scroll',
      exportMd: 'Markdown file (.md)', exportHtml: 'HTML page (.html)', exportPdf: 'PDF / Print', exportTxt: 'Plain text (.txt)',
      copyMd: 'Copy Markdown', copyHtml: 'Copy HTML source', copyRich: 'Copy as rich text',
      words: 'words', chars: 'characters', lines: 'lines', minRead: 'min read', ln: 'Ln', col: 'Col',
      saved: 'Saved locally', saving: 'Saving…', localOnly: '100% in your browser',
      outline: 'Outline', noHeadings: 'No headings yet',
      findPh: 'Find', replacePh: 'Replace', replace: 'Replace', replaceAll: 'All', matchCase: 'Match case', regex: 'Regex', close: 'Close', noMatch: 'No results', of: 'of',
      dropHint: 'Drop your file to open it', dropSub: '.md · .markdown · .txt · .html — nothing leaves your device',
      docsTitle: 'Your documents', docsHint: 'Stored only in this browser (localStorage).', untitled: 'Untitled', delete: 'Delete', openDoc: 'Open', duplicate: 'Duplicate', current: 'Current',
      deleteConfirm: 'Delete this document? This cannot be undone.', clearAll: 'Delete all', clearAllConfirm: 'Delete ALL documents stored in this browser?',
      settingsTitle: 'Settings', fontSize: 'Editor font size', previewSize: 'Preview font size', editorFont: 'Editor font', fontMono: 'Monospace', fontSans: 'Sans-serif',
      breaks: 'Treat single line breaks as <br>', remoteImages: 'Load remote images', remoteImagesHint: 'When off, images from the internet are not loaded (better privacy).',
      smartPaste: 'Convert pasted web content to Markdown', spellcheck: 'Spell check in editor', lineWrap: 'Wrap long lines', previewWidth: 'Limit preview width', autosave: 'Autosave',
      privacyNote: 'Hamsoo works fully offline. Your text never leaves this device: no servers, no tracking, no cookies.',
      helpTitle: 'Help & shortcuts', shortcuts: 'Keyboard shortcuts', features: 'What you can do',
      imageBlocked: 'Remote image blocked — click to load', copied: 'Copied!', copy: 'Copy', copyFailed: 'Copy failed',
      opened: 'Opened', fileTooBig: 'File is too large (max 10 MB)', unsupported: 'Unsupported file type', newDoc: 'New document created',
      deleted: 'Document deleted', tablesFormatted: 'Tables formatted', noTables: 'No tables found', pastedConverted: 'Pasted content converted to Markdown',
      storageFull: 'Browser storage is full — export your work!', installApp: 'Install app', replacedN: 'Replaced {n}',
      mathError: 'Formula error', diagramError: 'Diagram error', loading: 'Loading…',
      welcomeName: 'welcome.md',
      phBold: 'bold text', phItalic: 'italic text', phStrike: 'strikethrough', phLink: 'link text', phAlt: 'alt text',
      tCol: 'Column', tCell: 'Cell', mmStart: 'Start', mmDecide: 'Decide', mmYes: 'Yes', mmNo: 'No',
      emptyPreview: 'Nothing to preview yet — start typing or drop a file.', imageTooBig: 'Image is too large (max 2 MB)'
    },
    fa: {
      tagline: 'استودیوی خصوصی مارک‌داون',
      new: 'جدید', open: 'باز کردن', docs: 'اسناد', export: 'خروجی',
      viewEditor: 'ویرایشگر', viewSplit: 'دوبخشی', viewPreview: 'پیش‌نمایش',
      direction: 'جهت متن', dirAuto: 'خودکار (هر پاراگراف)', dirRtl: 'راست به چپ', dirLtr: 'چپ به راست',
      theme: 'پوسته', themeSystem: 'سیستم', themeLight: 'روشن', themeDark: 'تیره',
      language: 'زبان', settings: 'تنظیمات', help: 'راهنما و میانبرها',
      bold: 'پررنگ', italic: 'مورب', strike: 'خط‌خورده', heading: 'تیتر', h1: 'تیتر ۱', h2: 'تیتر ۲', h3: 'تیتر ۳',
      quote: 'نقل‌قول', code: 'کد درون‌خطی', codeblock: 'بلوک کد', link: 'پیوند', image: 'تصویر',
      ul: 'فهرست نشانه‌دار', ol: 'فهرست شماره‌دار', task: 'فهرست کارها', table: 'جدول', hr: 'خط جداکننده',
      math: 'فرمول ریاضی', mermaid: 'نمودار', footnote: 'پانویس',
      undo: 'واگرد', redo: 'ازنو', toc: 'سرفصل‌ها', find: 'جستجو و جایگزینی', focus: 'حالت تمرکز', formatTables: 'مرتب‌سازی جدول‌ها',
      syncScroll: 'اسکرول همزمان',
      exportMd: 'فایل مارک‌داون (.md)', exportHtml: 'صفحه HTML', exportPdf: 'PDF / چاپ', exportTxt: 'متن ساده (.txt)',
      copyMd: 'کپی مارک‌داون', copyHtml: 'کپی کد HTML', copyRich: 'کپی متن قالب‌دار',
      words: 'کلمه', chars: 'نویسه', lines: 'خط', minRead: 'دقیقه مطالعه', ln: 'خط', col: 'ستون',
      saved: 'ذخیره در مرورگر', saving: 'در حال ذخیره…', localOnly: '۱۰۰٪ داخل مرورگر شما',
      outline: 'سرفصل‌ها', noHeadings: 'هنوز تیتری نیست',
      findPh: 'جستجو', replacePh: 'جایگزین', replace: 'جایگزینی', replaceAll: 'همه', matchCase: 'حساس به حروف', regex: 'عبارت باقاعده', close: 'بستن', noMatch: 'یافت نشد', of: 'از',
      dropHint: 'فایل را رها کنید تا باز شود', dropSub: '.md · .markdown · .txt · .html — چیزی از دستگاه شما خارج نمی‌شود',
      docsTitle: 'اسناد شما', docsHint: 'فقط در همین مرورگر ذخیره می‌شوند.', untitled: 'بی‌نام', delete: 'حذف', openDoc: 'باز کردن', duplicate: 'رونوشت', current: 'فعلی',
      deleteConfirm: 'این سند حذف شود؟ قابل بازگشت نیست.', clearAll: 'حذف همه', clearAllConfirm: 'همه اسناد ذخیره‌شده در این مرورگر حذف شوند؟',
      settingsTitle: 'تنظیمات', fontSize: 'اندازه قلم ویرایشگر', previewSize: 'اندازه قلم پیش‌نمایش', editorFont: 'قلم ویرایشگر', fontMono: 'هم‌عرض', fontSans: 'معمولی',
      breaks: 'هر شکستن خط = خط جدید (<br>)', remoteImages: 'بارگذاری تصاویر اینترنتی', remoteImagesHint: 'در حالت خاموش، تصاویر اینترنتی بارگذاری نمی‌شوند (حریم خصوصی بیشتر).',
      smartPaste: 'تبدیل محتوای کپی‌شده از وب به مارک‌داون', spellcheck: 'غلط‌یاب املایی', lineWrap: 'شکستن خطوط بلند', previewWidth: 'محدود کردن عرض پیش‌نمایش', autosave: 'ذخیره خودکار',
      privacyNote: 'همسو کاملاً آفلاین کار می‌کند. نوشته‌های شما هرگز از این دستگاه خارج نمی‌شوند: بدون سرور، بدون ردیابی، بدون کوکی.',
      helpTitle: 'راهنما و میانبرها', shortcuts: 'میانبرهای صفحه‌کلید', features: 'امکانات',
      imageBlocked: 'تصویر اینترنتی مسدود شد — برای نمایش کلیک کنید', copied: 'کپی شد!', copy: 'کپی', copyFailed: 'کپی انجام نشد',
      opened: 'باز شد', fileTooBig: 'فایل خیلی بزرگ است (حداکثر ۱۰ مگابایت)', unsupported: 'نوع فایل پشتیبانی نمی‌شود', newDoc: 'سند جدید ساخته شد',
      deleted: 'سند حذف شد', tablesFormatted: 'جدول‌ها مرتب شدند', noTables: 'جدولی پیدا نشد', pastedConverted: 'محتوای کپی‌شده به مارک‌داون تبدیل شد',
      storageFull: 'فضای مرورگر پر است — از کارتان خروجی بگیرید!', installApp: 'نصب برنامه', replacedN: '{n} مورد جایگزین شد',
      mathError: 'خطای فرمول', diagramError: 'خطای نمودار', loading: 'در حال بارگذاری…',
      welcomeName: 'خوش‌آمد.md',
      phBold: 'متن پررنگ', phItalic: 'متن مورب', phStrike: 'متن خط‌خورده', phLink: 'متن پیوند', phAlt: 'توضیح تصویر',
      tCol: 'ستون', tCell: 'خانه', mmStart: 'شروع', mmDecide: 'تصمیم', mmYes: 'بله', mmNo: 'خیر',
      emptyPreview: 'چیزی برای نمایش نیست — شروع به نوشتن کنید یا فایلی را رها کنید.', imageTooBig: 'تصویر خیلی بزرگ است (حداکثر ۲ مگابایت)'
    },
    ar: {
      tagline: 'استوديو ماركداون خاص',
      new: 'جديد', open: 'فتح', docs: 'المستندات', export: 'تصدير',
      viewEditor: 'المحرر', viewSplit: 'مقسوم', viewPreview: 'معاينة',
      direction: 'اتجاه النص', dirAuto: 'تلقائي (لكل فقرة)', dirRtl: 'من اليمين إلى اليسار', dirLtr: 'من اليسار إلى اليمين',
      theme: 'المظهر', themeSystem: 'النظام', themeLight: 'فاتح', themeDark: 'داكن',
      language: 'اللغة', settings: 'الإعدادات', help: 'المساعدة والاختصارات',
      bold: 'عريض', italic: 'مائل', strike: 'يتوسطه خط', heading: 'عنوان', h1: 'عنوان 1', h2: 'عنوان 2', h3: 'عنوان 3',
      quote: 'اقتباس', code: 'كود سطري', codeblock: 'كتلة كود', link: 'رابط', image: 'صورة',
      ul: 'قائمة نقطية', ol: 'قائمة مرقمة', task: 'قائمة مهام', table: 'جدول', hr: 'خط فاصل',
      math: 'معادلة رياضية', mermaid: 'مخطط', footnote: 'حاشية',
      undo: 'تراجع', redo: 'إعادة', toc: 'العناوين', find: 'بحث واستبدال', focus: 'وضع التركيز', formatTables: 'تنسيق الجداول',
      syncScroll: 'تمرير متزامن',
      exportMd: 'ملف ماركداون (.md)', exportHtml: 'صفحة HTML', exportPdf: 'PDF / طباعة', exportTxt: 'نص عادي (.txt)',
      copyMd: 'نسخ الماركداون', copyHtml: 'نسخ كود HTML', copyRich: 'نسخ كنص منسّق',
      words: 'كلمة', chars: 'حرف', lines: 'سطر', minRead: 'دقيقة قراءة', ln: 'سطر', col: 'عمود',
      saved: 'محفوظ في المتصفح', saving: 'جارٍ الحفظ…', localOnly: '100% داخل متصفحك',
      outline: 'العناوين', noHeadings: 'لا توجد عناوين بعد',
      findPh: 'بحث', replacePh: 'استبدال', replace: 'استبدال', replaceAll: 'الكل', matchCase: 'مطابقة حالة الأحرف', regex: 'تعبير نمطي', close: 'إغلاق', noMatch: 'لا توجد نتائج', of: 'من',
      dropHint: 'أفلِت الملف لفتحه', dropSub: '.md · .markdown · .txt · .html — لا شيء يغادر جهازك',
      docsTitle: 'مستنداتك', docsHint: 'محفوظة في هذا المتصفح فقط.', untitled: 'بدون عنوان', delete: 'حذف', openDoc: 'فتح', duplicate: 'نسخة مكررة', current: 'الحالي',
      deleteConfirm: 'حذف هذا المستند؟ لا يمكن التراجع عن ذلك.', clearAll: 'حذف الكل', clearAllConfirm: 'حذف جميع المستندات المحفوظة في هذا المتصفح؟',
      settingsTitle: 'الإعدادات', fontSize: 'حجم خط المحرر', previewSize: 'حجم خط المعاينة', editorFont: 'خط المحرر', fontMono: 'ثابت العرض', fontSans: 'عادي',
      breaks: 'اعتبار كل سطر جديد فاصل أسطر (<br>)', remoteImages: 'تحميل الصور من الإنترنت', remoteImagesHint: 'عند الإيقاف لا تُحمَّل الصور من الإنترنت (خصوصية أكبر).',
      smartPaste: 'تحويل المحتوى الملصق من الويب إلى ماركداون', spellcheck: 'التدقيق الإملائي في المحرر', lineWrap: 'التفاف الأسطر الطويلة', previewWidth: 'تحديد عرض المعاينة', autosave: 'حفظ تلقائي',
      privacyNote: 'يعمل همسو دون اتصال بالكامل. نصك لا يغادر هذا الجهاز أبدًا: لا خوادم، لا تتبع، لا ملفات تعريف ارتباط.',
      helpTitle: 'المساعدة والاختصارات', shortcuts: 'اختصارات لوحة المفاتيح', features: 'ما يمكنك فعله',
      imageBlocked: 'تم حظر صورة من الإنترنت — انقر للتحميل', copied: 'تم النسخ!', copy: 'نسخ', copyFailed: 'تعذّر النسخ',
      opened: 'تم الفتح', fileTooBig: 'الملف كبير جدًا (الحد الأقصى 10 ميغابايت)', unsupported: 'نوع الملف غير مدعوم', newDoc: 'تم إنشاء مستند جديد',
      deleted: 'تم حذف المستند', tablesFormatted: 'تم تنسيق الجداول', noTables: 'لم يتم العثور على جداول', pastedConverted: 'تم تحويل المحتوى الملصق إلى ماركداون',
      storageFull: 'مساحة المتصفح ممتلئة — صدّر عملك!', installApp: 'تثبيت التطبيق', replacedN: 'تم استبدال {n}',
      mathError: 'خطأ في المعادلة', diagramError: 'خطأ في المخطط', loading: 'جارٍ التحميل…',
      welcomeName: 'مرحبا.md',
      phBold: 'نص عريض', phItalic: 'نص مائل', phStrike: 'نص يتوسطه خط', phLink: 'نص الرابط', phAlt: 'وصف الصورة',
      tCol: 'عمود', tCell: 'خلية', mmStart: 'البداية', mmDecide: 'قرار', mmYes: 'نعم', mmNo: 'لا',
      emptyPreview: 'لا يوجد ما يُعرض بعد — ابدأ الكتابة أو أفلِت ملفًا.', imageTooBig: 'الصورة كبيرة جدًا (الحد الأقصى 2 ميغابايت)'
    },
    de: {
      tagline: 'Privates Markdown-Studio',
      new: 'Neu', open: 'Öffnen', docs: 'Dokumente', export: 'Exportieren',
      viewEditor: 'Editor', viewSplit: 'Geteilt', viewPreview: 'Vorschau',
      direction: 'Textrichtung', dirAuto: 'Automatisch (pro Absatz)', dirRtl: 'Rechts nach links', dirLtr: 'Links nach rechts',
      theme: 'Design', themeSystem: 'System', themeLight: 'Hell', themeDark: 'Dunkel',
      language: 'Sprache', settings: 'Einstellungen', help: 'Hilfe & Tastenkürzel',
      bold: 'Fett', italic: 'Kursiv', strike: 'Durchgestrichen', heading: 'Überschrift', h1: 'Überschrift 1', h2: 'Überschrift 2', h3: 'Überschrift 3',
      quote: 'Zitat', code: 'Inline-Code', codeblock: 'Codeblock', link: 'Link', image: 'Bild',
      ul: 'Aufzählung', ol: 'Nummerierte Liste', task: 'Aufgabenliste', table: 'Tabelle', hr: 'Trennlinie',
      math: 'Formel', mermaid: 'Diagramm', footnote: 'Fußnote',
      undo: 'Rückgängig', redo: 'Wiederholen', toc: 'Gliederung', find: 'Suchen & Ersetzen', focus: 'Fokusmodus', formatTables: 'Tabellen formatieren',
      syncScroll: 'Synchrones Scrollen',
      exportMd: 'Markdown-Datei (.md)', exportHtml: 'HTML-Seite (.html)', exportPdf: 'PDF / Drucken', exportTxt: 'Nur Text (.txt)',
      copyMd: 'Markdown kopieren', copyHtml: 'HTML-Quelltext kopieren', copyRich: 'Als formatierten Text kopieren',
      words: 'Wörter', chars: 'Zeichen', lines: 'Zeilen', minRead: 'Min. Lesezeit', ln: 'Z.', col: 'Sp.',
      saved: 'Lokal gespeichert', saving: 'Speichern…', localOnly: '100 % in deinem Browser',
      outline: 'Gliederung', noHeadings: 'Noch keine Überschriften',
      findPh: 'Suchen', replacePh: 'Ersetzen', replace: 'Ersetzen', replaceAll: 'Alle', matchCase: 'Groß-/Kleinschreibung', regex: 'Regulärer Ausdruck', close: 'Schließen', noMatch: 'Keine Treffer', of: 'von',
      dropHint: 'Datei ablegen, um sie zu öffnen', dropSub: '.md · .markdown · .txt · .html — nichts verlässt dein Gerät',
      docsTitle: 'Deine Dokumente', docsHint: 'Nur in diesem Browser gespeichert.', untitled: 'Unbenannt', delete: 'Löschen', openDoc: 'Öffnen', duplicate: 'Duplizieren', current: 'Aktuell',
      deleteConfirm: 'Dieses Dokument löschen? Das kann nicht rückgängig gemacht werden.', clearAll: 'Alle löschen', clearAllConfirm: 'ALLE in diesem Browser gespeicherten Dokumente löschen?',
      settingsTitle: 'Einstellungen', fontSize: 'Schriftgröße im Editor', previewSize: 'Schriftgröße in der Vorschau', editorFont: 'Editor-Schrift', fontMono: 'Monospace', fontSans: 'Serifenlos',
      breaks: 'Einfache Zeilenumbrüche als <br> behandeln', remoteImages: 'Externe Bilder laden', remoteImagesHint: 'Wenn aus, werden keine Bilder aus dem Internet geladen (mehr Privatsphäre).',
      smartPaste: 'Eingefügte Webinhalte in Markdown umwandeln', spellcheck: 'Rechtschreibprüfung im Editor', lineWrap: 'Lange Zeilen umbrechen', previewWidth: 'Vorschaubreite begrenzen', autosave: 'Automatisch speichern',
      privacyNote: 'Hamsoo funktioniert komplett offline. Dein Text verlässt nie dieses Gerät: keine Server, kein Tracking, keine Cookies.',
      helpTitle: 'Hilfe & Tastenkürzel', shortcuts: 'Tastenkürzel', features: 'Was du tun kannst',
      imageBlocked: 'Externes Bild blockiert — zum Laden klicken', copied: 'Kopiert!', copy: 'Kopieren', copyFailed: 'Kopieren fehlgeschlagen',
      opened: 'Geöffnet', fileTooBig: 'Datei ist zu groß (max. 10 MB)', unsupported: 'Dateityp wird nicht unterstützt', newDoc: 'Neues Dokument erstellt',
      deleted: 'Dokument gelöscht', tablesFormatted: 'Tabellen formatiert', noTables: 'Keine Tabellen gefunden', pastedConverted: 'Eingefügter Inhalt in Markdown umgewandelt',
      storageFull: 'Browser-Speicher ist voll — exportiere deine Arbeit!', installApp: 'App installieren', replacedN: '{n} ersetzt',
      mathError: 'Formelfehler', diagramError: 'Diagrammfehler', loading: 'Wird geladen…',
      welcomeName: 'willkommen.md',
      phBold: 'fetter Text', phItalic: 'kursiver Text', phStrike: 'durchgestrichen', phLink: 'Linktext', phAlt: 'Bildbeschreibung',
      tCol: 'Spalte', tCell: 'Zelle', mmStart: 'Start', mmDecide: 'Entscheiden', mmYes: 'Ja', mmNo: 'Nein',
      emptyPreview: 'Noch nichts zu sehen — fang an zu schreiben oder lege eine Datei ab.', imageTooBig: 'Bild ist zu groß (max. 2 MB)'
    }
  };

  /** UI languages: native name, short code shown on the button, direction, number/date locale. */
  const LANGS = {
    en: { name: 'English', code: 'EN', dir: 'ltr', locale: 'en-US' },
    fa: { name: 'فارسی', code: 'FA', dir: 'rtl', locale: 'fa-IR' },
    ar: { name: 'العربية', code: 'AR', dir: 'rtl', locale: 'ar' },
    de: { name: 'Deutsch', code: 'DE', dir: 'ltr', locale: 'de-DE' }
  };

  const HELP = {
    en: {
      shortcuts: [
        ['Ctrl/⌘ + B', 'Bold'], ['Ctrl/⌘ + I', 'Italic'], ['Ctrl/⌘ + K', 'Link'], ['Ctrl/⌘ + E', 'Inline code'],
        ['Ctrl/⌘ + Shift + X', 'Strikethrough'], ['Ctrl/⌘ + 1…3', 'Heading 1–3'], ['Ctrl/⌘ + F', 'Find & replace'],
        ['Ctrl/⌘ + S', 'Download .md'], ['Ctrl/⌘ + O', 'Open file'], ['Ctrl/⌘ + P', 'Print / PDF'],
        ['Ctrl/⌘ + Alt + N', 'New document'], ['Ctrl/⌘ + Shift + F', 'Focus mode'], ['Tab / Shift + Tab', 'Indent / outdent'],
        ['Enter', 'Continue lists automatically'], ['Esc', 'Close dialogs / exit focus']
      ],
      features: [
        'Open .md files by dropping them, using Open, or pasting text.',
        'Right-to-left (Persian, Arabic, Hebrew) and left-to-right text are detected per paragraph automatically. You can also force one direction.',
        'GitHub-flavored Markdown: tables, task lists (click to tick), strikethrough, footnotes, autolinks.',
        'Code highlighting for 190+ languages, LaTeX math ($…$ and $$…$$), and Mermaid diagrams.',
        'Export to Markdown, HTML, plain text or PDF; copy as rich text for Word, Google Docs or email.',
        'Documents autosave in this browser only. Nothing is uploaded, ever.'
      ]
    },
    fa: {
      shortcuts: [
        ['Ctrl/⌘ + B', 'پررنگ'], ['Ctrl/⌘ + I', 'مورب'], ['Ctrl/⌘ + K', 'پیوند'], ['Ctrl/⌘ + E', 'کد درون‌خطی'],
        ['Ctrl/⌘ + Shift + X', 'خط‌خورده'], ['Ctrl/⌘ + 1…3', 'تیتر ۱ تا ۳'], ['Ctrl/⌘ + F', 'جستجو و جایگزینی'],
        ['Ctrl/⌘ + S', 'دانلود فایل .md'], ['Ctrl/⌘ + O', 'باز کردن فایل'], ['Ctrl/⌘ + P', 'چاپ / PDF'],
        ['Ctrl/⌘ + Alt + N', 'سند جدید'], ['Ctrl/⌘ + Shift + F', 'حالت تمرکز'], ['Tab / Shift + Tab', 'تورفتگی / برگشت'],
        ['Enter', 'ادامه خودکار فهرست‌ها'], ['Esc', 'بستن پنجره‌ها / خروج از تمرکز']
      ],
      features: [
        'فایل‌های .md را با کشیدن و رها کردن، دکمه «باز کردن» یا چسباندن متن باز کنید.',
        'جهت متن راست‌به‌چپ (فارسی، عربی، عبری) و چپ‌به‌راست برای هر پاراگراف خودکار تشخیص داده می‌شود؛ می‌توانید یک جهت را هم اجباری کنید.',
        'مارک‌داون گیت‌هاب: جدول، فهرست کارها (قابل تیک زدن)، خط‌خورده، پانویس و پیوند خودکار.',
        'رنگ‌آمیزی کد برای بیش از ۱۹۰ زبان، فرمول‌های LaTeX و نمودارهای Mermaid.',
        'خروجی Markdown، HTML، متن ساده یا PDF؛ کپی قالب‌دار برای Word، Google Docs یا ایمیل.',
        'اسناد فقط در همین مرورگر ذخیره می‌شوند. هیچ چیزی آپلود نمی‌شود.'
      ]
    },
    ar: {
      shortcuts: [
        ['Ctrl/⌘ + B', 'عريض'], ['Ctrl/⌘ + I', 'مائل'], ['Ctrl/⌘ + K', 'رابط'], ['Ctrl/⌘ + E', 'كود سطري'],
        ['Ctrl/⌘ + Shift + X', 'يتوسطه خط'], ['Ctrl/⌘ + 1…3', 'عنوان 1 إلى 3'], ['Ctrl/⌘ + F', 'بحث واستبدال'],
        ['Ctrl/⌘ + S', 'تنزيل ملف .md'], ['Ctrl/⌘ + O', 'فتح ملف'], ['Ctrl/⌘ + P', 'طباعة / PDF'],
        ['Ctrl/⌘ + Alt + N', 'مستند جديد'], ['Ctrl/⌘ + Shift + F', 'وضع التركيز'], ['Tab / Shift + Tab', 'إزاحة / إلغاء الإزاحة'],
        ['Enter', 'متابعة القوائم تلقائيًا'], ['Esc', 'إغلاق النوافذ / الخروج من التركيز']
      ],
      features: [
        'افتح ملفات .md بسحبها وإفلاتها، أو بزر «فتح»، أو بلصق النص.',
        'يُكتشف اتجاه النص من اليمين إلى اليسار (العربية، الفارسية، العبرية) ومن اليسار إلى اليمين تلقائيًا لكل فقرة، ويمكنك أيضًا فرض اتجاه واحد.',
        'ماركداون بأسلوب GitHub: جداول، قوائم مهام (انقر للتأشير)، نص يتوسطه خط، حواشٍ وروابط تلقائية.',
        'تلوين الكود لأكثر من 190 لغة، ومعادلات LaTeX، ومخططات Mermaid.',
        'تصدير إلى Markdown أو HTML أو نص عادي أو PDF، ونسخ كنص منسّق لـ Word أو Google Docs أو البريد.',
        'تُحفظ المستندات تلقائيًا في هذا المتصفح فقط. لا يُرفع أي شيء أبدًا.'
      ]
    },
    de: {
      shortcuts: [
        ['Strg/⌘ + B', 'Fett'], ['Strg/⌘ + I', 'Kursiv'], ['Strg/⌘ + K', 'Link'], ['Strg/⌘ + E', 'Inline-Code'],
        ['Strg/⌘ + Umschalt + X', 'Durchgestrichen'], ['Strg/⌘ + 1…3', 'Überschrift 1–3'], ['Strg/⌘ + F', 'Suchen & Ersetzen'],
        ['Strg/⌘ + S', '.md herunterladen'], ['Strg/⌘ + O', 'Datei öffnen'], ['Strg/⌘ + P', 'Drucken / PDF'],
        ['Strg/⌘ + Alt + N', 'Neues Dokument'], ['Strg/⌘ + Umschalt + F', 'Fokusmodus'], ['Tab / Umschalt + Tab', 'Einrücken / Ausrücken'],
        ['Enter', 'Listen automatisch fortsetzen'], ['Esc', 'Dialoge schließen / Fokus beenden']
      ],
      features: [
        'Öffne .md-Dateien per Drag & Drop, über „Öffnen“ oder durch Einfügen von Text.',
        'Rechts-nach-links-Text (Persisch, Arabisch, Hebräisch) und Links-nach-rechts-Text werden pro Absatz automatisch erkannt. Du kannst auch eine Richtung erzwingen.',
        'GitHub-Markdown: Tabellen, Aufgabenlisten (zum Abhaken anklicken), Durchstreichen, Fußnoten, automatische Links.',
        'Syntaxhervorhebung für über 190 Sprachen, LaTeX-Formeln ($…$ und $$…$$) und Mermaid-Diagramme.',
        'Export als Markdown, HTML, Text oder PDF; als formatierten Text für Word, Google Docs oder E-Mail kopieren.',
        'Dokumente werden nur in diesem Browser automatisch gespeichert. Nichts wird jemals hochgeladen.'
      ]
    }
  };

  const WELCOME = {
    en: `# Welcome to Hamsoo ✨

**Hamsoo** is a private Markdown studio that runs *entirely in your browser*. Nothing you type or open is ever sent to a server.

## Get started

- **Open** a \`.md\` file, drag & drop it anywhere, or just paste text.
- Use the toolbar or keyboard shortcuts to format.
- Switch between *Editor*, *Split* and *Preview* views.

## Right-to-left just works

Paragraphs are aligned automatically based on their language:

متن فارسی به‌صورت خودکار راست‌چین می‌شود، حتی وقتی کلماتی مثل **Markdown** یا \`npm install\` داخلش باشد.

- مورد اول فهرست
- مورد دوم با یک [پیوند](https://example.com)

> نقل‌قول‌ها هم درست نمایش داده می‌شوند.

## Tasks

- [x] Write some Markdown
- [ ] Click a checkbox in the preview to tick it
- [ ] Export to PDF or HTML

## Tables

| Feature | Supported | یادداشت |
|:--------|:---------:|--------:|
| GFM tables | ✅ | جدول |
| Footnotes | ✅ | پانویس |
| Math | ✅ | ریاضی |

## Code

\`\`\`js
// Syntax highlighting for 190+ languages
const greet = (name) => \`Hello, \${name}!\`;
console.log(greet('world'));
\`\`\`

## Math

Inline math like $e^{i\\pi} + 1 = 0$ and display math:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}
$$

## Diagrams

\`\`\`mermaid
graph LR
  A[Write] --> B{Preview}
  B --> C[Export]
  B --> A
\`\`\`

Footnotes are supported too.[^1]

[^1]: Everything is stored only in this browser.
`,
    fa: `# به «همسو» خوش آمدید ✨

**همسو** یک ویرایشگر خصوصی مارک‌داون است که *کاملاً داخل مرورگر شما* اجرا می‌شود. هیچ چیزی که می‌نویسید یا باز می‌کنید به سروری فرستاده نمی‌شود.

## شروع کار

- فایل \`.md\` را با دکمه **باز کردن** یا کشیدن و رها کردن باز کنید، یا متن را بچسبانید.
- از نوار ابزار یا میانبرهای صفحه‌کلید برای قالب‌بندی استفاده کنید.
- بین نماهای *ویرایشگر*، *دوبخشی* و *پیش‌نمایش* جابه‌جا شوید.

## راست‌چین و چپ‌چین خودکار

جهت هر پاراگراف بر اساس زبانش خودکار تعیین می‌شود؛ حتی اگر کلماتی مثل **React** یا \`npm install\` داخل جمله باشد.

This English paragraph is automatically left-aligned, even inside a Persian document.

> نقل‌قول‌ها هم درست نمایش داده می‌شوند.

## فهرست کارها

- [x] نوشتن مارک‌داون
- [ ] روی چک‌باکس در پیش‌نمایش کلیک کنید
- [ ] خروجی PDF یا HTML بگیرید

## جدول

| امکان | پشتیبانی | Note |
|:------|:--------:|-----:|
| جدول | ✅ | GFM tables |
| پانویس | ✅ | Footnotes |
| ریاضی | ✅ | Math |

## کد

\`\`\`python
# رنگ‌آمیزی کد برای بیش از ۱۹۰ زبان
def greet(name):
    return f"سلام {name}!"
\`\`\`

## ریاضی

فرمول درون‌خطی مثل $a^2 + b^2 = c^2$ و فرمول نمایشی:

$$
\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}
$$

## نمودار

\`\`\`mermaid
graph LR
  A[نوشتن] --> B{پیش‌نمایش}
  B --> C[خروجی]
\`\`\`

پانویس هم پشتیبانی می‌شود.[^1]

[^1]: همه چیز فقط در همین مرورگر ذخیره می‌شود.
`,
    ar: `# مرحبًا بك في «همسو» ✨

**همسو** محرر ماركداون خاص يعمل *بالكامل داخل متصفحك*. لا يُرسل أي شيء تكتبه أو تفتحه إلى أي خادم.

## البداية

- افتح ملف \`.md\` بزر **فتح** أو اسحبه وأفلِته في أي مكان، أو الصق النص مباشرة.
- استخدم شريط الأدوات أو اختصارات لوحة المفاتيح للتنسيق.
- بدّل بين طرق العرض *المحرر* و*مقسوم* و*معاينة*.

## اتجاه تلقائي من اليمين إلى اليسار

يُحدَّد اتجاه كل فقرة تلقائيًا حسب لغتها، حتى لو احتوت على كلمات مثل **React** أو \`npm install\`.

This English paragraph is automatically left-aligned, even inside an Arabic document.

> الاقتباسات تُعرض بشكل صحيح أيضًا.

## قائمة المهام

- [x] كتابة بعض الماركداون
- [ ] انقر على مربع الاختيار في المعاينة
- [ ] صدّر إلى PDF أو HTML

## جدول

| الميزة | مدعومة | Note |
|:-------|:------:|-----:|
| الجداول | ✅ | GFM tables |
| الحواشي | ✅ | Footnotes |
| الرياضيات | ✅ | Math |

## كود

\`\`\`js
// تلوين الكود لأكثر من 190 لغة
const greet = (name) => \`مرحبًا \${name}!\`;
\`\`\`

## رياضيات

معادلة سطرية مثل $a^2 + b^2 = c^2$ ومعادلة مستقلة:

$$
\\sum_{k=1}^{n} k = \\frac{n(n+1)}{2}
$$

## مخطط

\`\`\`mermaid
graph LR
  A[كتابة] --> B{معاينة}
  B --> C[تصدير]
\`\`\`

الحواشي مدعومة أيضًا.[^1]

[^1]: كل شيء يُحفظ في هذا المتصفح فقط.
`,
    de: `# Willkommen bei Hamsoo ✨

**Hamsoo** ist ein privates Markdown-Studio, das *vollständig in deinem Browser* läuft. Nichts, was du schreibst oder öffnest, wird an einen Server gesendet.

## Los geht's

- **Öffne** eine \`.md\`-Datei, zieh sie irgendwo hinein oder füge einfach Text ein.
- Formatiere mit der Werkzeugleiste oder mit Tastenkürzeln.
- Wechsle zwischen den Ansichten *Editor*, *Geteilt* und *Vorschau*.

## Rechts-nach-links funktioniert einfach

Absätze werden automatisch nach ihrer Sprache ausgerichtet:

متن فارسی به‌صورت خودکار راست‌چین می‌شود، حتی وقتی کلماتی مثل **Markdown** یا \`npm install\` داخلش باشد.

النص العربي يُحاذى تلقائيًا إلى اليمين.

> Auch Zitate werden korrekt dargestellt.

## Aufgaben

- [x] Etwas Markdown schreiben
- [ ] Ein Kästchen in der Vorschau anklicken
- [ ] Als PDF oder HTML exportieren

## Tabellen

| Funktion | Unterstützt | Notiz |
|:---------|:-----------:|------:|
| GFM-Tabellen | ✅ | جدول |
| Fußnoten | ✅ | حاشية |
| Mathe | ✅ | ریاضی |

## Code

\`\`\`js
// Syntaxhervorhebung für über 190 Sprachen
const greet = (name) => \`Hallo, \${name}!\`;
\`\`\`

## Mathe

Inline-Formeln wie $e^{i\\pi} + 1 = 0$ und abgesetzte Formeln:

$$
\\int_{-\\infty}^{\\infty} e^{-x^2}\\,dx = \\sqrt{\\pi}
$$

## Diagramme

\`\`\`mermaid
graph LR
  A[Schreiben] --> B{Vorschau}
  B --> C[Export]
  B --> A
\`\`\`

Fußnoten werden ebenfalls unterstützt.[^1]

[^1]: Alles wird nur in diesem Browser gespeichert.
`
  };

  window.HamsooI18n = { STR, HELP, WELCOME, LANGS };
})();
