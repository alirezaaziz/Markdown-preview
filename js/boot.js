/* Runs before first paint: apply saved theme + UI language to avoid a flash. */
(function () {
  'use strict';
  var s = {};
  try { s = JSON.parse(localStorage.getItem('hamsoo:settings') || '{}') || {}; } catch (e) { /* storage blocked */ }
  var root = document.documentElement;
  if (s.theme === 'light' || s.theme === 'dark') root.setAttribute('data-theme', s.theme);
  var supported = ['en', 'fa', 'ar', 'de'];
  var nav = (navigator.language || 'en').toLowerCase().slice(0, 2);
  var lang = supported.indexOf(s.lang) >= 0 ? s.lang : (supported.indexOf(nav) >= 0 ? nav : 'en');
  root.lang = lang;
  root.dir = lang === 'fa' || lang === 'ar' ? 'rtl' : 'ltr';
})();
