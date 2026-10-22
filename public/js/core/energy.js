/* Resting/basal metabolic rate equations, equation selection, and total energy expenditure. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./stats.js'), require('./i18n-text.js'));
  else { root.FH = root.FH || {}; root.FH.energy = factory(root.FH.stats, root.FH.i18nText); }
})(typeof self !== 'undefined' ? self : this, function (stats, i18nText) {
  const { median } = stats;
  const MJ = 239.0057; // kcal per MJ

  // Band helper: bands are [minAge, maxAgeExclusive, ...coefficients].
  function band(bands, age) {
    return bands.find((b) => age >= b[0] && age < b[1]) || null;
  }

  /* Schofield 1985 / FAO-WHO-UNU 1985, weight only (kcal/d). */
  const SCHOFIELD_W = {
    male: [[0, 3, 59.512, -30.4], [3, 10, 22.706, 504.3], [10, 18, 17.686, 658.2],
      [18, 30, 15.057, 692.2], [30, 60, 11.472, 873.1], [60, 200, 11.711, 587.7]],
    female: [[0, 3, 58.317, -31.1], [3, 10, 20.315, 485.9], [10, 18, 13.384, 692.6],
      [18, 30, 14.818, 486.6], [30, 60, 8.126, 845.6], [60, 200, 9.082, 658.5]],
  };
  /* Schofield 1985 weight + height (height in metres), children, as tabulated by ESPGHAN 2005. */
  const SCHOFIELD_WH = {
    male: [[0, 3, 0.167, 1517.4, -617.6], [3, 10, 19.6, 130.3, 414.9], [10, 18, 16.25, 137.2, 515.5]],
    female: [[0, 3, 16.25, 1023.2, -413.5], [3, 10, 16.97, 161.8, 371.2], [10, 18, 8.365, 465, 200]],
  };
  /* Henry 2005 (Oxford), weight only, MJ/d. */
  const HENRY_W = {
    male: [[0, 3, 0.255, -0.141], [3, 10, 0.0937, 2.15], [10, 18, 0.0769, 2.43],
      [18, 30, 0.0669, 2.28], [30, 60, 0.0592, 2.48], [60, 200, 0.0563, 2.15]],
    female: [[0, 3, 0.246, -0.0965], [3, 10, 0.0842, 2.12], [10, 18, 0.0465, 3.18],
      [18, 30, 0.0546, 2.33], [30, 60, 0.0407, 2.9], [60, 200, 0.0424, 2.38]],
  };

  /* Each equation: id, name, refs, minAge/maxAge scope, needsFfm, fn(p) -> kcal/d. */
  const BMR_EQUATIONS = [
    { id: 'msj', name: 'Mifflin-St Jeor (1990)', short: 'Mifflin-St Jeor', refs: ['mifflin1990', 'frankenfield2005'], minAge: 18,
      fn: (p) => 10 * p.weightKg + 6.25 * p.heightCm - 5 * p.ageYears + (p.sex === 'male' ? 5 : -161), },
    { id: 'hb', name: 'Harris-Benedict (1919, original)', short: 'Harris-Benedict 1919', refs: ['harris1918', 'oneill2023'], minAge: 10,
      fn: (p) => p.sex === 'male'
        ? 66.473 + 13.7516 * p.weightKg + 5.0033 * p.heightCm - 6.755 * p.ageYears
        : 655.0955 + 9.5634 * p.weightKg + 1.8496 * p.heightCm - 4.6756 * p.ageYears, },
    { id: 'hbrs', name: 'Harris-Benedict (Roza-Shizgal 1984)', short: 'H-B revised 1984', refs: ['roza1984'], minAge: 18,
      fn: (p) => p.sex === 'male'
        ? 88.362 + 13.397 * p.weightKg + 4.799 * p.heightCm - 5.677 * p.ageYears
        : 447.593 + 9.247 * p.weightKg + 3.098 * p.heightCm - 4.33 * p.ageYears, },
    { id: 'owen', name: 'Owen (1986/1987)', short: 'Owen', refs: ['owen1986', 'owen1987'], minAge: 18,
      fn: (p) => (p.sex === 'male' ? 879 + 10.2 * p.weightKg : 795 + 7.18 * p.weightKg), },
    { id: 'schofield', name: 'Schofield / WHO-FAO-UNU (1985)', short: 'Schofield / WHO', refs: ['schofield1985'], minAge: 0,
      fn: (p) => { const b = band(SCHOFIELD_W[p.sex], p.ageYears); return b && b[2] * p.weightKg + b[3]; }, },
    { id: 'schofieldWH', name: 'Schofield weight + height (1985)', short: 'Schofield W+H', refs: ['schofield1985', 'espghan2005'], minAge: 0, maxAge: 18,
      fn: (p) => { const b = band(SCHOFIELD_WH[p.sex], p.ageYears); return b && b[2] * p.weightKg + b[3] * (p.heightCm / 100) + b[4]; }, },
    { id: 'henry', name: 'Henry / Oxford (2005)', short: 'Henry / Oxford', refs: ['henry2005'], minAge: 0,
      fn: (p) => { const b = band(HENRY_W[p.sex], p.ageYears); return b && (b[2] * p.weightKg + b[3]) * MJ; }, },
    { id: 'livingston', name: 'Livingston-Kohlstadt (2005)', short: 'Livingston', refs: ['livingston2005'], minAge: 18,
      fn: (p) => (p.sex === 'male'
        ? 293 * Math.pow(p.weightKg, 0.433) - 5.92 * p.ageYears
        : 248 * Math.pow(p.weightKg, 0.4356) - 5.09 * p.ageYears), },
    { id: 'cunningham80', name: 'Cunningham (1980)', short: 'Cunningham 1980', refs: ['cunningham1980', 'oneill2023'], minAge: 18, needsFfm: true,
      fn: (p) => 500 + 22 * p.ffmKg, },
    { id: 'katch', name: 'Katch-McArdle / Cunningham (1991)', short: 'Katch-McArdle', refs: ['cunningham1991'], minAge: 18, needsFfm: true,
      fn: (p) => 370 + 21.6 * p.ffmKg, },
  ];

  function applicable(eq, p) {
    if (p.ageYears < eq.minAge) return false;
    if (eq.maxAge != null && p.ageYears >= eq.maxAge) return false;
    if (eq.needsFfm && !(p.ffmKg > 0)) return false;
    return true;
  }

  /* Evidence-based choice of the primary equation.
   *  - Children: Schofield W+H (ESPGHAN/ESPEN 2005, grade B).
   *  - Athletes with measured FFM: Cunningham 1980 (unbiased in O'Neill 2023 meta-analysis; confirmed by ten Haaf 2014).
   *  - Athletes without FFM: Harris-Benedict 1919 (unbiased in athletes; Mifflin under-predicts there).
   *  - Everyone else: Mifflin-St Jeor (Frankenfield 2005 systematic review; also for obesity).
   * Actual (not adjusted) body weight is used throughout (Frankenfield & Ashcraft 2011). */
  function chooseBmr(p, T) {
    if (p.ageYears < 18) {
      return { id: 'schofieldWH', reason: T.bmrReason.child, refs: ['espghan2005', 'schofield1985'] };
    }
    const measuredFfm = p.ffmKg > 0 && p.ffmMeasured;
    if (p.athlete && measuredFfm) {
      return { id: 'cunningham80', reason: T.bmrReason.athleteMeasured, refs: ['oneill2023', 'cunningham1980'] };
    }
    if (p.athlete) {
      return { id: 'hb', reason: T.bmrReason.athlete, refs: ['oneill2023', 'harris1918'] };
    }
    return { id: 'msj', reason: T.bmrReason.general, refs: ['frankenfield2005', 'frankenfield2013', 'mifflin1990'] };
  }

  /** @param T  locale text bundle from i18n-text.js; defaults to English.
   *  @param choiceOverride  optional user pick from the "resting metabolism model" form field:
   *    'median' selects the median of all applicable equations as a synthetic primary; a
   *    BMR_EQUATIONS id selects that equation directly if it's applicable right now; anything
   *    else (unset, or an id that isn't applicable - e.g. an FFM equation with no body-fat %
   *    entered) falls back to the evidence-based auto-choice, same as before this param existed. */
  function bmrAll(p, T, choiceOverride) {
    T = T || i18nText.EN;
    const rows = BMR_EQUATIONS.map((eq) => {
      const ok = applicable(eq, p);
      const v = ok ? eq.fn(p) : null;
      return { id: eq.id, name: eq.name, short: eq.short, refs: eq.refs, summary: T.bmrSummary[eq.id], needsFfm: !!eq.needsFfm,
        applicable: ok && v != null && Number.isFinite(v), value: ok && Number.isFinite(v) ? v : null };
    });
    const weightBased = rows.filter((r) => r.applicable && !r.needsFfm).map((r) => r.value);
    const all = rows.filter((r) => r.applicable).map((r) => r.value);
    const consensus = median(weightBased);

    let primary, reason, reasonRefs;
    const chosenRow = choiceOverride && choiceOverride !== 'median' ? rows.find((r) => r.id === choiceOverride && r.applicable) : null;
    if (choiceOverride === 'median') {
      primary = { id: 'median', name: T.bmrMedianName ? T.bmrMedianName() : 'Median of weight-based equations', refs: [], applicable: true, value: consensus };
      reason = T.bmrReason.median; reasonRefs = [];
    } else if (chosenRow) {
      primary = chosenRow; reason = chosenRow.summary; reasonRefs = chosenRow.refs;
    } else {
      const choice = chooseBmr(p, T);
      primary = rows.find((r) => r.id === choice.id && r.applicable) || rows.find((r) => r.id === 'msj' && r.applicable) || rows.find((r) => r.applicable);
      reason = choice.reason; reasonRefs = choice.refs;
    }

    const notes = [];
    if (p.ageYears >= 18 && (p.ethnicity === 'eastAsian' || p.ethnicity === 'southAsian')) {
      notes.push(T.bmrNotes.asian);
    }
    if (p.ageYears >= 60) notes.push(T.bmrNotes.older);
    return {
      rows, primary, reason, reasonRefs,
      consensus, spread: all.length ? [Math.min(...all), Math.max(...all)] : null, notes,
    };
  }

  /* ---- Total energy expenditure (National Academies 2023) -------------------------------- */

  const ACTIVITY = {
    inactive: { label: 'Inactive', desc: 'Daily living only; mostly sitting, no regular exercise.' },
    low: { label: 'Low active', desc: 'About 30–60 min of moderate activity (e.g. brisk walking) on top of daily living.' },
    active: { label: 'Active', desc: 'Roughly 1–2 h of moderate activity or ~1 h including vigorous exercise daily.' },
    veryActive: { label: 'Very active', desc: 'Physically demanding job or 2+ h of daily vigorous training.' },
  };

  // NASEM 2023 Table S-1. Coefficients: [intercept, age, height(cm), weight(kg)].
  const NASEM = {
    adult: {
      male: { inactive: [753.07, -10.83, 6.50, 14.10], low: [581.47, -10.83, 8.30, 14.94],
        active: [1004.82, -10.83, 6.52, 15.91], veryActive: [-517.88, -10.83, 15.61, 19.11] },
      female: { inactive: [584.90, -7.01, 5.72, 11.71], low: [575.77, -7.01, 6.60, 12.14],
        active: [710.25, -7.01, 6.54, 12.34], veryActive: [511.83, -7.01, 9.07, 12.56] },
    },
    child: { // 3 through 18 years
      male: { inactive: [-447.51, 3.68, 13.01, 13.15], low: [19.12, 3.68, 8.62, 20.28],
        active: [-388.19, 3.68, 12.66, 20.46], veryActive: [-671.75, 3.68, 15.38, 23.25] },
      female: { inactive: [55.59, -22.25, 8.43, 17.07], low: [-297.54, -22.25, 12.77, 14.73],
        active: [-189.55, -22.25, 11.74, 18.34], veryActive: [-709.59, -22.25, 18.22, 14.25] },
    },
    toddler: { male: [-716.45, -1.0, 17.82, 15.06], female: [-69.15, 80.0, 2.65, 54.15] },
    rmse: { adult: { male: 339, female: 246 }, child: { male: 259, female: 237 }, toddler: { male: 104, female: 95 } },
  };

  // Energy cost of growth (kcal/d) added to TEE to give EER (NASEM 2023 Table S-2).
  function growthEnergy(sex, ageYears) {
    if (ageYears >= 19) return 0;
    if (ageYears < 3) return sex === 'male' ? 20 : 15; // 12-35.99 months
    if (ageYears < 4) return sex === 'male' ? 20 : 15;
    if (ageYears < 9) return 15;
    if (ageYears < 14) return sex === 'male' ? 25 : 30;
    return 20;
  }

  // NASEM 2023 PAL category boundaries (doubly-labelled-water quartiles), Chapter 5.
  const PAL_BANDS = {
    adult: [1.53, 1.68, 1.85],
    '3-8': [1.31, 1.44, 1.59],
    '9-13': [1.44, 1.59, 1.77],
    '14-18': [1.56, 1.73, 1.92],
  };
  // Representative PAL used for the factorial (BMR x PAL) cross-check, inside each band.
  const PAL_TYPICAL = {
    adult: { inactive: 1.45, low: 1.6, active: 1.76, veryActive: 2.1 },
    '3-8': { inactive: 1.25, low: 1.37, active: 1.51, veryActive: 1.75 },
    '9-13': { inactive: 1.37, low: 1.51, active: 1.68, veryActive: 1.95 },
    '14-18': { inactive: 1.48, low: 1.64, active: 1.82, veryActive: 2.1 },
  };

  function palGroup(ageYears) {
    if (ageYears >= 19) return 'adult';
    if (ageYears < 9) return '3-8';
    if (ageYears < 14) return '9-13';
    return '14-18';
  }

  function nasemEer({ sex, ageYears, heightCm, weightKg, activity }) {
    let c, rmse, group;
    if (ageYears < 3) { c = NASEM.toddler[sex]; rmse = NASEM.rmse.toddler[sex]; group = 'toddler'; }
    else if (ageYears < 19) { c = NASEM.child[sex][activity]; rmse = NASEM.rmse.child[sex]; group = 'child'; }
    else { c = NASEM.adult[sex][activity]; rmse = NASEM.rmse.adult[sex]; group = 'adult'; }
    const tee = c[0] + c[1] * ageYears + c[2] * heightCm + c[3] * weightKg;
    const growth = growthEnergy(sex, ageYears);
    return { tee, growth, eer: tee + growth, rmse, group, refs: ['nasem2023'] };
  }

  function tdee(p, bmrValue) {
    const n = nasemEer(p);
    const group = palGroup(p.ageYears);
    const pal = p.customPal > 0 ? p.customPal : PAL_TYPICAL[group][p.activity];
    const factorial = bmrValue * pal + growthEnergy(p.sex, p.ageYears);
    return {
      primary: n.eer,
      nasem: n,
      factorial: { value: factorial, pal, refs: ['fao2004', 'nasem2023'] },
      impliedPal: n.tee / bmrValue,
      range68: [n.eer - n.rmse, n.eer + n.rmse],
      range95: [n.eer - 1.96 * n.rmse, n.eer + 1.96 * n.rmse],
      palBands: PAL_BANDS[group],
      palGroup: group,
    };
  }

  return { BMR_EQUATIONS, bmrAll, chooseBmr, ACTIVITY, NASEM, nasemEer, tdee, growthEnergy, PAL_BANDS, PAL_TYPICAL, palGroup, MJ };
});
