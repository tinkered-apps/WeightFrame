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
