/* Dynamic adult body-weight model of Hall et al., Lancet 2011 (web appendix equations 1-9).
 * Compartments: fat mass F, lean mass L, glycogen G (stored with 2.7 g water per g),
 * extracellular-fluid change dECF, and adaptive thermogenesis AT. Units: kg, kcal, days.
 * This is the model behind the NIH Body Weight Planner. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.FH = root.FH || {}; root.FH.hall = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  const KJ = 1 / 4.184; // kcal per kJ

  const P = {
    rhoF: 39500 * KJ,   // 39.5 MJ/kg fat
    rhoL: 7600 * KJ,    // 7.6 MJ/kg lean tissue
    rhoG: 17600 * KJ,   // 17.6 MJ/kg glycogen
    gammaF: 13 * KJ,    // 13 kJ/kg/d  (RMR per kg fat)
    gammaL: 92 * KJ,    // 92 kJ/kg/d  (RMR per kg lean)
    etaF: 750 * KJ,     // 750 kJ/kg   (cost of fat synthesis)
    etaL: 960 * KJ,     // 960 kJ/kg   (cost of protein synthesis)
    betaTEF: 0.1,
    betaAT: 0.14,
    tauAT: 14,          // days
    forbesC: 10.4,      // kg, Forbes constant
    glycogenWater: 2.7, // g water per g glycogen
    G0: 0.5,            // kg initial glycogen
    Na: 3220,           // mg/L extracellular sodium
    xiNa: 3000,         // mg/L/d
    xiCI: 4000,         // mg/d
  };
  P.C = P.forbesC * P.rhoL / P.rhoF;
  P.KCAL_PER_KG_3500 = 3500 * 2.20462262; // the classic "3500 kcal per pound" rule, per kg

  /**
   * @param {object} o  weightKg, fatMassKg, baselineIntake (kcal/d = baseline TEE at energy balance),
   *                    rmr (kcal/d, baseline resting expenditure), carbFraction (0-1, default 0.5)
   */
  function create(o) {
    const BW0 = o.weightKg;
    const F0 = o.fatMassKg;
    const G0 = P.G0;
    const L0 = BW0 - F0 - G0 * (1 + P.glycogenWater);
    const EI0 = o.baselineIntake;
    const pal = EI0 / o.rmr;
    const delta = Math.max(0, ((1 - P.betaTEF) * pal - 1) * o.rmr / BW0); // appendix eq. 8
    const K = EI0 - P.gammaF * F0 - P.gammaL * L0 - delta * BW0;
    const carb = o.carbFraction != null ? o.carbFraction : 0.5;
    const CIb = carb * EI0;
    const kG = CIb / (G0 * G0);
    return { BW0, F0, L0, G0, EI0, delta, K, carb, CIb, kG, pal, rmr: o.rmr };
  }

  function bodyWeight(m, y) { return y[0] + y[1] + y[2] * (1 + P.glycogenWater) + y[3]; }

  // Returns derivatives and diagnostic expenditure for state y = [F, L, G, dECF, AT].
  function derivs(m, y, EI, deltaExtra) {
    const [F, L, G, E, AT] = y;
    const dEI = EI - m.EI0;
    const CI = m.carb * EI;
    const dG = (CI - m.kG * G * G) / P.rhoG;
    const dE = (-P.xiNa * E - P.xiCI * (1 - CI / m.CIb)) / P.Na;
    const BW = F + L + G * (1 + P.glycogenWater) + E;
    const TEF = P.betaTEF * dEI;
    const dAT = (P.betaAT * dEI - AT) / P.tauAT;
    const p = P.C / (P.C + F);
    const w = p * P.etaL / P.rhoL + (1 - p) * P.etaF / P.rhoF;
    const EE = (m.K + P.gammaF * F + P.gammaL * L + (m.delta + deltaExtra) * BW + TEF + AT
      + (EI - P.rhoG * dG) * w) / (1 + w);
    const Eb = EI - EE - P.rhoG * dG;
    return { d: [(1 - p) * Eb / P.rhoF, p * Eb / P.rhoL, dG, dE, dAT], EE, BW, TEF, AT };
  }

  /**
   * Simulate. `intake(day)` returns kcal/d. Optional `extraActivity` kcal/d at baseline weight
   * (energy cost scales with body weight, as in the model). Returns daily samples.
   */
  function simulate(m, { intake, days, extraActivity = 0, dt = 0.5, stopWhen }) {
    const deltaExtra = extraActivity / m.BW0;
    let y = [m.F0, m.L0, m.G0, 0, 0];
    const out = { day: [], weight: [], fat: [], lean: [], glyWater: [], ecf: [], ee: [], at: [], intake: [] };
    const record = (t, yy) => {
      const EI = intake(t);
      const r = derivs(m, yy, EI, deltaExtra);
      out.day.push(t); out.weight.push(r.BW); out.fat.push(yy[0]); out.lean.push(yy[1]);
      out.glyWater.push(yy[2] * (1 + P.glycogenWater)); out.ecf.push(yy[3]);
      out.ee.push(r.EE); out.at.push(yy[4]); out.intake.push(EI);
    };
    record(0, y);
    const steps = Math.round(1 / dt);
    for (let day = 0; day < days; day++) {
      for (let s = 0; s < steps; s++) {
        const t = day + s * dt;
        const EI1 = intake(t), EIm = intake(t + dt / 2), EI2 = intake(t + dt);
        const k1 = derivs(m, y, EI1, deltaExtra).d;
        const y2 = y.map((v, i) => v + dt / 2 * k1[i]);
        const k2 = derivs(m, y2, EIm, deltaExtra).d;
        const y3 = y.map((v, i) => v + dt / 2 * k2[i]);
        const k3 = derivs(m, y3, EIm, deltaExtra).d;
        const y4 = y.map((v, i) => v + dt * k3[i]);
        const k4 = derivs(m, y4, EI2, deltaExtra).d;
        y = y.map((v, i) => v + dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
      }
      record(day + 1, y);
      if (stopWhen && stopWhen(out)) break;
    }
    out.finalState = y;
    return out;
  }

  const constant = (v) => () => v;

  /** Constant intake that brings weight to `goalKg` after exactly `days` days (bisection). */
  function intakeForGoal(m, goalKg, days, extraActivity = 0) {
    let lo = 0, hi = m.EI0 * 2;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      const s = simulate(m, { intake: constant(mid), days, extraActivity });
      if (s.weight[s.weight.length - 1] > goalKg) hi = mid; else lo = mid;
    }
    return (lo + hi) / 2;
  }

  /** Energy intake that holds a given body composition steady (steady state of eqs. 3-7). */
  function maintenanceIntake(m, F, L, extraActivity = 0) {
    const beta = P.betaTEF + P.betaAT;
    // At steady state glycogen and ECF return near baseline for a stable diet; use BW = F + L + G0-water.
    const BW = F + L + m.G0 * (1 + P.glycogenWater);
    const delta = m.delta + extraActivity / m.BW0;
    return (m.K + P.gammaF * F + P.gammaL * L + delta * BW - beta * m.EI0) / (1 - beta);
  }

  /** Characteristic time constant (days) of the linearised model, appendix eq. 15. */
  function timeConstant(m) {
    const alpha = P.forbesC / m.F0;
    return (P.etaF + P.rhoF + alpha * (P.etaL + P.rhoL)) / (P.gammaF + m.delta + alpha * (P.gammaL + m.delta));
  }

  /** Eventual steady-state weight change for a sustained intake change (appendix eq. 17, dDelta = 0). */
  function steadyStateChange(m, dEI) {
    const beta = P.betaTEF + P.betaAT;
    // Phi = dF/dBW along the Forbes curve, evaluated at the initial fat mass.
    const alpha = P.forbesC / m.F0;
    const phi = 1 / (1 + alpha);
    return (1 - beta) * dEI / (m.delta + P.gammaL - phi * (P.gammaL - P.gammaF));
  }

  /** Classic static rule: weight change = cumulative deficit / 7716 kcal per kg. */
  function rule3500(m, intakeKcal, day) {
    return m.BW0 - (m.EI0 - intakeKcal) * day / P.KCAL_PER_KG_3500;
  }

  return { P, create, simulate, intakeForGoal, maintenanceIntake, timeConstant, steadyStateChange, rule3500, constant };
});
