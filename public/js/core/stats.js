/* Numerical helpers: normal distribution, LMS transform, interpolation. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.FH = root.FH || {}; root.FH.stats = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  /** Standard normal CDF, Hart (1968) algorithm 5666 as given by West (2005); ~1e-15 accuracy. */
  function normCdf(x) {
    const a = Math.abs(x);
    let c;
    if (a > 37) {
      c = 0;
    } else {
      const e = Math.exp(-a * a / 2);
      if (a < 7.07106781186547) {
        let n = 3.52624965998911e-2 * a + 0.700383064443688;
        n = n * a + 6.37396220353165; n = n * a + 33.912866078383; n = n * a + 112.079291497871;
        n = n * a + 221.213596169931; n = n * a + 220.206867912376;
        let d = 8.83883476483184e-2 * a + 1.75566716318264;
        d = d * a + 16.064177579207; d = d * a + 86.7807322029461; d = d * a + 296.564248779674;
        d = d * a + 637.333633378831; d = d * a + 793.826512519948; d = d * a + 440.413735824752;
        c = e * n / d;
      } else {
        let d = a + 0.65;
        d = a + 4 / d; d = a + 3 / d; d = a + 2 / d; d = a + 1 / d;
        c = e / d / 2.506628274631;
      }
    }
    return x > 0 ? 1 - c : c;
  }

  /** Inverse standard normal CDF (Acklam 2003, refined with one Halley step). */
  function normInv(p) {
    if (!(p > 0 && p < 1)) {
      if (p === 0) return -Infinity;
      if (p === 1) return Infinity;
      return NaN;
    }
    const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
    const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
    const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
    const pl = 0.02425;
    let x;
    if (p < pl) {
      const q = Math.sqrt(-2 * Math.log(p));
      x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= 1 - pl) {
      const q = p - 0.5, r = q * q;
      x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      const q = Math.sqrt(-2 * Math.log(1 - p));
      x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    const e = normCdf(x) - p;
    const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
    return x - u / (1 + (x * u) / 2);
  }

  /** LMS z-score (Cole 1990). */
  function lmsZ(x, L, M, S) {
    if (Math.abs(L) < 1e-12) return Math.log(x / M) / S;
    return (Math.pow(x / M, L) - 1) / (L * S);
  }

  /** Measurement value at a given z-score for LMS parameters. */
  function lmsValue(z, L, M, S) {
    if (Math.abs(L) < 1e-12) return M * Math.exp(S * z);
    return M * Math.pow(1 + L * S * z, 1 / L);
  }

  /** Linear interpolation of [x, ...values] rows sorted by x. Returns null outside range. */
  function interpRows(rows, x) {
    if (!rows.length || x < rows[0][0] || x > rows[rows.length - 1][0]) return null;
    let lo = 0, hi = rows.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (rows[mid][0] <= x) lo = mid; else hi = mid;
    }
    const a = rows[lo], b = rows[hi];
    if (a[0] === x || a === b) return a.slice(1);
    const f = (x - a[0]) / (b[0] - a[0]);
    return a.slice(1).map((v, i) => v + f * (b[i + 1] - v));
  }

  function clamp(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }

  function median(values) {
    const v = values.filter(Number.isFinite).slice().sort((p, q) => p - q);
    if (!v.length) return NaN;
    const m = v.length >> 1;
    return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
  }

  /** Largest-remainder rounding: parts rounded to `d` decimals that still add up to the rounded
   *  total shown beside them (10.1 + 2.9 + 1.0 = 14.0, never 13.9 or 14.1). */
  function roundParts(values, d) {
    const k = Math.pow(10, d), total = Math.round(values.reduce((a, b) => a + b, 0) * k);
    const raw = values.map((v) => v * k), out = raw.map(Math.floor);
    let left = total - out.reduce((a, b) => a + b, 0);
    raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (left > 0) { out[i]++; left--; } });
    return out.map((v) => v / k);
  }

  return { normCdf, normInv, lmsZ, lmsValue, interpRows, clamp, median, roundParts };
});
