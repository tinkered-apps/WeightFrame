/* Privacy page: shows the note in the language chosen in the app and keeps the masthead's
 * language and theme controls working. The language is read from, and saved back to, the
 * app's stored state, so both pages stay in step. */
(function () {
  const STORE = 'weightframe.v1';
  const THEME_STORE = 'weightframe.theme';
  const THEMES = ['auto', 'light', 'dark'];
  const THEME_LABEL = { auto: 'Theme: follows your system', light: 'Theme: light', dark: 'Theme: dark' };
  const THEME_ICON = { auto: 'auto', light: 'sun', dark: 'moon' };
  const TITLE = { en: 'Data and privacy · WeightFrame', pl: 'Dane i prywatność · WeightFrame' };

  function stored() {
    try { const s = JSON.parse(localStorage.getItem(STORE)); return s && s.sex ? s : null; } catch (e) { return null; }
  }

  let locale = (stored() || {}).locale === 'pl' ? 'pl' : 'en';
  let theme = 'auto';
  try { const t = localStorage.getItem(THEME_STORE); if (THEMES.includes(t)) theme = t; } catch (e) { /* ignore */ }

  function applyLocale() {
    FH.i18n.setLocale(locale);
    document.documentElement.lang = locale;
    document.title = TITLE[locale];
    document.querySelectorAll('[data-locale]').forEach((el) => { el.hidden = el.dataset.locale !== locale; });
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = FH.i18n.t(el.dataset.i18n); });
    document.querySelectorAll('[data-lang-btn]').forEach((b) => {
      const on = b.dataset.langBtn === locale;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    applyTheme();
  }

  function applyTheme() {
    if (theme === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme;
    const btn = document.getElementById('themeBtn');
    const label = FH.i18n.t(THEME_LABEL[theme]);
    btn.innerHTML = FH.icon(THEME_ICON[theme]);
    btn.setAttribute('aria-label', label);
    btn.title = label;
  }

  function setLocale(l) {
    locale = l;
    // Only an existing app state is updated: the app ignores a state without its inputs.
    const s = stored();
    if (s) { s.locale = l; try { localStorage.setItem(STORE, JSON.stringify(s)); } catch (e) { /* ignore */ } }
    applyLocale();
  }

  document.addEventListener('click', (e) => {
    const lang = e.target.closest('[data-lang-btn]');
    if (lang) { setLocale(lang.dataset.langBtn); return; }
    if (e.target.closest('#themeBtn')) {
      theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
      try { localStorage.setItem(THEME_STORE, theme); } catch (e2) { /* ignore */ }
      applyTheme();
    }
  });
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (!t.matches || !t.matches('[data-lang-btn]') || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    const next = t.dataset.langBtn === 'en' ? 'pl' : 'en';
    setLocale(next);
    document.querySelector(`[data-lang-btn="${next}"]`).focus();
    e.preventDefault();
  });

  applyLocale();
})();
