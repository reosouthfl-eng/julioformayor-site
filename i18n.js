/*
 * Site language switcher: English / Español / Kreyòl.
 * Pages are written in English; this swaps visible text using i18n/es.json
 * and i18n/ht.json (English text -> translation). No page markup changes.
 * Choice is remembered per browser and can be forced with ?lang=es|ht|en.
 *
 * To edit a translation: change the value in i18n/es.json or i18n/ht.json.
 * New English text on a page needs a matching entry, or it stays in English.
 */
(function () {
  var LANGS = [
    { code: 'en', label: 'EN', name: 'English' },
    { code: 'es', label: 'ES', name: 'Español' },
    { code: 'ht', label: 'KR', name: 'Kreyòl' }
  ];
  var KEY = 'jg_lang';
  var ATTRS = ['placeholder', 'aria-label', 'alt', 'title'];
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1 };

  function store(get, val) {
    try { return get ? localStorage.getItem(KEY) : localStorage.setItem(KEY, val); } catch (e) { return null; }
  }
  function pick() {
    var q = (new URLSearchParams(location.search).get('lang') || '').toLowerCase();
    if (q === 'kr') q = 'ht';
    if (/^(en|es|ht)$/.test(q)) { store(false, q); return q; }
    var saved = store(true);
    return /^(en|es|ht)$/.test(saved || '') ? saved : 'en';
  }

  var lang = pick();
  var dict = {};
  var origText = new WeakMap();
  var applying = false;
  var html = document.documentElement;

  // hide the page briefly so non-English visitors don't see an English flash
  if (lang !== 'en') {
    html.classList.add('i18n-pending');
    setTimeout(function () { html.classList.remove('i18n-pending'); }, 2500);
  }

  function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
  function t(s) {
    if (lang === 'en' || s == null) return s;
    var k = norm(String(s));
    return Object.prototype.hasOwnProperty.call(dict, k) ? dict[k] : s;
  }

  function translateText(node) {
    var original = origText.has(node) ? origText.get(node) : node.nodeValue;
    if (!origText.has(node)) {
      if (!/[A-Za-z]/.test(original)) return;
      origText.set(node, original);
    }
    var target;
    if (lang === 'en') {
      target = original;
    } else {
      var k = norm(original);
      if (!Object.prototype.hasOwnProperty.call(dict, k)) return;
      var lead = original.match(/^\s*/)[0], trail = original.match(/\s*$/)[0];
      target = lead + dict[k] + trail;
    }
    if (node.nodeValue !== target) node.nodeValue = target;
  }

  function translateAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i];
      if (!el.hasAttribute(a)) continue;
      var stash = 'data-i18n-' + a;
      var original = el.hasAttribute(stash) ? el.getAttribute(stash) : el.getAttribute(a);
      var target = lang === 'en' ? original : t(original);
      if (target !== original && !el.hasAttribute(stash)) el.setAttribute(stash, original);
      if (el.getAttribute(a) !== target) el.setAttribute(a, target);
    }
  }

  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { translateText(root); return; }
    if (root.nodeType !== 1 || SKIP[root.nodeName] || root.hasAttribute('data-no-i18n')) return;
    translateAttrs(root);
    var tw = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (n.nodeType === 1) {
          if (SKIP[n.nodeName] || n.hasAttribute('data-no-i18n')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_SKIP;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n, els = root.querySelectorAll('[placeholder],[aria-label],[alt],[title]');
    while ((n = tw.nextNode())) translateText(n);
    for (var i = 0; i < els.length; i++) if (!els[i].closest('[data-no-i18n]')) translateAttrs(els[i]);
  }

  var origTitle = document.title, origDesc = null;
  function translateHead() {
    document.title = lang === 'en' ? origTitle : t(origTitle);
    var m = document.querySelector('meta[name="description"]');
    if (m) {
      if (origDesc === null) origDesc = m.getAttribute('content');
      m.setAttribute('content', lang === 'en' ? origDesc : t(origDesc));
    }
  }

  function applyAll() {
    applying = true;
    html.setAttribute('lang', lang === 'ht' ? 'ht' : lang);
    translateHead();
    walk(document.body);
    updateSwitcher();
    observer.takeRecords(); // drop records caused by our own edits
    applying = false;
    html.classList.remove('i18n-pending');
  }

  // keep translating text the page adds later (form errors, messages, photo captions)
  var observer = new MutationObserver(function (muts) {
    if (applying || lang === 'en') return;
    applying = true;
    for (var i = 0; i < muts.length; i++) {
      var m = muts[i];
      if (m.type === 'characterData') {
        origText.delete(m.target);
        translateText(m.target);
      } else if (m.type === 'attributes') {
        m.target.removeAttribute('data-i18n-' + m.attributeName);
        translateAttrs(m.target);
      } else {
        for (var j = 0; j < m.addedNodes.length; j++) walk(m.addedNodes[j]);
      }
    }
    observer.takeRecords(); // drop records caused by our own edits
    applying = false;
  });

  function load(code) {
    if (code === 'en') { dict = {}; return Promise.resolve(); }
    return fetch('i18n/' + code + '.json', { cache: 'force-cache' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (d) { dict = d || {}; })
      .catch(function () { dict = {}; });
  }

  function setLang(code) {
    if (code === lang) return;
    lang = code;
    store(false, code);
    load(code).then(applyAll);
    try { document.dispatchEvent(new CustomEvent('jg:langchange', { detail: { lang: code } })); } catch (e) {}
  }

  // ---- switcher UI (in the nav, visible on phones next to the menu button) ----
  var switcher = null;
  function buildSwitcher() {
    var nav = document.querySelector('nav');
    if (!nav || nav.querySelector('.lang-switch')) return;
    switcher = document.createElement('div');
    switcher.className = 'lang-switch';
    switcher.setAttribute('role', 'group');
    switcher.setAttribute('data-no-i18n', '');
    switcher.setAttribute('aria-label', 'Language / Idioma / Lang');
    LANGS.forEach(function (L) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = L.label;
      b.title = L.name;
      b.setAttribute('lang', L.code);
      b.setAttribute('aria-label', L.name);
      b.dataset.lang = L.code;
      b.addEventListener('click', function () { setLang(L.code); });
      switcher.appendChild(b);
    });
    var links = nav.querySelector('.nav-links');
    nav.insertBefore(switcher, links || null);
    updateSwitcher();
  }
  function updateSwitcher() {
    if (!switcher) return;
    var bs = switcher.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', String(bs[i].dataset.lang === lang));
  }

  window.JG_I18N = { t: t, get lang() { return lang; }, set: setLang };

  var ready = load(lang);
  function start() {
    buildSwitcher();
    ready.then(function () {
      if (lang !== 'en') applyAll(); else { html.classList.remove('i18n-pending'); updateSwitcher(); }
      observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
