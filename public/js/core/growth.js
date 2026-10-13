/* Children's BMI-for-age: CDC 2000 (+ 2022 extended method above P95) and WHO 2006/2007. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./stats.js'), require('../data/growth-refs.js'));
  } else {
    root.FH = root.FH || {};
    root.FH.growth = factory(root.FH.stats, root.FH.growthData);
  }
})(typeof self !== 'undefined' ? self : this, function (stats, data) {
  const { normCdf, normInv, lmsZ, lmsValue, interpRows } = stats;
  const DAYS_PER_MONTH = 30.4375;
  const Z95 = normInv(0.95);

  // Wei et al. 2020, Table 3: sigma of the half-normal distribution above P95 (age in years).
  const WEI_SIGMA = { male: [0.3728, 0.5196, -0.0091], female: [0.8334, 0.3712, -0.0011] };

  const CDC_MIN = 24, CDC_MAX = 240.5; // months
  const WHO_MIN_MONTHS = 24, WHO_MAX_MONTHS = 228;

  /* CDC convention: "age is listed at the half month point for the entire month" - a child aged
   * 144.0-144.99 months uses the 144.5 row. */
  function cdcLms(sex, ageMonths) {
    const a = Math.min(Math.max(Math.floor(ageMonths) + 0.5, CDC_MIN), CDC_MAX);
    return interpRows(data.cdc2000[sex], a);
  }

  function whoLms(sex, ageMonths) {
    if (ageMonths < 61) {
      const days = Math.min(ageMonths * DAYS_PER_MONTH, 1856);
      return { lms: interpRows(data.who2006[sex], days), table: 'who2006' };
    }
    const m = Math.min(ageMonths, WHO_MAX_MONTHS);
    return { lms: interpRows(data.who2007[sex], m), table: 'who2007' };
  }

  /* WHO "restricted application of the LMS method": beyond |z| = 3 the distance between
   * the 2 SD and 3 SD curves is used as a fixed step (WHO 2006 technical report). */
  function whoZ(x, L, M, S) {
    const z = lmsZ(x, L, M, S);
    if (z > 3) {
      const sd3 = lmsValue(3, L, M, S), sd2 = lmsValue(2, L, M, S);
      return 3 + (x - sd3) / (sd3 - sd2);
    }
    if (z < -3) {
      const sd3 = lmsValue(-3, L, M, S), sd2 = lmsValue(-2, L, M, S);
      return -3 + (x - sd3) / (sd2 - sd3);
    }
    return z;
  }

  function weiSigma(sex, ageYears) {
    const [c0, c1, c2] = WEI_SIGMA[sex];
    return c0 + c1 * ageYears + c2 * ageYears * ageYears;
  }

  function cdcAssess(sex, ageMonths, bmi) {
    const [L, M, S] = cdcLms(sex, ageMonths);
    const p95 = lmsValue(Z95, L, M, S);
    let z = lmsZ(bmi, L, M, S), pct = normCdf(z) * 100, extended = false;
    if (bmi >= p95) {
      const sigma = weiSigma(sex, ageMonths / 12);
      pct = 90 + 10 * normCdf((bmi - p95) / sigma);
      z = normInv(Math.min(pct / 100, 1 - 1e-12));
      extended = true;
    }
    const pctOfP95 = (bmi / p95) * 100;
    let cat;
    if (pct < 5) cat = { key: 'under', label: 'Underweight', level: 2 };
    else if (pct < 85) cat = { key: 'healthy', label: 'Healthy weight', level: 0 };
    else if (pct < 95) cat = { key: 'overweight', label: 'Overweight', level: 1 };
    else if (pctOfP95 >= 140 || bmi >= 40) cat = { key: 'obese3', label: 'Severe obesity (class 3)', level: 4 };
    else if (pctOfP95 >= 120 || bmi >= 35) cat = { key: 'obese2', label: 'Severe obesity (class 2)', level: 3 };
    else cat = { key: 'obese1', label: 'Obesity (class 1)', level: 2 };
    return {
      reference: 'cdc', table: 'cdc2000', z, percentile: pct, extended, pctOfP95, category: cat,
      cutoffs: {
        p5: lmsValue(normInv(0.05), L, M, S), p50: M, p85: lmsValue(normInv(0.85), L, M, S), p95,
      },
      healthyBmi: [lmsValue(normInv(0.05), L, M, S), lmsValue(normInv(0.85), L, M, S)],
      refs: extended ? ['cdc2000', 'cole1990', 'wei2020', 'cdc2022ext', 'hampl2023'] : ['cdc2000', 'cole1990', 'hampl2023'],
    };
  }

  function whoAssess(sex, ageMonths, bmi) {
    const { lms, table } = whoLms(sex, ageMonths);
    const [L, M, S] = lms;
    const z = whoZ(bmi, L, M, S);
    const pct = normCdf(z) * 100;
    let cat;
    if (table === 'who2006') {
      if (z > 3) cat = { key: 'obese1', label: 'Obesity', level: 3 };
      else if (z > 2) cat = { key: 'overweight', label: 'Overweight', level: 2 };
      else if (z > 1) cat = { key: 'risk', label: 'Possible risk of overweight', level: 1 };
      else if (z < -3) cat = { key: 'under', label: 'Severe wasting (BMI-for-age)', level: 3 };
      else if (z < -2) cat = { key: 'under', label: 'Wasting (BMI-for-age)', level: 2 };
      else cat = { key: 'healthy', label: 'Healthy weight', level: 0 };
    } else {
      if (z > 2) cat = { key: 'obese1', label: 'Obesity', level: 3 };
      else if (z > 1) cat = { key: 'overweight', label: 'Overweight', level: 1 };
      else if (z < -3) cat = { key: 'under', label: 'Severe thinness', level: 3 };
      else if (z < -2) cat = { key: 'under', label: 'Thinness', level: 2 };
      else cat = { key: 'healthy', label: 'Healthy weight', level: 0 };
    }
    return {
      reference: 'who', table, z, percentile: pct, extended: false, pctOfP95: null, category: cat,
      cutoffs: { sdNeg2: lmsValue(-2, L, M, S), median: M, sd1: lmsValue(1, L, M, S), sd2: lmsValue(2, L, M, S) },
      healthyBmi: [lmsValue(-2, L, M, S), lmsValue(1, L, M, S)],
      refs: table === 'who2006' ? ['who2006', 'cole1990'] : ['deonis2007', 'cole1990'],
    };
  }

  /** Main entry. Returns null when age is outside 2-20 y (CDC) / 2-19 y (WHO). */
  function childBmi({ sex, ageMonths, bmi, reference }) {
    if (reference === 'who') {
      if (ageMonths < WHO_MIN_MONTHS || ageMonths > WHO_MAX_MONTHS) return null;
      return whoAssess(sex, ageMonths, bmi);
    }
    if (ageMonths < CDC_MIN || ageMonths > CDC_MAX) return null;
    return cdcAssess(sex, ageMonths, bmi);
  }

  /** BMI value at a given percentile for charting and target ranges. */
  function bmiAtPercentile(sex, ageMonths, pct, reference) {
    const z = normInv(pct / 100);
    if (reference === 'who') {
      const { lms } = whoLms(sex, ageMonths);
      return lmsValue(z, lms[0], lms[1], lms[2]);
    }
    const [L, M, S] = cdcLms(sex, ageMonths);
    if (pct > 95) {
      const p95 = lmsValue(Z95, L, M, S);
      return p95 + normInv((pct - 90) / 10) * weiSigma(sex, ageMonths / 12);
    }
    return lmsValue(z, L, M, S);
  }

  /** Percentile curves (age in years vs BMI) for a chart, sampled every `step` months. */
  function curves(sex, reference, percentiles, fromMonths, toMonths, step) {
    const out = {};
    const lo = Math.max(fromMonths, 24), hi = Math.min(toMonths, reference === 'who' ? WHO_MAX_MONTHS : 240);
    for (const p of percentiles) {
      const pts = [];
      for (let m = lo; m <= hi + 1e-9; m += step) pts.push([m / 12, bmiAtPercentile(sex, m, p, reference)]);
      out[p] = pts;
    }
    return out;
  }

  return { childBmi, bmiAtPercentile, curves, weiSigma, whoZ };
});
