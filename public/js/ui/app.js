/* Form state, unit handling, tab switching, persistence and the render loop. */
(function (root) {
  const FH = root.FH;
  const { fmt } = FH;
  const $ = (id) => document.getElementById(id);
  // Shown in the footer. public/sw.js names its cache after it; bump both together (see AGENTS.md).
  const APP_VERSION = '1.05';
  const STORE = 'weightframe.v1';
  const THEME_STORE = 'weightframe.theme';
  const DISCLAIMER_STORE = 'weightframe.disclaimerDismissed';
  const narrowMQ = window.matchMedia('(max-width: 980px)');
  const compactNavMQ = window.matchMedia('(max-width: 1100px)');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  const EXAMPLE = {
    units: 'metric', locale: 'en', sex: 'male', ageYears: 35, ageMonths: 0, heightCm: 180, weightKg: 98,
    activity: 'low', ethnicity: 'other', waistCm: null, hipCm: null, neckCm: null,
    bodyFatPct: null, athlete: false, pregnant: false, childReference: 'cdc', bmrChoice: '',
    goalWeightKg: 80, paceMode: 'moderate', weeks: 24, intakeKcal: 1600, extraActivityKcal: 0,
  };
  const NUM_KEYS = ['ageYears', 'ageMonths', 'heightCm', 'weightKg', 'waistCm', 'hipCm', 'neckCm', 'bodyFatPct', 'goalWeightKg', 'weeks', 'intakeKcal', 'extraActivityKcal'];
  const BOOL_KEYS = ['athlete', 'pregnant'];

  let state = stateFromURL() || load() || Object.assign({}, EXAMPLE);

  /* ---------- shareable links: the full selection set lives in EXAMPLE's keys, so it also
   * defines what a link carries. Links encode it after a "#", never a "?": a URL fragment is not
   * sent to the server in the HTTP request (a "?query" is), so a shared profile cannot reach
   * Cloudflare. A "?" link is deliberately not read, so the app never supports the leaky form.
   * Read once on load (then the address bar is cleared, so it doesn't quietly go stale as the
   * user keeps editing); "Share" rebuilds it fresh. */
  function stateFromURL() {
    const p = new URLSearchParams(location.hash.slice(1));
    if (![...p.keys()].some((k) => Object.prototype.hasOwnProperty.call(EXAMPLE, k))) return null;
    return readParams(p);
  }
  function readParams(p) {
    const s = Object.assign({}, EXAMPLE);
    Object.keys(EXAMPLE).forEach((k) => {
      if (!p.has(k)) return;
      const raw = p.get(k);
      if (NUM_KEYS.includes(k)) { const n = parseFloat(raw); s[k] = Number.isFinite(n) ? n : null; }
      else if (BOOL_KEYS.includes(k)) s[k] = raw === '1';
      else s[k] = raw;
    });
    return s;
  }
  function shareURL() {
    const p = new URLSearchParams();
    Object.keys(EXAMPLE).forEach((k) => {
      const v = state[k];
      if (BOOL_KEYS.includes(k)) { if (v) p.set(k, '1'); return; }
      // An empty number is sent as "key=" so the link opens empty rather than with the example value.
      if (v == null && NUM_KEYS.includes(k)) { p.set(k, ''); return; }
      if (v == null || v === '') return;
      p.set(k, String(v));
    });
    return `${location.origin}${location.pathname}#${p.toString()}`;
  }

  function load() {
    try { const s = JSON.parse(localStorage.getItem(STORE)); return s && s.sex ? Object.assign({}, EXAMPLE, s) : null; } catch (e) { return null; }
  }
  function save() { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { /* storage unavailable */ } }

  /* ---------- icons: every [data-icon] placeholder becomes the authored SVG ---------- */
  function hydrateIcons(scope) {
    scope.querySelectorAll('[data-icon]').forEach((el) => { el.outerHTML = FH.icon(el.dataset.icon); });
  }

  /* ---------- theme: system / light / dark, remembered per browser ---------- */
  const THEMES = ['auto', 'light', 'dark'];
  const THEME_LABEL = { auto: 'Theme: follows your system', light: 'Theme: light', dark: 'Theme: dark' };
  const THEME_ICON = { auto: 'auto', light: 'sun', moon: 'moon', dark: 'moon' };
  let theme = 'auto';
  try { const t = localStorage.getItem(THEME_STORE); if (THEMES.includes(t)) theme = t; } catch (e) { /* ignore */ }
  function applyTheme() {
    if (theme === 'auto') delete document.documentElement.dataset.theme; else document.documentElement.dataset.theme = theme;
    const btn = $('themeBtn');
    btn.innerHTML = FH.icon(THEME_ICON[theme]);
    const label = FH.i18n.t(THEME_LABEL[theme]);
    btn.setAttribute('aria-label', label);
    btn.title = label;
  }

  /* ---- disclaimer bar: fixed to the viewport bottom, dismissible, remembered per browser ---- */
  function initDisclaimerBar() {
    let dismissed = false;
    try { dismissed = localStorage.getItem(DISCLAIMER_STORE) === '1'; } catch (e) { /* ignore */ }
    $('disclaimerBar').hidden = dismissed;
    const bar = $('disclaimerBar');
    new ResizeObserver(() => document.documentElement.style.setProperty('--disclaimer-h', `${bar.offsetHeight}px`)).observe(bar);
  }

  /* ---------- building dynamic controls ---------- */
  // Long option labels truncate inside the select, so mirror the chosen one into its tooltip.
  function syncEthnicityTitle() {
    const sel = $('ethnicity');
    sel.title = sel.selectedOptions[0] ? sel.selectedOptions[0].textContent : '';
  }

  function buildControls() {
    const act = $('activity');
    act.innerHTML = FH.i18n.apply(Object.entries(FH.energy.ACTIVITY).map(([k, a]) =>
      `<button type="button" role="radio" data-activity="${k}" aria-checked="false">${a.label}</button>`).join(''));
    // "Other" pinned first (it's the safe/unspecified default); the rest alphabetical in
    // whichever language is active, since English and Polish order the same labels differently.
    const ethnicity = Object.entries(FH.anthro.ETHNICITY).sort(([ka, a], [kb, b]) => {
      if (ka === 'other' || kb === 'other') return ka === 'other' ? -1 : 1;
      return FH.i18n.t(a.label).localeCompare(FH.i18n.t(b.label), state.locale);
    });
    $('ethnicity').innerHTML = FH.i18n.apply(ethnicity.map(([k, e]) => `<option value="${k}">${e.label}</option>`).join(''));
    syncEthnicityTitle();
  }

  /* ---- static index.html text: [data-i18n] elements ---- */
  function applyStaticI18n() {
    document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = FH.i18n.t(el.dataset.i18n); });
  }

  /* ---- toolbar buttons: short visible label + a fuller hover tooltip (not aria-label, so the
   * accessible name still matches the visible text). ---- */
  function applyToolLabels() {
    $('resetBtn').title = FH.i18n.t('Load reference profile');
    $('clearBtn').title = FH.i18n.t('Clear inputs');
    $('shareBtn').title = FH.i18n.t('Copy shareable link');
  }

  /* ---------- state -> form ---------- */
  const massOut = (kg) => (kg == null || kg === '' ? '' : +fmt.massVal(kg).toFixed(1));
  const circOut = (cm) => (cm == null || cm === '' ? '' : +(fmt.units === 'metric' ? cm : cm / fmt.IN).toFixed(1));

  function writeForm() {
    fmt.setUnits(state.units);
    fmt.setLocale(state.locale);
    FH.i18n.setLocale(state.locale);
    document.documentElement.lang = state.locale;
    applyStaticI18n();
    applyToolLabels();
    buildControls();
    applyTheme();
    document.querySelectorAll('[data-lang-btn]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.langBtn === state.locale)));
    document.querySelectorAll('[data-units-btn]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.unitsBtn === state.units)));
    document.querySelectorAll('[data-units]').forEach((el) => { el.hidden = el.dataset.units !== state.units; });
    document.querySelectorAll('[data-unit="mass"]').forEach((el) => { el.textContent = fmt.massUnit(); });
    document.querySelectorAll('[data-unit="circ"]').forEach((el) => { el.textContent = state.units === 'metric' ? 'cm' : 'in'; });
    document.querySelectorAll('[data-sex]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.sex === state.sex)));
    document.querySelectorAll('[data-activity]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.activity === state.activity)));
    document.querySelectorAll('[data-pace]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.pace === state.paceMode)));
    document.querySelectorAll('[data-ref-btn]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.refBtn === state.childReference)));
    $('ageYears').value = state.ageYears ?? '';
    $('ageMonths').value = state.ageMonths || '';
    $('heightCm').value = state.heightCm == null ? '' : +state.heightCm.toFixed(1);
    if (state.heightCm) {
      const tin = state.heightCm / fmt.IN; const ft = Math.floor(tin / 12);
      $('heightFt').value = ft; $('heightIn').value = +(tin - ft * 12).toFixed(1);
    } else { $('heightFt').value = ''; $('heightIn').value = ''; }
    $('weight').value = massOut(state.weightKg);
    $('goal').value = massOut(state.goalWeightKg);
    $('waist').value = circOut(state.waistCm);
    $('hip').value = circOut(state.hipCm);
    $('neck').value = circOut(state.neckCm);
    $('bodyFat').value = state.bodyFatPct ?? '';
    $('athlete').checked = !!state.athlete;
    $('pregnant').checked = !!state.pregnant;
    $('ethnicity').value = state.ethnicity;
    syncEthnicityTitle();
    $('bmrChoice').value = state.bmrChoice;
    $('weeks').value = state.weeks ?? '';
    $('intake').value = state.intakeKcal ?? '';
    $('extra').value = state.extraActivityKcal || '';
    if (state.waistCm || state.hipCm || state.neckCm || state.bodyFatPct) $('measure').open = true;
    syncVisibility();
  }

  /* ---------- form -> state ---------- */
  const num = (id) => { const v = parseFloat($(id).value.replace(',', '.')); return Number.isFinite(v) ? v : null; };
  const massIn = (v) => (v == null ? null : state.units === 'metric' ? v : v * fmt.LB);
  const circIn = (v) => (v == null ? null : state.units === 'metric' ? v : v * fmt.IN);

  function readForm() {
    state.ageYears = num('ageYears');
    state.ageMonths = num('ageMonths') || 0;
    if (state.units === 'metric') state.heightCm = num('heightCm');
    else {
      const ft = num('heightFt'), inch = num('heightIn');
      state.heightCm = ft == null && inch == null ? null : ((ft || 0) * 12 + (inch || 0)) * fmt.IN;
    }
    state.weightKg = massIn(num('weight'));
    state.goalWeightKg = massIn(num('goal'));
    state.waistCm = circIn(num('waist'));
    state.hipCm = circIn(num('hip'));
    state.neckCm = circIn(num('neck'));
    state.bodyFatPct = num('bodyFat');
    state.athlete = $('athlete').checked;
    state.pregnant = $('pregnant').checked;
    state.ethnicity = $('ethnicity').value;
    syncEthnicityTitle();
    state.bmrChoice = $('bmrChoice').value;
    state.weeks = num('weeks');
    state.intakeKcal = num('intake');
    state.extraActivityKcal = num('extra') || 0;
  }

  function ageDecimal() {
    return state.ageYears == null ? null : state.ageYears + (state.ageYears < 18 ? Math.min(11, state.ageMonths || 0) / 12 : 0);
  }

  const PACE_PRESETS = ['gentle', 'moderate', 'fast'];
  function syncVisibility() {
    const age = ageDecimal();
    const child = age != null && age < 18;
    $('ageMonthsWrap').hidden = !child && age != null;
    $('goalGroup').hidden = child;
    $('bmrGroup').hidden = child;
    $('childGroup').hidden = !child;
    $('pregnantWrap').hidden = state.sex !== 'female' || (age != null && age < 10);
    $('weeksField').hidden = state.paceMode !== 'weeks';
    $('intakeField').hidden = state.paceMode !== 'intake';
    const actT = FH.i18nText.get(state.locale).activity[state.activity];
    $('activityHint').textContent = (actT || {}).desc || '';
    const hints = state.locale === 'pl' ? {
      gentle: 'Około 0,5% masy ciała na tydzień.', moderate: 'Około 0,75% masy ciała na tydzień.', fast: 'Około 1% masy ciała na tydzień – górna granica zalecanego tempa.',
      weeks: 'Model znajduje podaż kalorii, która pozwoli osiągnąć cel w tylu tygodniach.', intake: 'Model pokazuje, dokąd ta podaż kalorii Cię zaprowadzi i kiedy.',
    } : {
      gentle: 'About 0.5% of body weight per week.', moderate: 'About 0.75% of body weight per week.', fast: 'About 1% of body weight per week – the upper end of guideline pace.',
      weeks: 'The model finds the intake that reaches your goal in this many weeks.', intake: 'The model shows where this intake takes you, and when.',
    };
    // No guideline pace exists for gaining weight, so the presets do not claim one there.
    const gain = !child && state.goalWeightKg > 0 && state.weightKg > 0 && state.goalWeightKg - state.weightKg >= 0.25;
    const gainHint = state.locale === 'pl'
      ? 'Przy przybieraniu masy ciała aplikacja planuje nadwyżkę najwyżej 500 kcal dziennie; nie ma zalecanego tempa przybierania.'
      : 'For weight gain the app plans at most a 500 kcal/day surplus; there is no guideline pace for gaining.';
    $('paceHint').textContent = gain && PACE_PRESETS.includes(state.paceMode) ? gainHint : hints[state.paceMode] || '';
  }

  function toInput() {
    return {
      sex: state.sex, ageYears: ageDecimal(), heightCm: state.heightCm, weightKg: state.weightKg,
      activity: state.activity, ethnicity: state.ethnicity,
      waistCm: state.waistCm || null, hipCm: state.hipCm || null, neckCm: state.neckCm || null,
      bodyFatPct: state.bodyFatPct > 0 ? state.bodyFatPct : null, athlete: state.athlete,
      pregnant: state.sex === 'female' && state.pregnant && ageDecimal() >= 10,
      childReference: state.childReference,
      goalWeightKg: state.goalWeightKg, paceMode: state.paceMode, weeks: state.weeks, intakeKcal: state.intakeKcal,
      extraActivityKcal: state.extraActivityKcal, bmrChoice: state.bmrChoice,
    };
  }

  /* ---------- the input rail on phones: a one-line summary that opens the form ---------- */
  function railSummary() {
    const t = FH.i18n.t;
    const parts = [t(state.sex === 'male' ? 'Male' : 'Female')];
    if (state.ageYears != null) parts.push(`${fmt.n(state.ageYears)} ${t('yr')}`);
    if (state.heightCm) parts.push(fmt.height(state.heightCm));
    if (state.weightKg) parts.push(fmt.mass(state.weightKg));
    let s = parts.join(' · ');
    if (lastResult && lastResult.ok && !lastResult.isChild && state.goalWeightKg) s += ' → ' + fmt.mass(state.goalWeightKg);
    $('railSummary').textContent = s;
  }
  /** Desktop rail scrolls internally: show a fade and a "More below" cue while form remains below. */
  function syncRailCue() {
    const f = $('form'), rail = document.querySelector('.rail');
    rail.classList.toggle('can-scroll', !narrowMQ.matches && f.scrollTop + f.clientHeight < f.scrollHeight - 8);
  }
  function setRailOpen(open) {
    document.querySelector('.rail').classList.toggle('is-open', open);
    $('railToggle').setAttribute('aria-expanded', String(open));
  }

  /* ---------- numbers that roll to their new value (split-flap style, one short ease) ---------- */
  const prevNums = new Map();
  function rollNumbers(scope, animate) {
    scope.querySelectorAll('[data-roll]').forEach((el) => {
      const key = el.dataset.roll, v = +el.dataset.v, d = +el.dataset.d || 0;
      const from = prevNums.get(key);
      prevNums.set(key, v);
      if (!animate || from == null || from === v || reduceMotion.matches) return;
      const t0 = performance.now(), dur = 520;
      const step = (now) => {
        const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(2, -10 * k);
        el.textContent = fmt.n(from + (v - from) * (k === 1 ? 1 : e), d);
        if (k < 1 && el.isConnected) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  /* ---------- scrollspy: the section nav marks whichever section is being read ---------- */
  let spy = null;
  function bindScrollSpy() {
    if (spy) spy.disconnect();
    const links = [...$('boardNav').querySelectorAll('a')];
    if (!links.length || !('IntersectionObserver' in window)) return;
    const mark = (id) => links.forEach((a) => a.toggleAttribute('aria-current', a.getAttribute('href') === '#' + id));
    const visible = new Map();
    // The sticky masthead now carries the section nav itself, so its real height (not a magic
    // number) is what a section needs to clear before it counts as "in view".
    const topOffset = Math.round(document.querySelector('.masthead').getBoundingClientRect().height) + 8;
    spy = new IntersectionObserver((entries) => {
      entries.forEach((en) => visible.set(en.target.id, en.isIntersecting ? en.intersectionRatio : 0));
      const top = links.map((a) => a.getAttribute('href').slice(1)).find((id) => visible.get(id) > 0);
      if (top) mark(top);
    }, { rootMargin: `-${topOffset}px 0px -55% 0px`, threshold: [0, 0.01, 0.2] });
    document.querySelectorAll('.board-section').forEach((s) => spy.observe(s));
    mark(links[0].getAttribute('href').slice(1));
  }

  /* ---------- render ---------- */
  let lastResult = null;
  let firstRender = true;
  let outlookChartW = null;
  function estimateChartW() {
    const bw = $('board').clientWidth;
    const pad = bw < 640 ? 32 : 56;
    return bw >= 900 ? Math.round((bw - pad) * 0.64) : bw - pad;
  }
  function paint(r, animate) {
    const board = $('board');
    const { html, nav } = FH.board.render(r, { outlookChartW, animate });
    board.innerHTML = html;
    return nav;
  }
  function update() {
    syncVisibility();
    FH.charts.hideTip();
    const input = toInput();
    const r = FH.assess.assess(input, { format: { mass: fmt.mass, kcal: fmt.kcal }, t: FH.i18nText.get(state.locale) });
    lastResult = r;
    const board = $('board');
    FH.chartWidth = board.clientWidth - 40;
    if (!outlookChartW) outlookChartW = estimateChartW();
    const animate = firstRender && !reduceMotion.matches;
    let nav = paint(r, animate);
    // The SVG is drawn at a width in user units; measure the column it landed in and redraw
    // once at exactly that width, so chart text renders at its intended size (no scaling).
    const col = board.querySelector('.outlook__chart');
    if (col && Math.abs(col.clientWidth - outlookChartW) > 16) { outlookChartW = col.clientWidth; nav = paint(r, animate); }
    $('boardNav').innerHTML = nav.map((n) => `<a href="#${n.id}">${fmt.esc(n.label)}</a>`).join('');
    (FH._binders || []).forEach((b) => b(board));
    rollNumbers(board, !firstRender);
    bindScrollSpy();
    if (r.ok && !r.isChild && r.healthyRange) {
      const hr = r.healthyRange;
      const prefix = state.locale === 'pl' ? 'Zdrowy zakres dla wzrostu: ' : 'Healthy range for your height: ';
      $('goalHint').textContent = `${prefix}${fmt.mass(hr.minKg)} – ${fmt.mass(hr.maxKg)}.`;
    } else $('goalHint').textContent = '';
    if (!r.ok && narrowMQ.matches) setRailOpen(true);
    railSummary();
    syncRailCue();
    firstRender = false;
    save();
  }

  let timer = null;
  const schedule = () => { clearTimeout(timer); timer = setTimeout(update, 180); };
  let shareBtnTimer = null;

  /* ---------- sections: Dashboard / Methods / Sources, all on one page ----------
   * The three buttons are a navigation, not an ARIA tablist: the Dashboard button also opens
   * its section links, and a tablist may hold nothing but tabs. */
  const TABS = ['dashboard', 'methods', 'sources'];
  function setDashboardMenu(open) {
    const group = $('dashGroup'), tab = $('tab-dashboard');
    if (!group || !tab) return;
    group.classList.toggle('is-menu-open', open);
    tab.setAttribute('aria-expanded', String(open));
  }
  function closeDashboardMenu() { setDashboardMenu(false); }
  function toggleDashboardMenu() { setDashboardMenu(!$('dashGroup').classList.contains('is-menu-open')); }
  function activateTab(name) {
    if (TABS.indexOf(name) < 0) return;
    if (name !== 'dashboard') closeDashboardMenu();
    TABS.forEach((t) => {
      const active = t === name;
      const btn = $('tab-' + t), panel = $('panel-' + t);
      if (active) btn.setAttribute('aria-current', 'page'); else btn.removeAttribute('aria-current');
      panel.hidden = !active;
    });
    document.body.dataset.tab = name;
    window.scrollTo({ top: 0 });
  }

  /* ---------- inline "?" hint tooltips (reuses the chart-tooltip element) ----------
   * Delegated on `document`: the board re-renders its whole subtree on every input change,
   * which would drop direct listeners on any .hint inside it. */
  function bindHints() {
    let openBtn = null;
    const show = (btn) => {
      const r = btn.getBoundingClientRect();
      FH.charts.showTip(fmt.esc(FH.i18n.t(btn.dataset.tip)), r.left + r.width / 2, r.bottom);
      openBtn = btn;
    };
    const hide = () => { FH.charts.hideTip(); openBtn = null; };
    document.addEventListener('mouseover', (e) => { const b = e.target.closest('.hint'); if (b) show(b); });
    document.addEventListener('mouseout', (e) => {
      const b = e.target.closest('.hint');
      if (b && !(e.relatedTarget && e.relatedTarget.closest('.hint'))) hide();
    });
    document.addEventListener('focusin', (e) => { const b = e.target.closest('.hint'); if (b) show(b); });
    document.addEventListener('focusout', (e) => { if (e.target.closest('.hint')) hide(); });
    document.addEventListener('click', (e) => {
      const b = e.target.closest('.hint');
      if (b) { e.preventDefault(); e.stopPropagation(); openBtn === b ? hide() : show(b); }
      else if (openBtn) hide();
    });
    window.addEventListener('scroll', () => { if (openBtn) hide(); }, { passive: true });
  }

  /* ---------- detail sheet: on-demand overlay for the deep dives (equation write-up, deficit
   * table). Built fresh from `lastResult` on open; focus moves in, is kept in, and returns. */
  let panelReturn = null;
  function openPanel(title, html) {
    panelReturn = document.activeElement;
    $('detailPanelTitle').textContent = title;
    $('detailPanelBody').innerHTML = html;
    $('detailPanel').hidden = false;
    document.body.classList.add('has-sheet');
    requestAnimationFrame(() => $('detailPanelClose').focus());
  }
  function closePanel() {
    if ($('detailPanel').hidden) return;
    $('detailPanel').hidden = true;
    document.body.classList.remove('has-sheet');
    FH.charts.hideTip();
    if (panelReturn && panelReturn.isConnected) panelReturn.focus();
  }
  function bindPanels() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('[data-panel-close]')) { closePanel(); return; }
      const trigger = e.target.closest('[data-panel-trigger]');
      if (!trigger || !lastResult || !lastResult.ok) return;
      const kind = trigger.dataset.panelTrigger;
      if (kind === 'bmr' && !lastResult.isChild) openPanel(FH.i18n.t('What you burn'), FH.board.renderBmrPanel(lastResult));
      else if (kind === 'deficits' && lastResult.plan) openPanel(FH.i18n.t('What different deficits do'), FH.board.renderDeficitPanel(lastResult));
    });
    document.addEventListener('keydown', (e) => {
      const panel = $('detailPanel');
      if (panel.hidden) return;
      if (e.key === 'Escape') { closePanel(); return; }
      if (e.key === 'Tab') {
        const f = [...panel.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')].filter((el) => el.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
      }
    });
  }

  function bind() {
    const form = $('form');
    form.addEventListener('input', () => { readForm(); schedule(); });
    form.addEventListener('change', () => { readForm(); schedule(); });
    form.addEventListener('submit', (e) => e.preventDefault());
    $('railToggle').addEventListener('click', () => setRailOpen(!document.querySelector('.rail').classList.contains('is-open')));
    $('form').addEventListener('scroll', syncRailCue, { passive: true });
    $('measure').addEventListener('toggle', syncRailCue);
    $('railMore').addEventListener('click', () => {
      const f = $('form'), top = f.clientHeight * 0.7, start = f.scrollTop;
      f.scrollBy({ top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      // Some Chromium setups never start a smooth element scroll, which left the button doing
      // nothing; jump instead when the form has not moved.
      setTimeout(() => { if (f.scrollTop === start) f.scrollBy({ top }); }, 200);
    });
    $('themeBtn').addEventListener('click', () => {
      theme = THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];
      try { localStorage.setItem(THEME_STORE, theme); } catch (e) { /* ignore */ }
      applyTheme();
    });
    document.addEventListener('click', (e) => {
      if (e.target.closest('#boardNav a')) { closeDashboardMenu(); return; }
      if (!e.target.closest('#dashGroup')) closeDashboardMenu();
    });
    document.addEventListener('click', (e) => {
      const tab = e.target.closest('.tabs [data-tab]');
      if (tab) {
        if (tab.id === 'tab-dashboard' && compactNavMQ.matches) {
          if (!tab.hasAttribute('aria-current')) activateTab(tab.dataset.tab);
          toggleDashboardMenu();
        } else activateTab(tab.dataset.tab);
        return;
      }
      const cite = e.target.closest('.cite-ref a');
      if (cite) {
        e.preventDefault();
        closePanel();
        activateTab('sources');
        requestAnimationFrame(() => {
          const li = $('ref-' + cite.dataset.ref);
          if (!li) return;
          li.scrollIntoView({ block: 'center' });
          li.classList.remove('is-flash'); void li.offsetWidth; li.classList.add('is-flash');
          setTimeout(() => li.classList.remove('is-flash'), 2400);
        });
        return;
      }
      const t = e.target.closest('button');
      if (!t) return;
      if (t.dataset.sex) { state.sex = t.dataset.sex; writeForm(); update(); }
      else if (t.dataset.activity) { state.activity = t.dataset.activity; writeForm(); update(); }
      else if (t.dataset.pace) {
        state.paceMode = t.dataset.pace;
        if (state.paceMode === 'intake' && lastResult && lastResult.plan) state.intakeKcal = Math.round(lastResult.plan.intake / 10) * 10;
        if (state.paceMode === 'weeks' && lastResult && lastResult.plan && lastResult.plan.days) state.weeks = Math.round(lastResult.plan.days / 7);
        writeForm(); update();
      }
      else if (t.dataset.refBtn) { state.childReference = t.dataset.refBtn; writeForm(); update(); }
      // State is kept in metric on every input, so switching units only re-renders (no rounding drift).
      else if (t.dataset.unitsBtn) { state.units = t.dataset.unitsBtn; writeForm(); update(); }
      else if (t.dataset.langBtn) { state.locale = t.dataset.langBtn; writeForm(); renderStaticTabs(); update(); }
    });
    document.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !$('dashGroup').classList.contains('is-menu-open')) return;
      closeDashboardMenu(); $('tab-dashboard').focus(); e.preventDefault();
    });
    // Arrow-key support inside radiogroups.
    document.addEventListener('keydown', (e) => {
      const t = e.target;
      if (!t.matches || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      if (!t.matches('[role="radio"]')) return;
      const group = [...t.closest('[role="radiogroup"]').querySelectorAll('[role="radio"]')];
      const i = group.indexOf(t) + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1);
      const next = group[(i + group.length) % group.length];
      next.focus(); next.click(); e.preventDefault();
    });
    $('shareBtn').addEventListener('click', () => {
      const btn = $('shareBtn');
      const render = (icon, key) => { btn.innerHTML = `${FH.icon(icon)}<span data-i18n="${key}">${FH.i18n.t(key)}</span>`; };
      const flash = (icon, key) => {
        render(icon, key);
        clearTimeout(shareBtnTimer);
        shareBtnTimer = setTimeout(() => render('link', 'Share'), 1600);
      };
      navigator.clipboard.writeText(shareURL()).then(() => flash('check', 'Link copied!'), () => flash('close', 'Copy failed'));
    });
    $('disclaimerClose').addEventListener('click', () => {
      $('disclaimerBar').hidden = true;
      try { localStorage.setItem(DISCLAIMER_STORE, '1'); } catch (e) { /* ignore */ }
    });
    $('resetBtn').addEventListener('click', () => { state = Object.assign({}, EXAMPLE, { units: state.units, locale: state.locale }); writeForm(); update(); });
    $('clearBtn').addEventListener('click', () => {
      state = Object.assign({}, EXAMPLE, { units: state.units, locale: state.locale, ageYears: null, heightCm: null, weightKg: null, waistCm: null, hipCm: null, neckCm: null, goalWeightKg: null });
      writeForm(); update(); $('ageYears').focus();
    });
  }

  // A link pasted into a tab that already has the app open changes only the fragment, which
  // does not reload the page, so apply it here too.
  window.addEventListener('hashchange', () => {
    const s = stateFromURL();
    if (!s) return;
    state = s;
    history.replaceState(null, '', location.pathname);
    writeForm(); renderStaticTabs(); update();
  });

  let lastW = 0;
  window.addEventListener('resize', () => {
    if (!compactNavMQ.matches) closeDashboardMenu();
    const w = $('board').clientWidth;
    if (Math.abs(w - lastW) > 40) { lastW = w; outlookChartW = null; schedule(); }
  });

  function renderStaticTabs() {
    $('methodsContent').innerHTML = FH.methods.renderMethods();
    $('sourcesContent').innerHTML = FH.methods.renderSources();
    $('sourcesCount').textContent = FH.refs.count;
  }

  function init() {
    $('app-version').textContent = 'v' + APP_VERSION;
    if ('serviceWorker' in navigator) window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
    // "#methods" / "#sources" (links from privacy.html) open that tab instead of the dashboard.
    const startTab = ['methods', 'sources'].find((t) => location.hash === '#' + t);
    if (location.search || location.hash) history.replaceState(null, '', location.pathname);
    // Locale must be set (from any saved state) before anything renders, or the Methods/
    // Sources tabs and the ethnicity/activity controls would render once in the wrong language.
    fmt.setLocale(state.locale);
    FH.i18n.setLocale(state.locale);
    document.documentElement.lang = state.locale;
    hydrateIcons(document);
    renderStaticTabs();
    bindHints();
    bindPanels();
    writeForm();
    bind();
    initDisclaimerBar();
    lastW = $('board').clientWidth;
    update();
    if (startTab) activateTab(startTab);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof self !== 'undefined' ? self : this);
