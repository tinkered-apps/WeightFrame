/* Run with:  node --test tests/engine.test.js
 * Expected values come from the cited publications wherever a worked example exists. */
const test = require('node:test');
const assert = require('node:assert/strict');

const stats = require('../public/js/core/stats.js');
const anthro = require('../public/js/core/anthro.js');
const growth = require('../public/js/core/growth.js');
const energy = require('../public/js/core/energy.js');
const hall = require('../public/js/core/hall.js');
const { assess } = require('../public/js/core/assess.js');
const refs = require('../public/js/core/refs.js');

const near = (actual, expected, tol, msg) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg || ''} expected ${expected} ± ${tol}, got ${actual}`);

test('normal distribution helpers', () => {
  near(stats.normCdf(0), 0.5, 1e-9);
  near(stats.normCdf(1.959964), 0.975, 1e-6);
  near(stats.normInv(0.975), 1.959964, 1e-5);
  near(stats.normInv(0.05), -1.644854, 1e-5);
  for (const p of [1e-6, 0.01, 0.3, 0.5, 0.9, 0.99985]) near(stats.normCdf(stats.normInv(p)), p, 1e-7 + p * 1e-6);
});

test('LMS round-trip', () => {
  const [L, M, S] = [-1.8, 17.2, 0.12];
  for (const z of [-2, -0.5, 0, 1.3, 2.5]) near(stats.lmsZ(stats.lmsValue(z, L, M, S), L, M, S), z, 1e-10);
});

test('projection uncertainty band brackets the central path', () => {
  const r = assess({ sex: 'female', ageYears: 42, heightCm: 168, weightKg: 92, activity: 'low', goalWeightKg: 78, paceMode: 'moderate' });
  const s = r.plan.series, u = r.plan.uncertainty;
  assert.equal(u.rmse, 246); // NASEM 2023 women
  assert.equal(u.burnMore.length, s.weight.length);
  assert.equal(u.burnLess.length, s.weight.length);
  const end = s.weight.length - 1;
  assert.ok(u.burnMore[end] < s.weight[end] && s.weight[end] < u.burnLess[end], 'burning more ends lighter, burning less ends heavier');
  near(u.burnMore[0], s.weight[0], 1e-9, 'all three start from today');
});

test('CDC: 95th percentile values quoted by Wei et al. 2020', () => {
  // "the BMI value at the 95th percentile for a girl 96.5 months of age is 20.7"
  const girl = growth.childBmi({ sex: 'female', ageMonths: 96.5, bmi: 17, reference: 'cdc' });
  near(girl.cutoffs.p95, 20.7, 0.05);
  // 12-year-old boy (144 months), P95 = 24.23
  const boy = growth.childBmi({ sex: 'male', ageMonths: 144, bmi: 40, reference: 'cdc' });
  near(boy.cutoffs.p95, 24.23, 0.03);
});

test('CDC extended: 12-year-old boy with BMI 40 (Wei 2020 worked example)', () => {
  near(growth.weiSigma('male', 12), 5.3, 0.01);
  const r = growth.childBmi({ sex: 'male', ageMonths: 144, bmi: 40, reference: 'cdc' });
  assert.equal(r.extended, true);
  near(r.percentile, 99.985, 0.002);
  near(r.z, 3.6, 0.05);
  assert.equal(r.category.key, 'obese3'); // 165% of P95
});

test('CDC: boy examples from Wei 2020 discussion', () => {
  // 10.0 y, BMI 21.6 -> 93.9th percentile (LMS)
  near(growth.childBmi({ sex: 'male', ageMonths: 120, bmi: 21.6, reference: 'cdc' }).percentile, 93.9, 0.15);
  // 11.0 y, BMI 23.6 -> extended percentile 95.3
  near(growth.childBmi({ sex: 'male', ageMonths: 132, bmi: 23.6, reference: 'cdc' }).percentile, 95.3, 0.1);
  // 16 y, BMI 29.3 -> extended z 1.76
  near(growth.childBmi({ sex: 'male', ageMonths: 192, bmi: 29.3, reference: 'cdc' }).z, 1.76, 0.03);
});

test('WHO references: median gives z = 0, restricted LMS beyond +3 SD', () => {
  const med = growth.bmiAtPercentile('female', 120, 50, 'who');
  near(growth.childBmi({ sex: 'female', ageMonths: 120, bmi: med, reference: 'who' }).z, 0, 1e-6);
  const r = growth.childBmi({ sex: 'male', ageMonths: 36, bmi: 16, reference: 'who' });
  assert.equal(r.table, 'who2006');
  const big = growth.childBmi({ sex: 'male', ageMonths: 120, bmi: 40, reference: 'who' });
  assert.ok(big.z > 3 && big.category.key === 'obese1');
});

test('Adult BMI classes incl. lower thresholds for Asian background', () => {
  near(anthro.bmi(70, 175), 22.857, 0.001);
  assert.equal(anthro.adultBmiClass(24, 'europid').key, 'healthy');
  assert.equal(anthro.adultBmiClass(24, 'southAsian').key, 'overweight');
  assert.equal(anthro.adultBmiClass(28, 'eastAsian').key, 'obese1');
  assert.equal(anthro.adultBmiClass(41, 'europid').key, 'obese3');
});

test('Body-fat estimators', () => {
  // Navy (Hodgdon-Beckett metric) agrees with the DoD inch formula (~19.9%).
  near(anthro.bfNavy({ sex: 'male', age: 30, heightCm: 180, neckCm: 38, waistCm: 90 }), 19.9, 0.3);
  near(anthro.bfRfm({ sex: 'male', age: 30, heightCm: 180, waistCm: 90 }), 24, 1e-9);
  near(anthro.bfRfm({ sex: 'female', age: 10, heightCm: 140, waistCm: 70 }), 74 - 44 + 5, 1e-9);
  // Gallagher 2000 Table 4/5 values at BMI 25, age 30.
  near(anthro.bfGallagher({ sex: 'female', age: 30, bmi: 25, ethnicity: 'europid' }), 33, 0.5);
  near(anthro.bfGallagher({ sex: 'male', age: 30, bmi: 25, ethnicity: 'europid' }), 20, 0.5);
  near(anthro.bfGallagher({ sex: 'female', age: 30, bmi: 25, ethnicity: 'eastAsian' }), 35, 0.5);
  near(anthro.bfGallagher({ sex: 'male', age: 70, bmi: 30, ethnicity: 'europid' }), 30, 0.6);
  assert.equal(anthro.bodyFatClass(35, 'female', 45, 'europid').key, 'high');
  assert.equal(anthro.fmiClass(10, 'male').label, 'Obese class I');
});

test('BMR equations', () => {
  const man = { sex: 'male', ageYears: 30, heightCm: 180, weightKg: 80 };
  const rows = energy.bmrAll(man).rows;
  const v = (id) => rows.find((r) => r.id === id).value;
  near(v('msj'), 1780, 1e-9);
  near(v('owen'), 879 + 816, 1e-9);
  near(v('schofield'), 11.472 * 80 + 873.1, 1e-9); // 30-60 band
  // Henry 2005 published kcal forms: men 18-30 = 16.0 W + 545; women 30-60 = 9.74 W + 694.
  near(energy.bmrAll({ sex: 'male', ageYears: 25, heightCm: 180, weightKg: 70 }).rows.find((r) => r.id === 'henry').value, 16.0 * 70 + 545, 5);
  near(energy.bmrAll({ sex: 'female', ageYears: 45, heightCm: 165, weightKg: 70 }).rows.find((r) => r.id === 'henry').value, 9.74 * 70 + 694, 5);
  // Schofield W+H child (ESPGHAN Table 2.2): boy 8 y, 25 kg, 1.28 m.
  near(energy.bmrAll({ sex: 'male', ageYears: 8, heightCm: 128, weightKg: 25 }).rows.find((r) => r.id === 'schofieldWH').value, 19.6 * 25 + 130.3 * 1.28 + 414.9, 1e-9);
  assert.equal(energy.bmrAll(man).primary.id, 'msj');
  assert.equal(energy.bmrAll(Object.assign({ athlete: true }, man)).primary.id, 'hb');
  assert.equal(energy.bmrAll(Object.assign({ athlete: true, ffmKg: 68, ffmMeasured: true }, man)).primary.id, 'cunningham80');
  assert.equal(energy.bmrAll({ sex: 'female', ageYears: 9, heightCm: 130, weightKg: 30 }).primary.id, 'schofieldWH');
});

test('NASEM 2023 EER', () => {
  const r = energy.nasemEer({ sex: 'male', ageYears: 40, heightCm: 180, weightKg: 90, activity: 'inactive' });
  near(r.eer, 753.07 - 10.83 * 40 + 6.5 * 180 + 14.1 * 90, 1e-9);
  const g = energy.nasemEer({ sex: 'female', ageYears: 10, heightCm: 140, weightKg: 35, activity: 'active' });
  near(g.eer, -189.55 - 22.25 * 10 + 11.74 * 140 + 18.34 * 35 + 30, 1e-9);
  assert.equal(g.growth, 30);
  // Implied PAL of an average inactive adult should fall inside the inactive band (< 1.53).
  const w = { sex: 'female', ageYears: 35, heightCm: 165, weightKg: 70, activity: 'inactive' };
  const pal = energy.nasemEer(w).tee / energy.bmrAll(w).primary.value;
  assert.ok(pal > 1.35 && pal < 1.6, 'implied PAL ' + pal);
});

function typicalModel(weight = 100, fatPct = 35, tee = 2800, rmr = 1900) {
  return hall.create({ weightKg: weight, fatMassKg: weight * fatPct / 100, baselineIntake: tee, rmr });
}

test('Hall model: energy balance holds weight steady', () => {
  const m = typicalModel();
  const s = hall.simulate(m, { intake: hall.constant(m.EI0), days: 365 });
  near(s.weight[365], 100, 1e-6);
});

test('Hall model: early loss beats the 3500 rule, long-term loss falls short of it', () => {
  const m = typicalModel();
  const intake = m.EI0 - 500;
  const s = hall.simulate(m, { intake: hall.constant(intake), days: 730 });
  assert.ok(100 - s.weight[7] > 100 - hall.rule3500(m, intake, 7), 'week 1');
  assert.ok(100 - s.weight[365] < 100 - hall.rule3500(m, intake, 365), 'year 1');
  // Hall 2011: roughly half of the eventual change occurs in about a year.
  const halfLife = hall.timeConstant(m) * Math.LN2;
  assert.ok(halfLife > 200 && halfLife < 550, 'half-life ' + halfLife);
});

test('Hall model: long-run change matches the steady-state formula; ~1 kg per 100 kJ/day', () => {
  const m = typicalModel(90, 30, 2600, 1750);
  const dEI = -100 / 4.184; // 100 kJ/day
  const ss = hall.steadyStateChange(m, dEI);
  near(ss, -1.0, 0.35, 'rule of thumb');
  const s = hall.simulate(m, { intake: hall.constant(m.EI0 - 500), days: 3650, dt: 1 });
  const ssBig = hall.steadyStateChange(m, -500);
  near(s.weight[3650] - 90, ssBig, Math.abs(ssBig) * 0.12, 'simulated vs linearised steady state');
});

test('Hall model: intake solver hits the goal and maintenance holds it', () => {
  const m = typicalModel();
  const intake = hall.intakeForGoal(m, 90, 180);
  const s = hall.simulate(m, { intake: hall.constant(intake), days: 180 });
  near(s.weight[180], 90, 0.05);
  const maint = hall.maintenanceIntake(m, s.fat[180], s.lean[180]);
  const s2 = hall.simulate(m, { intake: (t) => (t < 180 ? intake : maint), days: 180 + 180 });
  near(s2.weight[360], 90, 0.6, 'weight 6 months after reaching goal');
});

test('assess(): adult end-to-end', () => {
  const r = assess({ sex: 'female', ageYears: 42, heightCm: 168, weightKg: 92, activity: 'low', ethnicity: 'europid',
    waistCm: 102, hipCm: 118, neckCm: 36, goalWeightKg: 78, paceMode: 'moderate' });
  assert.equal(r.ok, true);
  assert.equal(r.bmiClass.key, 'obese1');
  assert.equal(r.adiposity.status, 'confirmed');
  assert.ok(r.plan.intake > 1200 && r.plan.intake < r.energy.tdee.primary);
  near(r.plan.series.weight[r.plan.days], 78, 0.1);
  assert.ok(r.plan.milestones.length >= 2);
  assert.ok(r.story.length >= 6);
  for (const it of r.story) for (const id of it.refs) refs.get(id);
});

test('assess(): child gets guidance, not a deficit plan', () => {
  const r = assess({ sex: 'male', ageYears: 10, heightCm: 140, weightKg: 45, activity: 'active', childReference: 'cdc', waistCm: 78 });
  assert.equal(r.ok, true);
  assert.equal(r.plan, undefined);
  assert.ok(r.child.primary.percentile > 95);
  assert.ok(r.pediatric.goal.length > 10);
  assert.equal(r.central.whtr.key, 'increased');
});

test('assess(): no loss plan toward an underweight goal, but maintenance still plans', () => {
  const r = assess({ sex: 'female', ageYears: 22, heightCm: 168, weightKg: 55, goalWeightKg: 45, activity: 'inactive' });
  assert.equal(r.ok, true);
  assert.equal(r.plan, undefined);
  assert.equal(r.planBlocked, 'underweight');
  assert.ok(r.warnings.some((w) => w.level === 'danger' && /does not plan weight loss/.test(w.text)));
  const ok = assess({ sex: 'female', ageYears: 22, heightCm: 168, weightKg: 55, goalWeightKg: 53, activity: 'inactive' });
  assert.ok(ok.plan && ok.plan.intake > 0);
  const thin = assess({ sex: 'female', ageYears: 22, heightCm: 168, weightKg: 50, activity: 'inactive' });
  assert.equal(thin.plan.mode, 'maintain');
});

test('assess(): severe thinness gets no plan of any kind, only a doctor notice', () => {
  for (const goalWeightKg of [null, 75, 45]) {
    const r = assess({ sex: 'male', ageYears: 35, heightCm: 180, weightKg: 50, goalWeightKg, paceMode: 'fast', activity: 'low' });
    assert.equal(r.plan, undefined);
    assert.equal(r.planBlocked, 'severeThinness');
    assert.ok(r.warnings.some((w) => w.level === 'danger' && /severe thinness/.test(w.text) && w.refs.includes('nice2006')));
  }
});

test('assess(): underweight without a goal gets a current-BMI notice, not a goal flag', () => {
  const r = assess({ sex: 'female', ageYears: 30, heightCm: 168, weightKg: 50, activity: 'inactive' });
  assert.equal(r.plan.mode, 'maintain');
  assert.ok(r.warnings.some((w) => w.level === 'warn' && /Your BMI of 17.7/.test(w.text)));
  assert.ok(!r.plan.flags.some((f) => /Goal BMI/.test(f.text)));
});

test('assess(): weight gain is capped at a 500 kcal surplus and stops at the obesity range', () => {
  const capped = assess({ sex: 'male', ageYears: 35, heightCm: 180, weightKg: 62, goalWeightKg: 70, paceMode: 'fast', activity: 'low' });
  assert.ok(capped.plan.intake - capped.energy.tdee.primary <= 500 + 1e-6);
  assert.ok(capped.plan.flags.some((f) => /at most a 500 kcal\/day surplus/.test(f.text)));
  const weeks = assess({ sex: 'female', ageYears: 30, heightCm: 165, weightKg: 60, goalWeightKg: 66, paceMode: 'weeks', weeks: 4 });
  assert.ok(weeks.plan.flags.some((f) => /would need a larger surplus/.test(f.text)));
  assert.ok(!weeks.plan.flags.some((f) => /lowest intake/.test(f.text)));
  const over = assess({ sex: 'female', ageYears: 30, heightCm: 165, weightKg: 60, goalWeightKg: 75, paceMode: 'gentle' });
  assert.ok(over.plan.flags.some((f) => f.level === 'warn' && /above the healthy range/.test(f.text)));
  const obese = assess({ sex: 'female', ageYears: 30, heightCm: 165, weightKg: 60, goalWeightKg: 90, paceMode: 'gentle' });
  assert.equal(obese.plan, undefined);
  assert.equal(obese.planBlocked, 'gainToObesity');
  const typed = assess({ sex: 'female', ageYears: 30, heightCm: 165, weightKg: 60, goalWeightKg: 66, paceMode: 'intake', intakeKcal: 4000 });
  assert.ok(typed.plan.flags.some((f) => /more than the 500 kcal\/day surplus/.test(f.text)));
});

test('assess(): typed intake and weeks are range-checked', () => {
  const base = { sex: 'female', ageYears: 30, heightCm: 165, weightKg: 80, goalWeightKg: 65 };
  assert.equal(assess({ ...base, paceMode: 'intake', intakeKcal: 20000 }).ok, false);
  assert.equal(assess({ ...base, paceMode: 'weeks', weeks: 0.5 }).ok, false);
  assert.equal(assess({ ...base, paceMode: 'weeks', weeks: -5 }).ok, false);
  // Values for the mode not in use are kept by the form and must not block the result.
  assert.equal(assess({ ...base, paceMode: 'moderate', weeks: 0.5, intakeKcal: 20000 }).ok, true);
  const vlcd = assess({ ...base, paceMode: 'intake', intakeKcal: 600 });
  assert.equal(vlcd.plan, undefined);
  assert.equal(vlcd.planBlocked, 'vlcd');
});

test('assess(): the projection is withheld when it leaves the model range', () => {
  const r = assess({ sex: 'male', ageYears: 30, heightCm: 145, weightKg: 34.7, goalWeightKg: 39.9, paceMode: 'intake', intakeKcal: 900 });
  assert.equal(r.plan, undefined);
  assert.equal(r.planBlocked, 'modelRange');
  const small = assess({ sex: 'male', ageYears: 100, heightCm: 145, weightKg: 40, activity: 'inactive' });
  for (const s of small.plan.scenarios) {
    assert.ok(s.deficit === 0 || s.intake >= 1500);
    assert.ok([s.w12, s.w26, s.w52].every(Number.isFinite));
  }
});

test('assess(): wrong-direction intake and water gain are described as such', () => {
  const up = assess({ sex: 'male', ageYears: 30, heightCm: 175, weightKg: 80, goalWeightKg: 75, paceMode: 'intake', intakeKcal: 4000 });
  assert.ok(up.plan.flags.some((f) => /predicts weight rising/.test(f.text)));
  const water = assess({ sex: 'male', ageYears: 30, heightCm: 175, weightKg: 80, goalWeightKg: 70, paceMode: 'moderate', activity: 'active', bodyFatPct: 3, extraActivityKcal: 1500 });
  const texts = water.story.map((s) => s.value + ' ' + s.text).join(' ');
  assert.ok(!/(^|\s)-\d/.test(texts), texts);
});

test('assess(): estimated body fat is not called "your" value, and wild estimates are dropped', () => {
  const r = assess({ sex: 'male', ageYears: 18, heightCm: 145, weightKg: 34.7, goalWeightKg: 39.9, paceMode: 'gentle' });
  const clamp = r.plan.flags.find((f) => /5% to 60%/.test(f.text));
  assert.ok(clamp && /the estimated/.test(clamp.text) && !/your /.test(clamp.text));
  const big = assess({ sex: 'male', ageYears: 70, heightCm: 165, weightKg: 163 });
  assert.ok(big.bodyFat.estimates.every((e) => e.value >= 3 && e.value <= 65));
  assert.ok(!big.bodyFat.estimates.some((e) => e.id === 'gallagher'));
});

test('assess(): implausible child values and teen pregnancy get a notice', () => {
  const implausible = assess({ sex: 'male', ageYears: 2, heightCm: 80, weightKg: 25.6, childReference: 'who' });
  assert.ok(implausible.warnings.some((w) => /check the height and weight/.test(w.text)));
  const teen = assess({ sex: 'female', ageYears: 16, heightCm: 165, weightKg: 60, pregnant: true });
  assert.equal(teen.warnings.filter((w) => /Pregnancy/.test(w.text)).length, 1);
  assert.equal(teen.plan, undefined);
});

test('under-5 activity cites WHO 2019, older children WHO 2020', () => {
  const small = assess({ sex: 'female', ageYears: 3, heightCm: 95, weightKg: 14 });
  assert.deepEqual(small.nutrition.activity.refs, ['who2019u5']);
  const older = assess({ sex: 'female', ageYears: 8, heightCm: 128, weightKg: 26 });
  assert.deepEqual(older.nutrition.activity.refs, ['who2020pa']);
});

test('assess(): a pace the app picks stays under the gallstone rate and is not called a chosen date', () => {
  const big = assess({ sex: 'male', ageYears: 45, heightCm: 180, weightKg: 200, goalWeightKg: 100, paceMode: 'fast' });
  assert.ok(big.plan.steadyRateKgPerWeek <= 1.5 + 1e-6);
  assert.ok(!big.plan.flags.some((f) => /gallstones/.test(f.text)));
  assert.ok(big.plan.flags.some((f) => /^This pace would reach the goal/.test(f.text)));
  assert.ok(!big.plan.flags.some((f) => /chosen timeframe/.test(f.text)));
  const dated = assess({ sex: 'female', ageYears: 30, heightCm: 165, weightKg: 70, goalWeightKg: 55, paceMode: 'weeks', weeks: 4 });
  assert.ok(dated.plan.flags.some((f) => /^Your chosen timeframe \(4 weeks\)/.test(f.text)));
  // A typed intake is shown as typed, so the gallstone notice still appears for it.
  const typed = assess({ sex: 'male', ageYears: 45, heightCm: 180, weightKg: 200, goalWeightKg: 100, paceMode: 'intake', intakeKcal: 1000 });
  assert.ok(typed.plan.flags.some((f) => /gallstones/.test(f.text)));
});

test('assess(): the below-BMR note mentions obesity only for BMI in the obesity range', () => {
  const below = (r) => r.plan.flags.find((f) => /resting metabolic rate/.test(f.text)).text;
  const over = assess({ sex: 'female', ageYears: 30, heightCm: 165, weightKg: 70, goalWeightKg: 55, paceMode: 'weeks', weeks: 4 });
  assert.doesNotMatch(below(over), /obesity/);
  const obese = assess({ sex: 'male', ageYears: 45, heightCm: 180, weightKg: 200, goalWeightKg: 100, paceMode: 'fast' });
  assert.match(below(obese), /obesity/);
});

test('every referenced citation id exists', () => {
  const r = assess({ sex: 'male', ageYears: 70, heightCm: 172, weightKg: 88, activity: 'inactive', waistCm: 104, goalWeightKg: 80, paceMode: 'fast' });
  const seen = new Set();
  const walk = (o) => {
    if (!o || typeof o !== 'object') return;
    if (Array.isArray(o.refs)) o.refs.forEach((id) => seen.add(id));
    for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v);
  };
  walk(r);
  for (const id of seen) refs.get(id);
  assert.ok(seen.size > 10);
});
