/* Formatting, unit conversion and small HTML helpers for the UI. */
(function (root) {
  const FH = root.FH = root.FH || {};
  const LB = 0.45359237, IN = 2.54;
  // BCP-47 tag per app locale. Intl handles the rest: comma decimals and space-grouped
  // thousands for pl-PL, Polish month names in dates, etc. - no manual formatting needed.
  const BCP47 = { en: 'en-GB', pl: 'pl-PL' };
  let locale = 'en';
  let NF, dateFmt, shortDate;
  function buildIntl() {
    const tag = BCP47[locale] || 'en-GB';
    const nf = (d) => new Intl.NumberFormat(tag, { minimumFractionDigits: d, maximumFractionDigits: d });
    NF = [nf(0), nf(1), nf(2)];
    dateFmt = new Intl.DateTimeFormat(tag, { day: 'numeric', month: 'short', year: 'numeric' });
    shortDate = new Intl.DateTimeFormat(tag, { month: 'short', year: '2-digit' });
  }
  buildIntl();

  let units = 'metric';

  const fmt = {
    setUnits(u) { units = u; },
    get units() { return units; },
    setLocale(l) { locale = l; buildIntl(); },
    get locale() { return locale; },
    n(v, d = 0) { return v == null || !Number.isFinite(v) ? '–' : NF[d].format(v); },
    kcal(v) { return fmt.n(Math.round(v / 10) * 10); },
    kcalExact(v) { return fmt.n(v); },
    // mass in display units
    massVal(kg) { return units === 'metric' ? kg : kg / LB; },
    massUnit() { return units === 'metric' ? 'kg' : 'lb'; },
    mass(kg, d = 1) { return fmt.n(fmt.massVal(kg), d) + ' ' + fmt.massUnit(); },
    massDelta(kg, d = 1) { return (kg > 0 ? '+' : kg < 0 ? '−' : '') + fmt.n(Math.abs(fmt.massVal(kg)), d) + ' ' + fmt.massUnit(); },
    circ(cm, d = 1) { return units === 'metric' ? fmt.n(cm, d) + ' cm' : fmt.n(cm / IN, d) + ' in'; },
    height(cm) {
      if (units === 'metric') return fmt.n(cm, 0) + ' cm';
      const tin = cm / IN; const ft = Math.floor(tin / 12); const inch = Math.round(tin - ft * 12);
      return ft + '′ ' + inch + '″';
    },
    pct(v, d = 0) { return fmt.n(v, d) + '%'; },
    date(daysFromNow) { const t = new Date(); t.setHours(12, 0, 0, 0); t.setDate(t.getDate() + Math.round(daysFromNow)); return dateFmt.format(t); },
    shortDate(daysFromNow) { const t = new Date(); t.setDate(t.getDate() + Math.round(daysFromNow)); return shortDate.format(t); },
    // No trailing dot on "tyg" (unlike "tyg.") - several call sites embed this at the end of
    // a Polish sentence, and "tyg.." (abbreviation dot + sentence dot) reads as a typo.
    weeks(days) { return fmt.n(days / 7, 0) + (locale === 'pl' ? ' tyg' : ' weeks'); },
    ordinal(p) {
      const v = p >= 99.95 ? '>99.9' : p < 0.1 ? '<0.1' : (p >= 90 || p < 10) ? fmt.n(p, 1) : fmt.n(p, 0);
      return v;
    },
    esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); },
    // Numbered footnote-style citations — small superscript [n], not loud inline chips.
    // Clicking jumps to the Sources tab (see app.js) and flashes the matching entry.
    cite(ids) {
      if (!ids || !ids.length) return '';
      const uniq = [...new Set(ids)].map((id) => FH.refs.get(id)).sort((a, b) => a.num - b.num);
      const inner = uniq.map((r) => `<a href="#ref-${r.id}" data-ref="${r.id}" title="${fmt.esc(r.tag)} – ${fmt.esc(r.cite)}">${r.num}</a>`).join(',');
      return `<sup class="cite-ref">[${inner}]</sup>`;
    },
    pill(label, level) { return '<span class="pill" data-level="' + level + '">' + fmt.esc(label) + '</span>'; },
    LB, IN,
  };
  FH.fmt = fmt;
})(typeof self !== 'undefined' ? self : this);
