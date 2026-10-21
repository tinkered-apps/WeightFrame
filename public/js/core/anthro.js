/* Adult BMI, central adiposity, body-fat estimators and body-composition indices. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./stats.js'), require('./i18n-text.js'));
  else { root.FH = root.FH || {}; root.FH.anthro = factory(root.FH.stats, root.FH.i18nText); }
})(typeof self !== 'undefined' ? self : this, function (stats, i18nText) {
  const { median } = stats;

  /* Ethnic background groups. `lowerBmi` = NICE NG246 / WHO 2004 lower BMI action points
   * (23 / 27.5). Waist thresholds per IDF (Alberti 2005; single "increased risk" cut-off for Asian and
   * Latin American groups) and WHO 2008 (two-level thresholds for Europid-type values). */
  const ETHNICITY = {
    europid: { label: 'White / Europid', lowerBmi: false, waist: 'europid', fatTable: 'general' },
    southAsian: { label: 'South Asian', lowerBmi: true, waist: 'asian', fatTable: 'asian' },
    eastAsian: { label: 'Chinese / East or Southeast Asian', lowerBmi: true, waist: 'asian', fatTable: 'asian' },
    blackAfrican: { label: 'Black African / African-Caribbean', lowerBmi: true, waist: 'europid', fatTable: 'general' },
    middleEastern: { label: 'Middle Eastern / North African', lowerBmi: true, waist: 'europid', fatTable: 'general' },
    latino: { label: 'Hispanic / Latin American', lowerBmi: false, waist: 'asian', fatTable: 'general' },
    other: { label: 'Other / Prefer not to say', lowerBmi: false, waist: 'europid', fatTable: 'general' },
  };

  function eth(key) { return ETHNICITY[key] || ETHNICITY.other; }

  function bmi(weightKg, heightCm) {
    const h = heightCm / 100;
    return weightKg / (h * h);
  }

  function weightForBmi(bmiValue, heightCm) {
    const h = heightCm / 100;
    return bmiValue * h * h;
  }

  /* WHO 2000 adult classification, with NICE/WHO-2004 lower action points where applicable. */
  function adultBmiClass(b, ethnicity) {
    const lower = eth(ethnicity).lowerBmi;
    const ow = lower ? 23 : 25, ob = lower ? 27.5 : 30;
    const ob2 = lower ? 32.5 : 35, ob3 = lower ? 37.5 : 40;
    let cls;
    if (b < 16) cls = { key: 'thin3', label: 'Severe thinness', level: 3 };
    else if (b < 17) cls = { key: 'thin2', label: 'Moderate thinness', level: 2 };
    else if (b < 18.5) cls = { key: 'thin1', label: 'Mild thinness (underweight)', level: 1 };
    else if (b < ow) cls = { key: 'healthy', label: 'Healthy weight', level: 0 };
    else if (b < ob) cls = { key: 'overweight', label: 'Overweight', level: 1 };
    else if (b < ob2) cls = { key: 'obese1', label: 'Obesity class I', level: 2 };
    else if (b < ob3) cls = { key: 'obese2', label: 'Obesity class II', level: 3 };
    else cls = { key: 'obese3', label: 'Obesity class III', level: 4 };
    cls.thresholds = { underweight: 18.5, overweight: ow, obese: ob, obese2: ob2, obese3: ob3 };
    cls.lowerThresholds = lower;
    cls.refs = lower ? ['who2000', 'who2004asia', 'nice2025'] : ['who2000'];
    return cls;
  }

  function healthyWeightRange(heightCm, ethnicity) {
    const lower = eth(ethnicity).lowerBmi;
    const bmiMax = lower ? 23 : 25;
    return {
      bmiMin: 18.5, bmiMax,
      minKg: weightForBmi(18.5, heightCm),
      maxKg: weightForBmi(bmiMax, heightCm),
    };
  }

  /* ---- Central adiposity -------------------------------------------------------------- */

  function waistRisk(sex, waistCm, ethnicity) {
    if (!(waistCm > 0)) return null;
    const type = eth(ethnicity).waist;
    if (type === 'asian') {
      const t = sex === 'male' ? 90 : 80;
      return waistCm >= t
        ? { key: 'increased', label: 'Increased risk', level: 2, thresholds: [t], refs: ['idf2006'] }
        : { key: 'low', label: 'Not increased', level: 0, thresholds: [t], refs: ['idf2006'] };
    }
    const [t1, t2] = sex === 'male' ? [94, 102] : [80, 88];
    let r;
    if (waistCm >= t2) r = { key: 'high', label: 'Substantially increased risk', level: 3 };
    else if (waistCm >= t1) r = { key: 'increased', label: 'Increased risk', level: 2 };
    else r = { key: 'low', label: 'Not increased', level: 0 };
    r.thresholds = [t1, t2];
    r.refs = ['who2008waist', 'idf2006'];
    return r;
  }

  /* Waist-to-height ratio. Adults: NICE NG246 bands. Children (>= 5 y): 0.5 boundary
   * (McCarthy & Ashwell 2006), which is less discriminating in adolescents. */
  function whtr(waistCm, heightCm, isChild) {
    if (!(waistCm > 0)) return null;
    const v = waistCm / heightCm;
    let c;
    if (isChild) {
      c = v >= 0.5 ? { key: 'increased', label: 'Above 0.5: likely central fat excess', level: 2 }
        : { key: 'healthy', label: 'Below 0.5', level: 0 };
      c.refs = ['mccarthy2006'];
    } else {
      if (v >= 0.6) c = { key: 'high', label: 'High central adiposity', level: 3 };
      else if (v >= 0.5) c = { key: 'increased', label: 'Increased central adiposity', level: 2 };
      else if (v >= 0.4) c = { key: 'healthy', label: 'Healthy central adiposity', level: 0 };
      else c = { key: 'low', label: 'Below 0.4 (check for underweight)', level: 1 };
      c.refs = ['nice2025', 'ashwell2012'];
    }
    c.value = v;
    return c;
  }

  function whr(sex, waistCm, hipCm) {
    if (!(waistCm > 0 && hipCm > 0)) return null;
    const v = waistCm / hipCm;
    const t = sex === 'male' ? 0.9 : 0.85;
    const c = v >= t ? { key: 'high', label: 'Substantially increased risk', level: 3 }
      : { key: 'low', label: 'Below WHO risk threshold', level: 0 };
    c.value = v; c.threshold = t; c.refs = ['who2008waist'];
    return c;
  }

  /* ---- Body-fat estimators ------------------------------------------------------------ */
  // Each returns percent body fat, or null when inputs/age are out of the method's scope.

  /** US Navy circumference method: Hodgdon & Beckett 1984 density equations + Siri. */
  function bfNavy({ sex, age, heightCm, neckCm, waistCm, hipCm }) {
    if (age < 18 || !(neckCm > 0 && waistCm > 0)) return null;
    let density;
    if (sex === 'male') {
      if (waistCm - neckCm <= 0) return null;
      density = 1.0324 - 0.19077 * Math.log10(waistCm - neckCm) + 0.15456 * Math.log10(heightCm);
    } else {
      if (!(hipCm > 0) || waistCm + hipCm - neckCm <= 0) return null;
      density = 1.29579 - 0.35004 * Math.log10(waistCm + hipCm - neckCm) + 0.221 * Math.log10(heightCm);
    }
    return 495 / density - 450;
  }

  /** Relative fat mass: adults and 15-19 y (Woolcott 2018/2019); RFMp for 8-14 y. */
  function bfRfm({ sex, age, heightCm, waistCm }) {
    if (!(waistCm > 0) || age < 8) return null;
    const f = sex === 'female' ? 1 : 0;
    if (age < 15) return 74 - 22 * (heightCm / waistCm) + 5 * f;
    return 64 - 20 * (heightCm / waistCm) + 12 * f;
  }

  /** CUN-BAE (Gómez-Ambrosi 2012), adults 18-80 y. sex: 0 men, 1 women. */
  function bfCunBae({ sex, age, bmi: b }) {
    if (age < 18) return null;
    const s = sex === 'female' ? 1 : 0;
    return -44.988 + 0.503 * age + 10.689 * s + 3.172 * b - 0.026 * b * b + 0.181 * b * s
      - 0.02 * b * age - 0.005 * b * b * s + 0.00021 * b * b * age;
  }

  /** Deurenberg 1991: adult formula, and the children's formula for ages 7-15 y. sex: 1 male. */
  function bfDeurenberg({ sex, age, bmi: b }) {
    const s = sex === 'male' ? 1 : 0;
    if (age < 7) return null;
    if (age <= 15) return 1.51 * b - 0.7 * age - 3.6 * s + 1.4;
    return 1.2 * b + 0.23 * age - 10.8 * s - 5.4;
  }

  /** Gallagher 2000, 4-compartment equations (Eq. 5 White/African American; Eq. 6-7 Asian). */
  function bfGallagher({ sex, age, bmi: b, ethnicity }) {
    if (age < 18) return null;
    const inv = 1 / b;
    if (eth(ethnicity).fatTable === 'asian') {
      return sex === 'female' ? 64.8 - 752 * inv + 0.016 * age : 51.9 - 740 * inv + 0.029 * age;
    }
    const s = sex === 'male' ? 1 : 0;
    return 64.5 - 848 * inv + 0.079 * age - 16.4 * s + 0.05 * s * age + 39.0 * s * inv;
  }

  /** Jackson 2002 (HERITAGE) - the initial body-fat estimate used by the Hall 2011 model. */
  function bfJackson({ sex, age, bmi: b }) {
    return sex === 'male'
      ? 0.14 * age + 37.31 * Math.log(b) - 103.94
      : 0.14 * age + 39.96 * Math.log(b) - 102.01;
  }

  const ESTIMATORS = [
    { id: 'navy', name: 'US Navy (circumferences)', kind: 'circumference', fn: bfNavy, refs: ['hodgdon1984'],
      note: 'Needs neck and waist (women also hip). Men: waist at navel; women: narrowest waist.' },
    { id: 'rfm', name: 'Relative Fat Mass (height/waist)', kind: 'circumference', fn: bfRfm, refs: ['woolcott2018', 'woolcott2019'],
      note: 'Validated against DXA in NHANES; RFMp variant for 8-14 years.' },
    { id: 'cunbae', name: 'CUN-BAE (BMI, age, sex)', kind: 'bmi', fn: bfCunBae, refs: ['gomezambrosi2012'],
      note: 'Derived against air-displacement plethysmography in 6,510 white adults.' },
    { id: 'gallagher', name: 'Gallagher (BMI, age, sex, ethnicity)', kind: 'bmi', fn: bfGallagher, refs: ['gallagher2000'],
      note: '4-compartment reference; separate equations for Asian adults. Derived in adults with BMI ≤ 35.' },
    { id: 'deurenberg', name: 'Deurenberg (BMI, age, sex)', kind: 'bmi', fn: bfDeurenberg, refs: ['deurenberg1991'],
      note: 'Oldest BMI-based formula; has a separate children\'s version (7-15 y).' },
  ];

  /** All available body-fat estimates plus a consensus value and its basis. */
  function bodyFat(p) {
    const b = bmi(p.weightKg, p.heightCm);
    const input = Object.assign({}, p, { bmi: b, age: p.ageYears });
    // A formula pushed far outside its data returns values no body has (below 3% or above 65%):
    // leave it out rather than clamping it to a number that looks like a real reading. Gallagher
    // was derived in adults with BMI ≤ 35, so it is left out above that.
    const estimates = ESTIMATORS.map((e) => {
      const v = e.id === 'gallagher' && b > 35 ? null : e.fn(input);
      return { id: e.id, name: e.name, kind: e.kind, refs: e.refs, note: e.note,
        value: v != null && Number.isFinite(v) && v >= 3 && v <= 65 ? v : null };
    }).filter((e) => e.value != null);

    let consensus = null, basis;
    if (p.bodyFatPct > 0) {
      consensus = p.bodyFatPct; basis = 'measured';
    } else {
      const circ = estimates.filter((e) => e.kind === 'circumference').map((e) => e.value);
      const bmiBased = estimates.filter((e) => e.kind === 'bmi').map((e) => e.value);
      if (circ.length) { consensus = median(circ); basis = 'circumference'; }
      else if (bmiBased.length) { consensus = median(bmiBased); basis = 'bmi'; }
    }
    const values = estimates.map((e) => e.value);
    return {
      estimates, consensus, basis,
      spread: values.length ? [Math.min(...values), Math.max(...values)] : null,
    };
  }

  /* Gallagher 2000 Tables 4 (White/African American) and 5 (Asian): %fat matching BMI 18.5/25/30
   * at ages 20-39, 40-59, 60-79 y. Values: [lowBMI, BMI25, BMI30]. */
  const FAT_RANGES = {
    general: {
      female: [[21, 33, 39], [23, 34, 40], [24, 36, 42]],
      male: [[8, 20, 25], [11, 22, 28], [13, 25, 30]],
    },
    asian: {
      female: [[25, 35, 40], [25, 35, 41], [25, 36, 41]],
      male: [[13, 23, 28], [13, 24, 29], [14, 24, 29]],
    },
  };

  function bodyFatClass(pct, sex, age, ethnicity) {
    if (!(pct > 0) || age < 18) return null;
    const row = age < 40 ? 0 : age < 60 ? 1 : 2;
    const [lo, ow, ob] = FAT_RANGES[eth(ethnicity).fatTable][sex][row];
    let c;
    if (pct < lo) c = { key: 'low', label: 'Below healthy range', level: 1 };
    else if (pct < ow) c = { key: 'healthy', label: 'Healthy range', level: 0 };
    else if (pct < ob) c = { key: 'high', label: 'Above healthy (≈ overweight)', level: 2 };
    else c = { key: 'obese', label: 'Obesity range', level: 3 };
    c.range = { low: lo, overweight: ow, obese: ob };
    c.refs = ['gallagher2000'];
    return c;
  }

  /* Fat-mass index classes, Kelly 2009 Table 4: [underfat, normal-upper, overfat-upper,
   * obese1-upper, obese2-upper]. Below the first threshold is underfat, not "Normal". */
  function fmiClass(fmi, sex) {
    const t = sex === 'male' ? [3, 6, 9, 12, 15] : [5, 9, 13, 17, 21];
    const labels = ['Underfat', 'Normal', 'Excess fat', 'Obese class I', 'Obese class II', 'Obese class III'];
    let i = 0;
    while (i < t.length && fmi >= t[i]) i++;
    return { key: 'fmi' + i, label: labels[i], level: i === 0 ? 1 : Math.min(i - 1, 4), thresholds: t, refs: ['kelly2009'] };
  }

  function composition({ sex, ageYears, heightCm, weightKg, bodyFatPct }) {
    if (!(bodyFatPct > 0)) return null;
    const h = heightCm / 100;
    const fm = weightKg * bodyFatPct / 100;
    const ffm = weightKg - fm;
    const ffmi = ffm / (h * h);
    const out = {
      fatMassKg: fm, fatFreeMassKg: ffm,
      fmi: fm / (h * h), ffmi,
      ffmiNormalized: ffmi + 6.1 * (1.8 - h),
    };
    out.fmiClass = ageYears >= 18 ? fmiClass(out.fmi, sex) : null;
    return out;
  }

  /* Lancet Diabetes & Endocrinology Commission (Rubino 2025): BMI is only a surrogate; excess
   * adiposity should be confirmed by body-fat measurement or anthropometry (BMI ≥ 40 assumed). */
  /** @param T  locale text bundle from i18n-text.js; defaults to English. */
  function adiposityCheck({ bmiValue, bmiClass, waist, whtrC, whrC, fatClass, measuredFat }, T) {
    T = T || i18nText.EN;
    const flagKeys = [];
    if (waist && waist.level >= 2) flagKeys.push('waist');
    if (whtrC && whtrC.level >= 2) flagKeys.push('whtr');
    if (whrC && whrC.level >= 2) flagKeys.push('whr');
    const flags = flagKeys.map((k) => T.adiposityFlag[k]);
    const joined = T.adiposityJoin(flags);
    const anthroCount = [waist, whtrC, whrC].filter(Boolean).length;
    const bmiHigh = bmiValue >= bmiClass.thresholds.obese;
    const bmiOver = bmiValue >= bmiClass.thresholds.overweight;
    let status, text;
    if (bmiValue >= 40) {
      status = 'confirmed'; text = T.adiposity.over40();
    } else if (measuredFat && fatClass) {
      status = fatClass.level >= 2 ? 'confirmed' : 'not-confirmed';
      text = fatClass.level >= 2 ? T.adiposity.measuredConfirmed() : T.adiposity.measuredNotOver(bmiOver);
    } else if (bmiOver && flags.length) {
      status = 'confirmed'; text = T.adiposity.confirmedByFlags(joined);
    } else if (bmiOver && anthroCount === 0) {
      status = 'unknown'; text = T.adiposity.unknown();
    } else if (bmiOver) {
      status = 'not-confirmed'; text = T.adiposity.notConfirmed();
    } else if (flags.length >= 2) {
      status = 'possible'; text = T.adiposity.possible(joined);
    } else if (flags.length === 1) {
      status = 'watch'; text = T.adiposity.watch(flags[0]);
    } else {
      status = 'none'; text = anthroCount ? T.adiposity.noneAnthro() : T.adiposity.noneBmi();
    }
    return { status, text, flags: flagKeys, bmiHigh, refs: ['rubino2025'] };
  }

  return {
    ETHNICITY, bmi, weightForBmi, adultBmiClass, healthyWeightRange,
    waistRisk, whtr, whr,
    bfNavy, bfRfm, bfCunBae, bfDeurenberg, bfGallagher, bfJackson, bodyFat, ESTIMATORS,
    bodyFatClass, fmiClass, composition, adiposityCheck, FAT_RANGES,
  };
});
