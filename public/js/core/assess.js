/* Orchestrates all calculations for one person into a single, UI-ready result object. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./anthro.js'), require('./growth.js'), require('./energy.js'), require('./hall.js'), require('./i18n-text.js'));
  } else {
    root.FH = root.FH || {};
    root.FH.assess = factory(root.FH.anthro, root.FH.growth, root.FH.energy, root.FH.hall, root.FH.i18nText);
  }
})(typeof self !== 'undefined' ? self : this, function (anthro, growth, energy, hall, i18nText) {
  const PACES = {
    gentle: { pct: 0.5, label: 'Gentle' },
    moderate: { pct: 0.75, label: 'Moderate' },
    fast: { pct: 1.0, label: 'Faster' },
  };
  const KCAL_PER_KG_FAT = hall.P.rhoF;
  const ALPERT_KCAL_PER_KG_FAT = 290 / 4.184; // 290 kJ per kg fat per day
  const GAIN_SURPLUS_MAX = 500; // kcal/day; the most the app picks on its own for weight gain
  const MIN_FAT_SHARE = 0.02; // a projection whose fat mass drops below 2% of today's weight is not shown
  const MIN_PROJECTED_BMI = 15; // nor one that takes BMI below 15
  const MAX_LOSS_RATE = 1.5; // kg/week; faster loss raises gallstone risk (Weinsier 1995)

  function validate(p) {
    const errors = [];
    if (!(p.ageYears >= 2 && p.ageYears <= 100)) errors.push('Age must be between 2 and 100 years.');
    if (!(p.heightCm >= 80 && p.heightCm <= 250)) errors.push('Height must be between 80 and 250 cm.');
    if (!(p.weightKg >= 10 && p.weightKg <= 350)) errors.push('Weight must be between 10 and 350 kg.');
    if (p.sex !== 'male' && p.sex !== 'female') errors.push('Select sex.');
    // Optional fields: only checked once provided (null/undefined means "not entered"), matching
    // the ranges the estimators and Hall model actually support - not just the required core four.
    if (p.bodyFatPct != null && !(p.bodyFatPct >= 3 && p.bodyFatPct <= 70)) errors.push('Body fat % must be between 3 and 70.');
    if (p.waistCm != null && !(p.waistCm >= 40 && p.waistCm <= 250)) errors.push('Waist must be between 40 and 250 cm.');
    if (p.hipCm != null && !(p.hipCm >= 40 && p.hipCm <= 250)) errors.push('Hip must be between 40 and 250 cm.');
    if (p.neckCm != null && !(p.neckCm >= 15 && p.neckCm <= 80)) errors.push('Neck must be between 15 and 80 cm.');
    if (p.goalWeightKg != null && !(p.goalWeightKg >= 10 && p.goalWeightKg <= 350)) errors.push('Goal weight must be between 10 and 350 kg.');
    if (p.extraActivityKcal != null && !(p.extraActivityKcal >= 0 && p.extraActivityKcal <= 3000)) errors.push('Extra activity must be between 0 and 3,000 kcal/day.');
    // Intake and weeks only count in the pace mode that uses them (the form keeps both values).
    if (p.paceMode === 'intake' && p.intakeKcal != null && !(p.intakeKcal > 0 && p.intakeKcal <= 6000)) errors.push('Daily intake must be above 0 and at most 6,000 kcal.');
    if (p.paceMode === 'weeks' && p.weeks != null && !(p.weeks >= 2 && p.weeks <= 156)) errors.push('Weeks must be between 2 and 156.');
    return errors;
  }

  /* ------------------------------------------------------------------------------------ */
  const DEFAULT_FORMAT = {
    mass: (kg, d = 1) => kg.toFixed(d) + ' kg',
    kcal: (v) => Math.round(v).toLocaleString('en-GB'),
  };

  /** Fat, lean and water as text that adds up to the total, like the "What you will lose" card. */
  const lossParts = (F, kgs) => (F.massParts ? F.massParts(kgs) : kgs.map((v) => F.mass(v)));

  /** @param opts.format  {mass(kg, digits), massParts(kgs)?, kcal(v), units?} used for any text the engine writes.
   *  @param opts.t  locale text bundle from i18n-text.js (js/core/i18n-text.js); defaults to English. */
  function assess(input, opts = {}) {
    const F = opts.format || DEFAULT_FORMAT;
    const T = opts.t || i18nText.EN;
    const p = Object.assign({ activity: 'inactive', ethnicity: 'other', childReference: 'cdc', carbFraction: 0.5 }, input);
    const errors = validate(p);
    if (errors.length) return { ok: false, errors };

    const isChild = p.ageYears < 18;
    const b = anthro.bmi(p.weightKg, p.heightCm);
    const res = { ok: true, input: p, isChild, bmi: b, warnings: [] };

    // ---- BMI -------------------------------------------------------------------------
    if (isChild) {
      const ageMonths = p.ageYears * 12;
      const primary = growth.childBmi({ sex: p.sex, ageMonths, bmi: b, reference: p.childReference });
      const other = growth.childBmi({ sex: p.sex, ageMonths, bmi: b, reference: p.childReference === 'cdc' ? 'who' : 'cdc' });
      res.child = { primary, other };
      if (primary) {
        const h2 = (p.heightCm / 100) ** 2;
        res.child.healthyWeight = primary.healthyBmi.map((x) => x * h2);
      }
    } else {
      res.bmiClass = anthro.adultBmiClass(b, p.ethnicity);
      res.healthyRange = anthro.healthyWeightRange(p.heightCm, p.ethnicity);
      if (p.ageYears >= 65) {
        res.bmiClass.olderNote = T.bmiOlderNote();
        res.bmiClass.refs = res.bmiClass.refs.concat(['winter2014']);
      }
    }

    // ---- Central adiposity -----------------------------------------------------------
    res.central = {
      waist: isChild ? null : anthro.waistRisk(p.sex, p.waistCm, p.ethnicity),
      whtr: p.ageYears >= 5 ? anthro.whtr(p.waistCm, p.heightCm, isChild) : null,
      whr: isChild ? null : anthro.whr(p.sex, p.waistCm, p.hipCm),
    };

    // ---- Body composition ------------------------------------------------------------
    const bf = anthro.bodyFat(p);
    res.bodyFat = bf;
    const fatPct = bf.consensus;
    res.composition = fatPct ? anthro.composition(Object.assign({}, p, { bodyFatPct: fatPct })) : null;
    res.fatClass = fatPct ? anthro.bodyFatClass(fatPct, p.sex, p.ageYears, p.ethnicity) : null;
    if (!isChild) {
      res.adiposity = anthro.adiposityCheck({
        bmiValue: b, bmiClass: res.bmiClass, waist: res.central.waist, whtrC: res.central.whtr,
        whrC: res.central.whr, fatClass: res.fatClass, measuredFat: p.bodyFatPct > 0,
      }, T);
    }

    // ---- Energy ----------------------------------------------------------------------
    const ffmKg = res.composition ? res.composition.fatFreeMassKg : null;
    const eIn = Object.assign({}, p, { ffmKg, ffmMeasured: p.bodyFatPct > 0 });
    const bmr = energy.bmrAll(eIn, T, p.bmrChoice);
    const tdee = energy.tdee(p, bmr.primary.value);
    res.energy = { bmr, tdee, ffmMeasured: p.bodyFatPct > 0 };

    if (p.pregnant && !isChild) {
      res.warnings.push({ level: 'danger', text: T.pregnancyWarning(), refs: ['nasem2023'] });
    }

    // ---- Plan (adults) / guidance (children) -------------------------------------------
    // No weight-loss plan toward an underweight goal: an intake and a date for that would read
    // as an endorsement, whatever warning sits next to it. Maintenance and gain still plan.
    // Same for severe thinness (any plan), gain into the obesity range, and a typed intake in
    // very-low-calorie territory, which needs clinical supervision rather than a timeline.
    const goalBmi = p.goalWeightKg > 0 ? anthro.bmi(p.goalWeightKg, p.heightCm) : b;
    const change = p.goalWeightKg > 0 ? p.weightKg - p.goalWeightKg : 0; // > 0 is a loss
    let blocked = null;
    if (!isChild) {
      if (b < 16) {
        res.warnings.push({ level: 'danger', text: T.flags.severeThinness(b.toFixed(1)), refs: ['nice2006', 'who2000'] });
        blocked = 'severeThinness';
      } else if (b < 18.5) {
        res.warnings.push({ level: 'warn', text: T.flags.currentUnderweight(b.toFixed(1)), refs: ['who2000'] });
      }
      if (blocked) { /* already explained */ } else if (change >= 0.25 && goalBmi < 18.5) {
        res.warnings.push({ level: 'danger', text: T.flags.lossToUnderweight(goalBmi.toFixed(1)), refs: ['who2000'] });
        blocked = 'underweight';
      } else if (change <= -0.25 && goalBmi >= res.bmiClass.thresholds.obese) {
        res.warnings.push({ level: 'warn', text: T.flags.gainToObesity(goalBmi.toFixed(1), res.bmiClass.thresholds.obese), refs: res.bmiClass.refs });
        blocked = 'gainToObesity';
      } else if (Math.abs(change) >= 0.25 && p.paceMode === 'intake' && p.intakeKcal > 0 && p.intakeKcal < 800) {
        res.warnings.push({ level: 'danger', text: T.flags.vlcdTyped(), refs: ['nice2025'] });
        blocked = 'vlcd';
      }
    }
    if (isChild) {
      res.pediatric = pediatricGuidance(p, res, T);
      const who = res.child.primary && res.child.primary.reference === 'who' ? res.child.primary : res.child.other;
      if (who && Math.abs(who.z) > 5) res.warnings.push({ level: 'warn', text: T.childImplausible(), refs: ['cdcWhoSas'] });
      if (p.pregnant) res.warnings.push({ level: 'danger', text: T.pregnancyTeenWarning(), refs: ['nasem2023'] });
    } else if (p.pregnant) {
      // Pregnancy switches planning off; the notice is added above.
    } else if (blocked) {
      res.planBlocked = blocked;
    } else {
      const plan = adultPlan(p, res, F, T);
      if (plan.outOfRange) {
        res.planBlocked = 'modelRange';
        res.warnings.push({ level: 'warn', text: T.flags.modelRange(), refs: ['hall2011'] });
      } else res.plan = plan;
    }

    res.nutrition = nutrition(p, res, T);
    res.story = story(p, res, F, T);
    return res;
  }

  /* ------------------------------------------------------------------------------------ */
  function adultPlan(p, res, F, T) {
    const EI0 = res.energy.tdee.primary;
    const rmr = res.energy.bmr.primary.value;
    // Initial fat mass: measured > circumference-based estimate > Jackson 2002 (the Hall 2011 default).
    let fatPctForModel, fatSource;
    if (p.bodyFatPct > 0) { fatPctForModel = p.bodyFatPct; fatSource = 'measured'; }
    else if (res.bodyFat.basis === 'circumference') { fatPctForModel = res.bodyFat.consensus; fatSource = 'circumference estimate'; }
    else { fatPctForModel = anthro.bfJackson({ sex: p.sex, age: p.ageYears, bmi: res.bmi }); fatSource = 'Jackson 2002 (BMI, age, sex)'; }
    const fatPctRaw = fatPctForModel;
    fatPctForModel = Math.min(60, Math.max(5, fatPctForModel));
    const model = hall.create({ weightKg: p.weightKg, fatMassKg: p.weightKg * fatPctForModel / 100, baselineIntake: EI0, rmr, carbFraction: p.carbFraction });
    const extra = p.extraActivityKcal > 0 ? p.extraActivityKcal : 0;
    const goal = p.goalWeightKg > 0 ? p.goalWeightKg : p.weightKg;
    const lossKg = p.weightKg - goal;
    const out = { model: { F0: model.F0, L0: model.L0, delta: model.delta, pal: model.pal, fatPctForModel, fatSource },
      baselineIntake: EI0, goalKg: goal, lossKg, flags: [] };
    // The Hall model is only validated across a plausible body-fat range; flag it when the
    // measured/estimated value fed to it (not the body-fat display elsewhere) had to be capped.
    if (Math.abs(fatPctRaw - fatPctForModel) > 0.5) {
      const clampText = fatSource === 'measured' ? T.flags.bodyFatClamped : T.flags.bodyFatClampedEstimate;
      out.flags.push({ level: 'info', text: clampText(Math.round(fatPctRaw * 10) / 10 + '%', fatPctForModel + '%'), refs: ['hall2011'] });
    }

    out.timeConstantDays = hall.timeConstant(model);

    // Decide the constant intake.
    let days, intake, mode = p.paceMode || 'moderate';
    if (Math.abs(lossKg) < 0.25) {
      // Hold today's body composition steady, not just today's intake: if extra activity is
      // set, maintaining the same weight needs more food than baseline TDEE accounts for.
      mode = 'maintain'; intake = hall.maintenanceIntake(model, model.F0, model.L0, extra); days = 182;
    } else if (mode === 'intake' && p.intakeKcal > 0) {
      intake = p.intakeKcal;
    } else if (mode === 'weeks' && p.weeks > 0) {
      days = Math.round(p.weeks * 7);
      intake = hall.intakeForGoal(model, goal, days, extra);
    } else {
      const pace = PACES[mode] || PACES.moderate;
      mode = PACES[mode] ? mode : 'moderate';
      const avgWeight = (p.weightKg + goal) / 2;
      const weeks = Math.max(2, Math.ceil(Math.abs(lossKg) / (pace.pct / 100 * avgWeight)));
      days = weeks * 7;
      intake = hall.intakeForGoal(model, goal, days, extra);
    }
    // The solver in 'weeks' mode and the pace-derived default picks whatever constant intake
    // reaches the goal soonest, with no floor - for a tight deadline that is a call to eat near
    // 0 kcal/day, which is not a plan anyone can actually follow no matter how many warnings sit
    // next to it. Floor what the app recommends on its own to the guideline minimum (below that,
    // only 'intake' mode shows it, because the person typed that number themselves) and let the
    // diet phase below find the real, longer timeline that floor actually reaches.
    if (mode !== 'intake' && mode !== 'maintain' && lossKg > 0) {
      const floor = p.sex === 'female' ? 1200 : 1500;
      if (intake < floor) intake = floor;
      // Nor a pace the app would then flag for gallstone risk: raise the intake until the steady
      // rate (days 14-56, as in safetyFlags) stays at or under MAX_LOSS_RATE.
      const rate = (ei) => {
        const s = hall.simulate(model, { intake: hall.constant(ei), days: 56, extraActivity: extra, stopWhen: (o) => o.weight[o.weight.length - 1] <= goal });
        return steadyRate(s.weight, s.weight.length - 1);
      };
      if (rate(intake) > MAX_LOSS_RATE) {
        let lo = intake, hi = EI0 + extra;
        for (let i = 0; i < 30; i++) {
          const mid = (lo + hi) / 2;
          if (rate(mid) > MAX_LOSS_RATE) lo = mid; else hi = mid;
        }
        intake = hi;
      }
    }
    // No guideline sets a pace for gaining weight, so the app never picks more than a modest
    // surplus over today's expenditure (including extra exercise) on its own.
    let gainCapped = false;
    if (mode !== 'intake' && mode !== 'maintain' && lossKg < 0 && intake > EI0 + extra + GAIN_SURPLUS_MAX) {
      intake = EI0 + extra + GAIN_SURPLUS_MAX;
      gainCapped = true;
    }
    out.mode = mode;
    out.intake = intake;
    out.deficit = EI0 - intake;
    out.extraActivity = extra;
    // The deadline the solver aimed for ('weeks' mode, or the pace-derived default) - captured
    // before the diet phase can revise `days`, so a deadline that turns out unreachable in time
    // (even though the goal itself is reachable eventually) can still be flagged as missed.
    const requestedDays = mode !== 'intake' && mode !== 'maintain' ? days : null;

    // Diet phase. Always run against the goal, not just for the fixed number of days the intake
    // was solved for: bisection in hall.intakeForGoal can only push intake to its [0, 2×EI0]
    // bounds, so an unreachable goal (e.g. a deadline no safe intake can hit) would otherwise
    // silently come back as the boundary intake, presented as if it worked. Running every mode
    // the same way, to the goal or a 3-year cap, catches that and reuses one real simulated
    // trajectory for both the "plateau" text and the chart, instead of a separate linear estimate
    // that can disagree with what the chart actually draws.
    const maxDays = 3 * 365;
    const reached = (s) => (lossKg > 0 ? s.weight[s.weight.length - 1] <= goal : s.weight[s.weight.length - 1] >= goal);
    let diet;
    if (mode === 'maintain') {
      diet = hall.simulate(model, { intake: hall.constant(intake), days, extraActivity: extra });
    } else {
      // mode !== 'intake' means intake/days came from the solver trying to hit an explicit goal
      // or deadline, not a number the person typed themselves - so a failure to reach the goal
      // here is the plan being infeasible, not a choice the person made.
      const solverChose = mode !== 'intake';
      diet = hall.simulate(model, { intake: hall.constant(intake), days: maxDays, extraActivity: extra, stopWhen: reached });
      days = reached(diet) ? diet.day[diet.day.length - 1] : null;
      if (days == null) {
        out.plateauKg = diet.weight[diet.weight.length - 1];
        // A typed intake on the wrong side of maintenance moves weight away from the goal.
        const maint0 = hall.maintenanceIntake(model, model.F0, model.L0, extra);
        const wrongWay = !solverChose && (lossKg > 0 ? intake >= maint0 : intake <= maint0);
        let text;
        if (wrongWay) text = T.flags.wrongDirection(F.kcal(maint0) + ' kcal/day', F.mass(out.plateauKg), lossKg > 0);
        else if (gainCapped) text = T.flags.gainPlateau(F.mass(out.plateauKg), F.mass(goal));
        else if (solverChose) text = T.flags.unreachable(F.mass(out.plateauKg), F.mass(goal));
        else text = T.flags.plateau(F.mass(out.plateauKg));
        out.flags.push({ level: 'warn', text, refs: ['hall2011'] });
      } else if (requestedDays != null && days > requestedDays * 1.1 + 3 && (lossKg > 0 || mode === 'weeks')) {
        // The goal itself is reachable at this intake, just not by the deadline that was asked
        // for (e.g. bisection was pushed to ~0 kcal/day trying to hit a too-tight deadline).
        // Only 'weeks' mode has a date the person chose; a pace mode only implied one.
        const text = lossKg <= 0 ? T.flags.deadlineExtendedGain(requestedDays, days)
          : mode === 'weeks' ? T.flags.deadlineExtended(requestedDays, days) : T.flags.paceExtended(requestedDays, days);
        out.flags.push({ level: 'warn', text, refs: ['hall2011'] });
      }
      if (gainCapped && mode !== 'weeks') out.flags.push({ level: 'info', text: T.flags.gainCapped(), refs: [] });
    }
    out.days = days;

    // Maintenance after the goal.
    const endIdx = diet.day.length - 1;
    const Fg = diet.fat[endIdx], Lg = diet.lean[endIdx];
    out.maintenanceAtGoal = mode === 'maintain' ? intake : hall.maintenanceIntake(model, Fg, Lg, extra);
    const maintainDays = 182;
    const cont = continueSim(model, diet, out.maintenanceAtGoal, maintainDays, extra);
    out.series = cont;
    // The model is not built for running fat stores close to empty or for bodies far below a
    // healthy weight; past that point its numbers (plateaus of a few kilograms, NaN) mean
    // nothing, so show no projection.
    const h2 = (p.heightCm / 100) ** 2;
    if (Math.min(...cont.fat) < MIN_FAT_SHARE * p.weightKg || Math.min(...cont.weight) / h2 < MIN_PROJECTED_BMI) return { outOfRange: true };

    // How sure: replay exactly the same intake schedule as if true maintenance sat at either end
    // of the NASEM 2023 individual prediction error (±1 RMSE, ~2 in 3 people). Only the baseline
    // expenditure moves, so the band shows what the equation's own error does to the path.
    const rmse = res.energy.tdee.nasem.rmse;
    const cIntake = cont.intake[1] != null ? cont.intake[1] : cont.intake[0];
    const replay = (shift) => {
      const mb = hall.create({ weightKg: p.weightKg, fatMassKg: model.F0, baselineIntake: EI0 + shift, rmr, carbFraction: p.carbFraction });
      return hall.simulate(mb, { intake: (t) => (t < cont.dietDays ? cIntake : out.maintenanceAtGoal), days: cont.day[cont.day.length - 1], extraActivity: extra }).weight;
    };
    out.uncertainty = { rmse, burnMore: replay(rmse), burnLess: replay(-rmse), refs: ['nasem2023', 'hall2011'] };

    // Classic 3500 kcal/lb comparison.
    if (intake !== EI0) {
      const daysRule = Math.abs(lossKg) * hall.P.KCAL_PER_KG_3500 / Math.abs(EI0 - intake);
      out.rule3500 = { daysToGoal: daysRule, weightAtModelGoalDay: days != null ? hall.rule3500(model, intake, days) : null, refs: ['wishnofsky1958', 'thomas2014', 'hall2008'] };
    }

    // Composition of the change at goal.
    const i0 = 0;
    const d = {
      total: diet.weight[endIdx] - diet.weight[i0],
      fat: diet.fat[endIdx] - diet.fat[i0],
      lean: diet.lean[endIdx] - diet.lean[i0],
      water: (diet.glyWater[endIdx] - diet.glyWater[i0]) + (diet.ecf[endIdx] - diet.ecf[i0]),
    };
    out.change = d;
    out.fatEnergyKcal = -d.fat * KCAL_PER_KG_FAT;

    // Expenditure adaptation at goal.
    const eeStart = EI0;
    const eeGoal = diet.ee[endIdx];
    out.expenditure = {
      start: eeStart, atGoal: eeGoal, drop: eeStart - eeGoal,
      adaptive: -diet.at[endIdx],
      tef: -hall.P.betaTEF * (intake - EI0),
    };
    out.expenditure.bodySize = out.expenditure.drop - out.expenditure.adaptive - out.expenditure.tef;

    // First week & rates.
    const w7 = Math.min(7, endIdx);
    out.firstWeek = { total: diet.weight[w7] - p.weightKg, fat: diet.fat[w7] - model.F0 };
    out.steadyRateKgPerWeek = steadyRate(diet.weight, endIdx);
    out.avgRateKgPerWeek = days ? (p.weightKg - diet.weight[endIdx]) / (days / 7) : null;

    // Milestones.
    out.milestones = milestones(p, res, cont, lossKg, T);

    // Intake comparison table (what different deficits do).
    // Rows below the guideline floor are left out: for a small body they reach intakes near zero
    // and push the model out of its range.
    const scenarioFloor = p.sex === 'female' ? 1200 : 1500;
    out.scenarios = [0, 250, 500, 750, 1000].filter((def) => def === 0 || EI0 - def >= scenarioFloor).map((def) => {
      const s = hall.simulate(model, { intake: hall.constant(EI0 - def), days: 365, extraActivity: extra, dt: 1 });
      const at = (dd) => s.weight[Math.min(dd, s.weight.length - 1)];
      const hit = lossKg > 0 ? s.weight.findIndex((w) => w <= goal) : -1;
      return { deficit: def, intake: EI0 - def, w12: at(84), w26: at(182), w52: at(365), goalDay: hit > 0 ? hit : null };
    }).filter((s) => [s.w12, s.w26, s.w52].every(Number.isFinite));

    out.flags = out.flags.concat(safetyFlags(p, res, out, model, F, T));
    return out;
  }

  // Loss rate in kg/week over day 14-56, skipping the water-heavy first fortnight. A plan that
  // ends at or before day 14 (e.g. an unreachable goal cut short) has no such window - fall
  // back to its whole span rather than silently reporting zero.
  function steadyRate(weight, endIdx) {
    const a = Math.min(14, endIdx), b = Math.min(56, endIdx);
    return b > a ? (weight[a] - weight[b]) / ((b - a) / 7)
      : endIdx > 0 ? (weight[0] - weight[endIdx]) / (endIdx / 7) : 0;
  }

  function continueSim(model, diet, maintIntake, extraDays, extra) {
    // Re-run from the start with a two-phase intake so the whole curve is one consistent simulation.
    const dietDays = diet.day[diet.day.length - 1];
    const dietIntake = diet.intake[1] != null ? diet.intake[1] : diet.intake[0];
    const s = hall.simulate(model, {
      intake: (t) => (t < dietDays ? dietIntake : maintIntake),
      days: dietDays + extraDays, extraActivity: extra,
    });
    s.dietDays = dietDays;
    s.rule3500 = s.day.map((t) => (t <= dietDays ? hall.rule3500(model, dietIntake, t) : null));
    return s;
  }

  function milestones(p, res, s, lossKg, T) {
    const list = [];
    if (lossKg <= 0) return list;
    const h2 = (p.heightCm / 100) ** 2;
    const first = (pred) => { const i = s.weight.findIndex(pred); return i >= 0 && i <= s.dietDays + 1 ? i : null; };
    const pctMarks = [
      { pct: 5, text: T.milestone.pct5(), refs: ['jensen2014'] },
      { pct: 10, text: T.milestone.pct10(), refs: ['jensen2014', 'vilargomez2015'] },
    ];
    for (const m of pctMarks) {
      const target = p.weightKg * (1 - m.pct / 100);
      if (target < p.weightKg - lossKg - 0.01) continue;
      const day = first((w) => w <= target);
      if (day != null) list.push({ kind: 'pct', label: T.milestone.pctLabel(m.pct), weight: target, day, text: m.text, refs: m.refs });
    }
    // DiRECT's 86% remission figure was for an absolute threshold (>=15 kg lost) in a trial of
    // adults with recent-onset type 2 diabetes, not "15% of starting weight" for anyone - keep it
    // as its own absolute-kg milestone so it only appears once a plan actually crosses 15 kg.
    if (lossKg >= 15 - 0.01) {
      const target = p.weightKg - 15;
      const day = first((w) => w <= target);
      if (day != null) list.push({ kind: 'kg', label: T.milestone.kgLabel(15), weight: target, day, text: T.milestone.kg15(), refs: ['lean2018'] });
    }
    if (res.bmiClass) {
      const t = res.bmiClass.thresholds;
      for (const [bmiT, label] of [[t.obese3, T.milestone.leavesObese3()], [t.obese2, T.milestone.leavesObese2()], [t.obese, T.milestone.leavesObeseRange()], [t.overweight, T.milestone.reachesHealthy()]]) {
        if (res.bmi < bmiT) continue;
        const target = bmiT * h2 - 0.01;
        if (target < p.weightKg - lossKg - 0.01) continue;
        const day = first((w) => w <= target);
        if (day != null) list.push({ kind: 'bmi', label: label + T.milestone.bmiSuffix(bmiT), weight: target, day, refs: res.bmiClass.refs });
      }
    }
    list.sort((x, y) => x.day - y.day);
    return list;
  }

  function safetyFlags(p, res, out, model, F, T) {
    const f = [];
    const floor = p.sex === 'female' ? 1200 : 1500;
    if (out.lossKg > 0.25) {
      // Typed intakes below 800 kcal/day never get this far (see vlcdTyped in assess()).
      if (out.intake < floor) {
        f.push({ level: 'warn', text: T.flags.belowFloor(F.kcal(floor) + ' kcal/day', p.sex), refs: ['jensen2014'] });
      }
      const pctRate = out.steadyRateKgPerWeek / p.weightKg * 100;
      if (out.steadyRateKgPerWeek > MAX_LOSS_RATE) {
        f.push({ level: 'danger', text: T.flags.gallstoneRisk(F.mass(out.steadyRateKgPerWeek, 2)), refs: ['niddkGallstones', 'weinsier1995'] });
      } else if (pctRate > 1.0) {
        f.push({ level: 'warn', text: T.flags.fastPace(pctRate.toFixed(1) + '%'), refs: ['nhlbi1998', 'helms2014'] });
      }
      const alpertMax = ALPERT_KCAL_PER_KG_FAT * model.F0;
      if (out.deficit > alpertMax) {
        f.push({ level: 'info', text: T.flags.alpertCeiling(F.kcal(out.deficit) + ' kcal/day', F.kcal(alpertMax) + ' kcal/day'), refs: ['alpert2005'] });
      }
      if (out.intake < res.energy.bmr.primary.value) {
        f.push({ level: 'info', text: T.flags.belowBmr(res.bmi >= res.bmiClass.thresholds.obese), refs: ['jensen2014'] });
      }
      const leanShare = out.change.lean / out.change.total;
      if (leanShare > 0.3) {
        f.push({ level: 'info', text: T.flags.leanShare(Math.round(leanShare * 100)), refs: ['hall2007', 'leidy2015'] });
      }
    }
    // Goal flags only when a goal was entered: without one the "goal" is today's weight, which
    // the current-BMI notices in assess() already cover.
    const goalBmi = out.goalKg / (p.heightCm / 100) ** 2;
    if (!(p.goalWeightKg > 0)) { /* no goal entered */ } else if (goalBmi < 18.5) {
      f.push({ level: 'danger', text: T.flags.goalUnderweight(goalBmi.toFixed(1)), refs: ['who2000'] });
    } else if (p.ageYears >= 65 && goalBmi < 23) {
      f.push({ level: 'warn', text: T.flags.goalLowOlder(), refs: ['winter2014'] });
    }
    if (out.lossKg < -0.25) {
      f.push({ level: 'info', text: T.flags.isGain(), refs: [] });
      // A typed intake is shown as typed, but a surplus beyond what the app would plan is named.
      if (out.mode === 'intake' && -out.deficit - out.extraActivity > GAIN_SURPLUS_MAX) f.push({ level: 'warn', text: T.flags.gainSurplusTyped(F.kcal(-out.deficit - out.extraActivity) + ' kcal/day'), refs: [] });
      if (goalBmi >= res.bmiClass.thresholds.overweight) f.push({ level: 'warn', text: T.flags.gainToOverweight(goalBmi.toFixed(1)), refs: res.bmiClass.refs });
    }
    return f;
  }

  /* ------------------------------------------------------------------------------------ */
  function pediatricGuidance(p, res, T) {
    const c = res.child.primary;
    const out = { eer: res.energy.tdee.primary, refs: ['hampl2023', 'barlow2007'] };
    if (!c) return out;
    // Treatment goals (Barlow 2007, AAP 2023) are defined on CDC percentiles, whichever chart is displayed.
    const cdc = c.reference === 'cdc' ? c : res.child.other;
    const basis = cdc || c;
    const pct = basis.percentile;
    out.goalBasis = cdc ? T.pediatric.goalBasisCdc(cdc.percentile.toFixed(1)) : T.pediatric.goalBasisWho();
    const a = p.ageYears;
    let goal;
    if (basis.category.key === 'under') goal = T.pediatric.underweight();
    else if (pct < 85) goal = T.pediatric.healthyRange();
    else if (pct < 95) goal = a >= 12 ? T.pediatric.maintainTeen() : T.pediatric.maintainYounger();
    else if (a < 6) goal = pct >= 99 ? T.pediatric.under6Severe() : T.pediatric.under6();
    else if (a < 12) goal = pct >= 99 ? T.pediatric.under12Severe() : T.pediatric.under12();
    else goal = T.pediatric.teenSevere();
    out.goal = goal;
    out.goalRefs = ['barlow2007'];
    out.treatment = pct >= 85 && basis.category.key !== 'under' ? T.pediatric.treatment() : null;
    out.healthyBmi = c.healthyBmi;
    out.healthyWeight = res.child.healthyWeight;
    return out;
  }

  /* ------------------------------------------------------------------------------------ */
  function nutrition(p, res, T) {
    const a = p.ageYears;
    const kcal = res.plan ? res.plan.intake : res.energy.tdee.primary;
    const out = { kcal, refs: ['iom2005'] };
    // Protein
    if (a < 18) {
      const rda = a < 4 ? 1.05 : a < 14 ? 0.95 : 0.85;
      out.protein = { gPerKg: [rda, rda], grams: [rda * p.weightKg, rda * p.weightKg], basis: T.nutrition.proteinRda(), refs: ['iom2005'] };
      // IOM 2005 gives 1.05 g/kg for 1-3 y; some summary tables round it to 1.1, so say so.
      if (a < 4) out.protein.note = T.nutrition.proteinToddlerNote();
    } else {
      const goalW = res.plan && res.plan.goalKg > 0 ? Math.min(res.plan.goalKg, p.weightKg) : p.weightKg;
      const useGoal = res.bmi >= 30 && goalW < p.weightKg;
      const refW = useGoal ? goalW : p.weightKg;
      out.protein = {
        gPerKg: [1.2, 1.6], grams: [1.2 * refW, 1.6 * refW], refWeight: refW,
        basis: useGoal ? T.nutrition.proteinGoalWeight() : T.nutrition.proteinCurrentWeight(),
        refs: ['leidy2015'],
      };
      if (a >= 65) out.protein.note = T.nutrition.proteinOlderNote();
      if (a >= 65) out.protein.refs = out.protein.refs.concat(['bauer2013']);
      if (p.athlete && res.composition) {
        out.protein.athlete = { gPerKgFfm: [2.3, 3.1], grams: [2.3 * res.composition.fatFreeMassKg, 3.1 * res.composition.fatFreeMassKg], refs: ['helms2014'] };
      }
    }
    // Macronutrient ranges (AMDR)
    const fat = a < 4 ? [30, 40] : a < 19 ? [25, 35] : [20, 35];
    const prot = a < 4 ? [5, 20] : a < 19 ? [10, 30] : [10, 35];
    out.amdr = {
      carbs: { pct: [45, 65], grams: [0.45 * kcal / 4, 0.65 * kcal / 4] },
      fat: { pct: fat, grams: [fat[0] / 100 * kcal / 9, fat[1] / 100 * kcal / 9] },
      protein: { pct: prot, grams: [prot[0] / 100 * kcal / 4, prot[1] / 100 * kcal / 4] },
    };
    // Fibre (IOM 2005): 14 g per 1000 kcal and the age/sex Adequate Intake.
    let fiberAi;
    if (a < 4) fiberAi = 19; else if (a < 9) fiberAi = 25;
    else if (a < 14) fiberAi = p.sex === 'male' ? 31 : 26;
    else if (a < 19) fiberAi = p.sex === 'male' ? 38 : 26;
    else if (a < 51) fiberAi = p.sex === 'male' ? 38 : 25;
    else fiberAi = p.sex === 'male' ? 30 : 21;
    out.fiber = { perKcal: 14 * kcal / 1000, ai: fiberAi };
    // Water (EFSA 2010), total water from drinks and food.
    let water;
    if (a < 4) water = 1.3; else if (a < 9) water = 1.6;
    else if (a < 14) water = p.sex === 'male' ? 2.1 : 1.9;
    else water = p.sex === 'male' ? 2.5 : 2.0;
    out.water = { litres: water, refs: ['efsa2010water'] };
    // Physical activity. Under-5s follow WHO 2019 (total minutes of activity at any intensity,
    // with a moderate-to-vigorous floor only from age 3); 5 y and older follow WHO 2020 (a
    // moderate-to-vigorous average plus muscle-strengthening days).
    out.activity = a < 3 ? { text: T.nutrition.activityToddler(), refs: ['who2019u5'] }
      : a < 5 ? { text: T.nutrition.activityPreschool(), refs: ['who2019u5'] }
      : a < 18 ? { text: T.nutrition.activityChild(), refs: ['who2020pa'] }
      : { text: T.nutrition.activityAdult(), refs: ['who2020pa', 'donnelly2009'] };
    return out;
  }

  /* ------------------------------------------------------------------------------------ */
  function story(p, res, F, T) {
    const s = [];
    const plan = res.plan;
    if (plan && plan.lossKg > 0.25 && plan.days) {
      const c = plan.change;
      const tot = -c.total;
      s.push({ id: 'composition', title: T.story.compositionTitle(),
        value: T.story.compositionValue(Math.round(-c.fat / tot * 100)),
        // Eating more carbohydrate than before (e.g. alongside extra exercise) refills glycogen,
        // so water can rise while tissue is lost; say that instead of printing a negative loss.
        text: c.water > 0.05 ? T.story.compositionTextWaterUp(F.mass(tot), F.mass(-c.fat), F.mass(-c.lean), F.mass(c.water))
          : T.story.compositionText(F.mass(tot), ...lossParts(F, [-c.fat, Math.max(0, -c.lean), Math.max(0, -c.water)])),
        refs: ['hall2011', 'hall2007'] });
      // With more carbohydrate than before (e.g. extra exercise eaten back) glycogen refills
      // and the scale can rise in week one even while fat falls.
      const weekUp = plan.firstWeek.total > 0.05;
      s.push({ id: 'firstweek', title: T.story.firstweekTitle(),
        value: weekUp ? '+' + F.mass(plan.firstWeek.total) : F.mass(Math.abs(plan.firstWeek.total)),
        text: weekUp ? T.story.firstweekTextUp(F.mass(-plan.firstWeek.fat, 2)) : T.story.firstweekText(F.mass(-plan.firstWeek.fat, 2)),
        refs: ['hall2011'] });
      s.push({ id: 'energy', title: T.story.energyTitle(),
        value: T.story.energyValue(F.kcal(plan.fatEnergyKcal)),
        text: T.story.energyText(),
        refs: ['hall2008'] });
      s.push({ id: 'adaptation', title: T.story.adaptationTitle(),
        value: T.story.adaptationValue(F.kcal(plan.expenditure.drop)),
        text: T.story.adaptationText(F.kcal(plan.expenditure.drop), F.kcal(plan.expenditure.bodySize), F.kcal(plan.expenditure.adaptive), F.kcal(plan.expenditure.tef)),
        refs: ['hall2011'] });
      s.push({ id: 'appetite', title: T.story.appetiteTitle(),
        value: T.story.appetiteValue(),
        text: T.story.appetiteText(F.mass(Math.min(5, Math.round(tot)), 0), 100 * Math.min(5, Math.round(tot))),
        refs: ['polidori2016'] });
      s.push({ id: 'maintenance', title: T.story.maintenanceTitle(),
        value: T.story.maintenanceValue(F.kcal(plan.maintenanceAtGoal)),
        text: T.story.maintenanceText(F.mass(plan.goalKg), F.kcal(res.energy.tdee.primary - plan.maintenanceAtGoal), F.kcal(res.energy.tdee.primary)),
        refs: ['hall2011'] });
      if (plan.rule3500) {
        const diff = plan.days - plan.rule3500.daysToGoal;
        s.push({ id: 'rule', title: T.story.ruleTitle(F.units === 'imperial'),
          value: T.story.ruleValue(diff >= 0 ? '+' : '', Math.round(diff / 7)),
          text: T.story.ruleText(Math.round(plan.rule3500.daysToGoal / 7), Math.round(plan.days / 7)),
          refs: ['thomas2014', 'hall2011'] });
      }
      s.push({ id: 'halflife', title: T.story.halflifeTitle(),
        value: T.story.halflifeValue(Math.round(plan.timeConstantDays * Math.LN2 / 30.4)),
        text: T.story.halflifeText(),
        refs: ['hall2011'] });
    }
    if (!res.isChild && res.healthyRange) {
      s.push({ id: 'range', title: T.story.rangeTitle(),
        value: F.mass(res.healthyRange.minKg).replace(/[\s ]*[a-z]+$/i, '') + '–' + F.mass(res.healthyRange.maxKg),
        text: T.story.rangeText(res.healthyRange.bmiMin, res.healthyRange.bmiMax, res.bmiClass.lowerThresholds ? T.story.rangeEthnicNote() : ''),
        refs: res.bmiClass.refs.concat(['rubino2025']) });
    }
    return s;
  }

  return { assess, PACES };
});
