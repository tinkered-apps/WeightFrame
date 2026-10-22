/* Renders an assessment result into the dashboard, in reading order:
 *   Outlook   - the dark forecast panel: the one number to act on, the projection, notices
 *   Conditions - where you stand today, each reading with its own small instrument
 *   Plan      - the energy-balance diagram, what the loss is made of, milestones
 *   Body & risk, Nutrition, Insights
 * plus a jump-nav built from whichever sections actually have content.
 *
 * i18n note: FH.i18n.apply() substring-replaces dictionary keys across this whole HTML string
 * in Polish, so no class name or attribute here may contain a lowercase dictionary key such as
 * "goal", "median" or "composition" - it would be rewritten along with the prose. */
(function (root) {
  const FH = root.FH = root.FH || {};
  const { fmt, charts, i18n } = FH;
  const I = (n, cls) => FH.icon(n, cls);
  const c = (ids) => fmt.cite(ids);
  const esc = fmt.esc;
  const isPL = () => i18n.getLocale() === 'pl';

  /* ---------- small building blocks ---------- */
  const hint = (label, tip) => tip ? `<button type="button" class="hint" data-tip="${esc(tip)}" aria-label="${esc(label)} – more info">${I('help')}</button>` : '';
  const panelBtn = (label, id) => `<button type="button" class="panel-btn" data-panel-trigger="${id}" aria-label="${esc(label)} – more info">${I('info')}</button>`;
  /** A number that rolls to its new value when inputs change (see app.js rollNumbers()). */
  const roll = (key, v, d, text) => `<span class="num" data-roll="${key}" data-v="${v}" data-d="${d}">${text}</span>`;

  const r10 = (v) => Math.round(v / 10) * 10;
  const roundParts = FH.stats.roundParts;

  const surface = (o, body) => `<article class="surface${o.cls ? ' ' + o.cls : ''}"${o.span ? ` data-span="${o.span}"` : ''}>${o.title ? `<header class="surface__head"><h3 class="surface__title">${o.title}</h3>${o.aside ? `<span class="surface__aside">${o.aside}</span>` : ''}</header>` : ''}${body}</article>`;
  const duo = (...parts) => { const p = parts.filter(Boolean); return p.length ? `<div class="duo${p.length === 1 ? ' duo--single' : ''}">${p.join('')}</div>` : ''; };

  function section(id, label, head, ...blocks) {
    const body = blocks.filter(Boolean).join('');
    if (!body) return { html: '', nav: null };
    const h = head ? `<header class="section-head"><h2 class="section-title" id="${id}-h">${head.title}</h2>${head.lead ? `<p class="section-lead">${head.lead}</p>` : ''}</header>` : '';
    return { html: `<section class="board-section" id="${id}"${head ? ` aria-labelledby="${id}-h"` : ''}>${h}${body}</section>`, nav: { id, label } };
  }

  const NOTICE_ICON = { danger: 'danger', warn: 'warn', info: 'info' };
  const FLAG_ORDER = { danger: 0, warn: 1, info: 2 };
  /** Every warning/safety flag for this result, most severe first, gathered in one place. */
  function noticesBlock(r) {
    const list = (r.warnings || []).concat(r.plan ? r.plan.flags : []).slice().sort((a, b) => FLAG_ORDER[a.level] - FLAG_ORDER[b.level]);
    if (!list.length) return '';
    return `<section class="notices" aria-labelledby="notices-h"><h3 class="notices__title" id="notices-h">Worth knowing</h3><ul class="notices__list">${list.map((f) =>
      `<li class="notice-row" data-kind="${f.level}"><span class="notice-row__icon">${I(NOTICE_ICON[f.level])}</span><p>${esc(f.text)} ${c(f.refs)}</p></li>`).join('')}</ul></section>`;
  }

  /* ---------- condition tiles ---------- */
  /** One reading in the "Where you stand today" strip: label, rolling value, instrument, note. */
  const cond = (o) => `<div class="cond"${o.level != null ? ` data-level="${o.level}"` : ''}>
      <div class="cond__label"><span>${o.label}</span>${o.panel ? panelBtn(o.label, o.panel) : hint(o.label, o.tip)}</div>
      <div class="cond__value">${o.value}${o.unit ? `<small>${o.unit}</small>` : ''}</div>
      ${o.gauge || ''}
      <div class="cond__note">${o.note || ''}</div>
    </div>`;
  const conditions = (title, tiles) => `<section class="conditions" aria-label="${esc(title)}"><h3 class="conditions__title">${title}</h3><div class="conditions__grid">${tiles.join('')}</div></section>`;

  /* ============================== Adults ============================== */
  /** Locale- and units-aware label for the classic "3,500 kcal = 1 lb" rule of thumb. */
  const ruleLabel = () => isPL()
    ? (fmt.units === 'metric' ? '„7700 kcal = 1 kg”' : '„3500 kcal = 1 funt”')
    : (fmt.units === 'metric' ? '“7,700 kcal = 1 kg”' : '“3,500 kcal = 1 lb”');

  function outlookAdult(r, ctx) {
    const p = r.plan, e = r.energy;
    const pl = isPL(), H = i18n.HERO_PL;
    const head = (meta, right) => `<header class="outlook__head"><h2 class="outlook__title" id="outlook-h">Your outlook</h2><div class="outlook__head-right">${meta ? `<p class="outlook__meta">${meta}</p>` : ''}${right || ''}</div></header>`;
    const numeral = (label, tip, v, unitTxt) => `<p class="outlook__label">${label}${hint(label, tip)}</p>
      <p class="outlook__numeral">${roll('headline', Math.round(v / 10) * 10, 0, fmt.kcal(v))}<small>${unitTxt}</small></p>`;
    const fact = (label, value, tip, sub) => `<div class="fact"><dt>${label}${hint(label, tip)}</dt><dd>${value}${sub ? `<span class="fact__sub">${sub}</span>` : ''}</dd></div>`;

    if (!p) {
      const maintHint = 'From the National Academies 2023 equation, fitted to about 6,500 doubly labeled-water measurements – the gold-standard method for free-living energy expenditure.';
      return `<article class="outlook outlook--solo" aria-labelledby="outlook-h">${head(`Energy balance ${c(['nasem2023'])}`)}
        <div class="outlook__now">${numeral('Maintenance', maintHint, e.tdee.primary, 'kcal/day')}
        <p class="outlook__lead">${r.planBlocked ? 'No weight-change plan is shown. The notice below explains why.' : 'Weight-loss planning is switched off.'}</p></div></article>`;
    }

    const intakeHint = fmt.units === 'metric'
      ? "Computed by the NIH dynamic model (Hall 2011), which adjusts for your body's slowing metabolism as you lose weight – not a fixed 7,700 kcal-per-kilogram rule."
      : "Computed by the NIH dynamic model (Hall 2011), which adjusts for your body's slowing metabolism as you lose weight – not a fixed 3,500 kcal-per-pound rule.";
    const deficitHint = "The gap between today's maintenance and your planned intake. The model narrows this gap on its own as your body adapts, even at a constant intake.";
    const paceHint = 'Guideline diets stay under about 1% of body weight a week. Faster loss raises the risk of gallstones and losing lean tissue along with fat.';
    const afterHint = "Lower than today's maintenance because a lighter body burns less energy – from the same NIH dynamic model (Hall 2011) used for your projection.";

    let lead = '', foot = '', target = '', ruleTip = '';
    const facts = [];
    const deficitShown = r10(e.tdee.primary) - r10(p.intake);
    const kcalEm = `<em>${fmt.kcal(p.intake)} kcal${pl ? '' : ' a day'}</em>`;
    if (p.mode === 'maintain') {
      lead = pl ? H.maintainOnly(kcalEm) + fmt.mass(r.input.weightKg) + '.' : `Eat about ${kcalEm} to stay at ${fmt.mass(r.input.weightKg)}.`;
      foot = 'Your goal matches your current weight, so this is a maintenance projection. Change the goal weight to plan a loss.';
    } else if (p.days == null) {
      lead = pl ? H.plateau(kcalEm, fmt.mass(p.plateauKg), fmt.mass(p.goalKg)) : `At ${kcalEm} your weight levels off near ${fmt.mass(p.plateauKg)}, short of ${fmt.mass(p.goalKg)}.`;
      foot = 'Expenditure falls as weight falls, so a fixed intake always ends in a plateau. Lower the intake, add activity, or pick a date instead.';
      facts.push(fact('Goal weight', fmt.mass(p.goalKg)));
      facts.push(fact(deficitShown < 0 ? 'Starting surplus' : 'Starting deficit', `${fmt.n(Math.abs(deficitShown))} <small>kcal/day</small>`, deficitHint));
    } else {
      const gain = p.lossKg < 0;
      target = `<div class="outlook__target">
          <p class="outlook__label">Goal weight <b>${fmt.mass(p.goalKg)}</b></p>
          <p class="outlook__date">${fmt.date(p.days)}</p>
          <p class="outlook__in">Time to goal <b>${fmt.weeks(p.days)}</b></p>
        </div>`;
      if (p.lossKg > 0.25) facts.push(fact('Average pace', `${fmt.mass(p.avgRateKgPerWeek, 2)}<small>/week</small>`, paceHint));
      facts.push(fact(deficitShown < 0 ? 'Starting surplus' : 'Starting deficit', `${fmt.n(Math.abs(deficitShown))} <small>kcal/day</small>`, deficitHint));
      if (p.lossKg > 0.25) facts.push(fact('Maintenance after goal', `${fmt.kcal(p.maintenanceAtGoal)} <small>kcal/day</small>`, afterHint));
      const afterGoalText = p.lossKg > 0.25 ? (pl ? H.afterGoal(fmt.kcal(p.maintenanceAtGoal)) : `After the goal, maintenance is about ${fmt.kcal(p.maintenanceAtGoal)} kcal a day. `) : '';
      if (gain) {
        foot = 'Projection from the NIH dynamic model.';
      } else if (p.rule3500) {
        // Explains what the "7,700/3,500 kcal" rule would have promised - shown as a hint on
        // its chart legend entry instead of a paragraph, so it doesn't compete with the chart
        // for space.
        ruleTip = (pl ? H.ruleWould(fmt.weeks(p.rule3500.daysToGoal), ruleLabel()) : `The popular ${ruleLabel()} rule would promise ${fmt.weeks(p.rule3500.daysToGoal)}. It ignores that your body burns less as it gets smaller. `) + afterGoalText;
      } else {
        foot = afterGoalText;
      }
    }
    // Other BMI classification bands above the healthy range, only up through the level you're
    // actually in - so the chart shows "here's where you are and what's between you and
    // healthy" rather than the full clinical scale.
    let bmiBands = null;
    if (r.bmi > r.healthyRange.bmiMax && r.input.heightCm) {
      const t = r.bmiClass.thresholds, hc = r.input.heightCm;
      const levels = [
        { level: 1, lo: t.overweight, hi: t.obese, label: 'Overweight' },
        { level: 2, lo: t.obese, hi: t.obese2, label: 'Obesity class I' },
        { level: 3, lo: t.obese2, hi: t.obese3, label: 'Obesity class II' },
        { level: 4, lo: t.obese3, hi: null, label: 'Obesity class III' },
      ];
      bmiBands = levels.filter((lv) => lv.level <= r.bmiClass.level)
        .map((lv) => ({ level: lv.level, loKg: FH.anthro.weightForBmi(lv.lo, hc), hiKg: lv.hi != null ? FH.anthro.weightForBmi(lv.hi, hc) : null, label: lv.label }));
    }
    const chart = charts.trajectory(p, { healthy: r.healthyRange, width: ctx.outlookChartW, animate: ctx.animate, ruleTip, bmiBands });
    FH._binders.push(chart.bind);
    const label = p.mode === 'maintain' ? 'Maintenance' : 'Daily intake';
    return `<article class="outlook" aria-labelledby="outlook-h">${head(`Dynamic model (NIH / Hall 2011) ${c(['hall2011'])}`, chart.chip)}
      <div class="outlook__grid">
        <div class="outlook__now">
          ${numeral(label, intakeHint, p.intake, 'kcal/day')}
          ${target}
          ${lead ? `<p class="outlook__lead">${lead}</p>` : ''}
          ${facts.length ? `<dl class="outlook__facts">${facts.join('')}</dl>` : ''}
        </div>
        <div class="outlook__chart">${chart.html}</div>
      </div>
      ${foot ? `<p class="outlook__foot">${foot}${c(['hall2011'])}</p>` : ''}
      <p class="outlook__note">An estimate from population equations, not medical advice. Talk to a doctor before a large change, or if you have a health condition or take medication.</p>
    </article>`;
  }

  /** Sources of the body-fat value used across the page: the estimators its median came from,
   *  none when the person entered a measurement. */
  const bodyFatRefs = (r) => r.bodyFat.basis === 'measured' ? []
    : r.bodyFat.estimates.filter((e) => e.kind === r.bodyFat.basis).flatMap((e) => e.refs);

  /** "Where you stand today": body composition then energy needs, always the same 4 readings. */
  function conditionsAdult(r) {
    const e = r.energy, b = e.bmr, t = r.bmiClass.thresholds;
    const bf = r.bodyFat.consensus;
    const bfRefs = bodyFatRefs(r).concat(r.fatClass ? r.fatClass.refs : []);
    const bfBasis = bf ? (r.bodyFat.basis === 'measured' ? 'Measured' : r.bodyFat.basis === 'circumference' ? 'Estimated from your measurements' : 'Estimated from BMI, age & sex') : 'Add waist and neck for an estimate';
    const maintHint = 'From the National Academies 2023 equation, fitted to about 6,500 doubly labeled-water measurements – the gold-standard method for free-living energy expenditure.';

    const bmiGauge = charts.meter({ min: 15, max: 45, value: r.bmi, level: r.bmiClass.level,
      band: [18.5, t.overweight],
      ticks: [18.5, t.overweight, t.obese, t.obese3].map((v) => ({ v, label: fmt.n(v, v % 1 ? 1 : 0) })) });
    const fr = r.fatClass && r.fatClass.range;
    const bfGauge = bf ? charts.meter({ min: 5, max: 55, value: bf, level: r.fatClass ? r.fatClass.level : null,
      band: fr ? [fr.low, fr.overweight] : null,
      ticks: fr ? [fr.low, fr.overweight].map((v) => ({ v, label: fmt.n(v) + '%' })) : null }) : '';
    const restShare = b.primary.value / e.tdee.primary * 100;
    const restGauge = charts.meter({ min: 0, max: 100, value: restShare, fill: true });
    const [r0, r1] = e.tdee.range68, spread = r1 - r0;
    const maintGauge = charts.meter({ min: r0 - spread * 0.45, max: r1 + spread * 0.45, value: e.tdee.primary, band: [r0, r1],
      ticks: [{ v: r0, label: fmt.kcal(r0) }, { v: r1, label: fmt.kcal(r1) }] });

    return conditions('Where you stand today', [
      cond({ label: 'BMI', value: roll('bmi', +r.bmi.toFixed(1), 1, fmt.n(r.bmi, 1)), unit: 'kg/m²', level: r.bmiClass.level, gauge: bmiGauge,
        note: fmt.pill(r.bmiClass.label, r.bmiClass.level) + ' ' + c(r.bmiClass.refs) }),
      cond({ label: 'Body fat', value: bf ? roll('bf', +bf.toFixed(1), 1, fmt.n(bf, 1)) : '–', unit: bf ? '%' : '', level: r.fatClass ? r.fatClass.level : null, gauge: bfGauge,
        note: (r.fatClass ? fmt.pill(r.fatClass.label, r.fatClass.level) + ' ' : '') + `<span class="cond__basis">${bfBasis}</span> ${c(bfRefs)}` }),
      cond({ label: 'Resting burn', value: roll('bmr', Math.round(b.primary.value / 10) * 10, 0, fmt.kcal(b.primary.value)), unit: 'kcal/day', panel: 'bmr', gauge: restGauge,
        note: `<span><b>${fmt.n(restShare)}%</b> of your daily burn · ${esc(b.primary.name)} ${c(b.primary.refs)}</span>` }),
      cond({ label: 'Maintenance', value: roll('tdee', Math.round(e.tdee.primary / 10) * 10, 0, fmt.kcal(e.tdee.primary)), unit: 'kcal/day', tip: maintHint, gauge: maintGauge,
        note: `Likely range ${fmt.kcal(r0)}–${fmt.kcal(r1)} ${c(['nasem2023'])}` }),
    ]);
  }

  /** The signature diagram: what you burn against what you eat, the deficit held between them
   *  like a cord under tension, and the tick where your burn will sit once you reach the goal. */
  function balanceCard(r) {
    const p = r.plan;
    if (!p || p.mode === 'maintain') return '';
    const e = r.energy;
    // Work in the rounded values actually printed, so the parts always sum to the totals.
    const rest = r10(e.bmr.primary.value), tdee = r10(e.tdee.primary), extra = r10(p.extraActivity || 0);
    const move = Math.max(0, tdee - rest);
    const out = tdee + extra, eat = r10(p.intake);
    const max = Math.max(out, eat) * 1.02;
    const pct = (v) => (v / max * 100);
    const seg = (cls, v, label) => {
      const w = pct(v);
      return `<span class="bal__seg bal__seg--${cls}${w < 13 ? ' is-tight' : ''}" style="width:${w.toFixed(2)}%"><b>${label}</b><span>${fmt.n(v)}</span></span>`;
    };
    const surplus = eat > out;
    const gapFrom = Math.min(eat, out), gapTo = Math.max(eat, out);
    const gapLabel = surplus ? 'Surplus' : 'Deficit';
    const gap = `<span class="bal__gap${surplus ? ' is-surplus' : ''}" style="left:${pct(gapFrom).toFixed(2)}%;width:${pct(gapTo - gapFrom).toFixed(2)}%"><i class="bal__cord"></i><b class="bal__gap-label">${gapLabel} <span>${fmt.n(gapTo - gapFrom)}</span> kcal/day</b></span>`;

    // The at-goal note hangs above the burn bar on a leader line that ends at the tick.
    let note = '', tick = '';
    const goalBurn = p.days && p.lossKg > 0.25 ? p.maintenanceAtGoal + extra : null;
    if (goalBurn) {
      const x = pct(goalBurn), end = x > 55;
      tick = `<i class="bal__tick" style="left:${x.toFixed(2)}%"></i>`;
      note = `<div class="bal__notes"><p class="bal__note${end ? ' is-end' : ''}" style="${end ? `right:${(100 - x).toFixed(2)}%` : `left:${x.toFixed(2)}%`}">At your goal you will burn about <b>${fmt.kcal(goalBurn)} kcal/day</b>, so the same intake leaves a smaller gap every week. ${c(['hall2011'])}</p></div>`;
    }
    const body = `<div class="bal">
        ${note}
        <span class="bal__label" data-r="1">You burn</span>
        <div class="bal__track" data-r="1">${seg('rest', rest, 'Resting burn')}${seg('move', move, 'Activity & digestion')}${extra ? seg('extra', extra, 'Extra exercise') : ''}${tick}</div>
        <span class="bal__total" data-r="1">${fmt.n(out)}<small>kcal</small></span>
        <span class="bal__label" data-r="2">You eat</span>
        <div class="bal__track" data-r="2">${seg('eat', eat, 'Planned intake')}${Math.abs(out - eat) > 1 ? gap : ''}</div>
        <span class="bal__total" data-r="2">${fmt.n(eat)}<small>kcal</small></span>
      </div>`;
    return surface({ cls: 'surface--balance' }, body);
  }

  function lossCard(r) {
    const p = r.plan;
    if (!p || p.lossKg <= 0.25 || !p.days) return '';
    const d = p.change, tot = -d.total;
    const parts = [
      { k: 'Fat', v: -d.fat, cls: 'fat' },
      { k: 'Lean tissue', v: -d.lean, cls: 'lean' },
      { k: 'Glycogen & water', v: -d.water, cls: 'water' },
    ].filter((x) => x.v > 0.01);
    const shown = roundParts(parts.map((x) => fmt.massVal(x.v)), 1);
    // Shares of what is shown, so they add up to 100% even when water rises instead of falling.
    const shownTot = parts.reduce((a, x) => a + x.v, 0) || tot;
    const pcts = roundParts(parts.map((x) => x.v / shownTot * 100), 0);
    const waterUp = d.water > 0.05 ? `<p class="small">Glycogen and its water rise by ${fmt.mass(d.water)}, because you eat more carbohydrate than before, so the scale drops less than this.</p>` : '';
    const bar = `<div class="stackbar" role="img" aria-label="Composition of projected loss">${parts.map((x) => `<span class="stackbar__${x.cls}" style="flex:${x.v} 0 0" title="${x.k}: ${fmt.mass(x.v)}"></span>`).join('')}</div>`;
    const rows = parts.map((x, i) => `<li><i class="lg lg--${x.cls}"></i><span class="split__k">${x.k}</span><b class="split__v">${fmt.n(shown[i], 1)} ${fmt.massUnit()}</b><span class="split__p">${fmt.n(pcts[i])}%</span></li>`).join('');
    const body = `<p class="big-stat">${fmt.n(shown.reduce((a, b) => a + b, 0), 1)} ${fmt.massUnit()}</p>${bar}<ul class="split">${rows}</ul>${waterUp}
      <p class="small muted">The lean share depends on how much fat you start with (Forbes' curve): the leaner you are, the more of each kilogram comes from lean tissue. ${c(['hall2007', 'hall2011'])}</p>`;
    return surface({ title: 'What you will lose' }, body);
  }

  /** The milestones the chart marks with diamonds, as a readable list (hover-only before). */
  function milestonesCard(r) {
    const p = r.plan;
    if (!p || p.lossKg <= 0.25 || !p.days) return '';
    const list = (p.milestones || []).slice();
    const item = (day, title, weight, text, refs, cls) => `<li class="ms${cls ? ' ' + cls : ''}">
        <span class="ms__when"><b>${fmt.date(day)}</b><span>week ${fmt.n(day / 7, 0)}</span></span>
        <span class="ms__mark" aria-hidden="true"></span>
        <span class="ms__what"><b>${esc(title)}</b> <span class="ms__weight">${fmt.mass(weight)}</span>${text ? `<span class="ms__text">${esc(text)} ${c(refs)}</span>` : (refs && refs.length ? ' ' + c(refs) : '')}</span>
      </li>`;
    const rows = list.map((m) => item(m.day, m.label, m.weight, m.text, m.refs)).join('') +
      item(p.days, i18n.t('Goal weight'), p.goalKg, '', [], 'ms--end');
    return surface({ title: 'Milestones along the way' }, `<ol class="timeline">${rows}</ol>`);
  }

  /** BMI and body composition told as one story: classification and central-fat risk on the
   *  left, the body-fat method comparison on the right, composition numbers across the bottom,
   *  closing on the single adiposity verdict. */
  function bodyRiskCard(r) {
    const t = r.bmiClass.thresholds;
    const segs = [
      { from: 12, to: 18.5, label: 'Underweight', level: 1 },
      { from: 18.5, to: t.overweight, label: 'Healthy', level: 0 },
      { from: t.overweight, to: t.obese, label: 'Overweight', level: 1 },
      { from: t.obese, to: t.obese2, label: 'Obesity I', level: 2 },
      { from: t.obese2, to: t.obese3, label: 'Obesity II', level: 3 },
      { from: t.obese3, to: 50, label: 'Obesity III', level: 4 },
    ];
    const bmiScale = charts.scale(r.bmi, segs, { min: 14, max: 48, format: (v) => fmt.n(v, v % 1 ? 1 : 0) });
    const cen = r.central;
    const line = (name, val, cls, refs) => `<li class="measure"><span class="measure__k">${name} ${c(refs)}</span><b class="measure__v">${val}</b>${cls ? fmt.pill(cls.label, cls.level) : ''}</li>`;
    let meas = '';
    if (cen.waist) meas += line('Waist', fmt.circ(r.input.waistCm), cen.waist, cen.waist.refs);
    if (cen.whtr) meas += line('Waist ÷ height', fmt.n(cen.whtr.value, 2), cen.whtr, cen.whtr.refs);
    if (cen.whr) meas += line('Waist ÷ hip', fmt.n(cen.whr.value, 2), cen.whr, cen.whr.refs);
    const left = `<h3 class="col-title">BMI <span class="col-title__value">${fmt.n(r.bmi, 1)}</span>${fmt.pill(r.bmiClass.label, r.bmiClass.level)}</h3>
      ${bmiScale}
      ${r.bmiClass.olderNote ? `<p class="small">${esc(r.bmiClass.olderNote)} ${c(['winter2014'])}</p>` : ''}
      <h3 class="col-title col-title--gap">Central fat</h3>
      ${meas ? `<ul class="measures">${meas}</ul>` : '<p class="small muted">Add your waist (and hip) under <b>Measurements</b> to see central-fat risk.</p>'}`;

    const bf = r.bodyFat, comp = r.composition;
    let right = '<h3 class="col-title">Body fat</h3>';
    if (bf.estimates.length) {
      const rows = bf.estimates.map((e) => ({ label: e.name.replace(/ \(.*\)$/, ''), value: e.value, primary: false, note: e.note }));
      if (r.input.bodyFatPct > 0) rows.unshift({ label: 'Your measurement', value: r.input.bodyFatPct, primary: true });
      const range = r.fatClass ? r.fatClass.range : null;
      const dp = charts.dotplot(rows, { band: range ? [range.low, range.overweight] : null, bandLabel: 'healthy range for your age & sex', marker: r.input.bodyFatPct > 0 ? null : bf.consensus, markerLabel: 'best estimate', primaryLabel: 'your measurement', format: (v) => fmt.n(v, 0) + '%', minPad: 3, aria: 'Body-fat percentage by method' });
      right += dp.html;
      right += `<p class="small muted">Methods: ${bf.estimates.map((e) => esc(e.name.replace(/ \(.*\)$/, '')) + c(e.refs)).join(' · ')}. Healthy band: ${c(['gallagher2000'])}</p>`;
      if (bf.spread && bf.spread[1] - bf.spread[0] > 15) right += '<p class="small">At this BMI the formulas disagree widely, so treat each one as a rough guide.</p>';
      if (!r.input.waistCm) right += '<p class="small">Add waist (and neck; women also hip) under <b>Measurements</b>: circumference methods beat BMI-only formulas.</p>';
    } else right += '<p class="muted">Not enough data.</p>';

    let strip = '';
    if (comp) {
      const cell = (label, value, unit, note) => `<div class="strip__cell"><span class="strip__label">${label}</span><span class="strip__value">${value}${unit ? `<small>${unit}</small>` : ''}</span>${note ? `<span class="strip__note">${note}</span>` : ''}</div>`;
      const bfCite = c(bodyFatRefs(r));
      const cells = [
        cell('Fat mass', fmt.n(fmt.massVal(comp.fatMassKg), 1), fmt.massUnit(), bfCite),
        cell('Fat-free mass', fmt.n(fmt.massVal(comp.fatFreeMassKg), 1), fmt.massUnit(), 'Muscle, organs, bone, water ' + bfCite),
      ];
      if (comp.fmiClass) cells.push(cell('Fat mass index', fmt.n(comp.fmi, 1), 'kg/m²', fmt.pill(comp.fmiClass.label, comp.fmiClass.level) + ' ' + c(['kelly2009'])));
      cells.push(cell('Fat-free mass index', fmt.n(comp.ffmiNormalized, 1), 'kg/m²', c(['kouri1995'])));
      const hr = r.healthyRange, range = r.story.find((x) => x.id === 'range');
      if (hr && range) cells.push(cell(esc(range.title), `${fmt.n(fmt.massVal(hr.minKg), 1)}–${fmt.n(fmt.massVal(hr.maxKg), 1)}`, fmt.massUnit(), c(range.refs)));
      strip = `<div class="strip">${cells.join('')}</div>
        <p class="small muted">Fat-free mass index (height-normalized) rarely exceeds ~25 in drug-free men. ${c(['kouri1995'])}</p>`;
    }
    const verdict = `<div class="verdict">${I('target', 'verdict__icon')}<div><p><b>Excess body fat?</b> ${esc(r.adiposity.text)} ${c(r.adiposity.refs)}</p>
      <p class="small muted">The 2025 Lancet Commission on clinical obesity asks for BMI to be confirmed by a waist-based measure or body-fat measurement before calling it obesity.</p></div></div>`;
    return surface({}, `<div class="cols"><div class="cols__col">${left}</div><div class="cols__col">${right}</div></div>${strip}${verdict}`);
  }

  /** The physiology notes laid out on the plan's own timeline - first week, while losing, at the
   *  goal, afterwards - each phase opening with its headline fact, the rest set smaller. */
  function insights(r) {
    const p = r.plan;
    const by = Object.fromEntries(r.story.map((s) => [s.id, s]));
    if (!p || !p.days || !by.firstweek) return '';
    const phases = [
      { title: 'First week', when: `${fmt.date(0)} – ${fmt.date(7)}`, ids: ['firstweek'], mark: 'now' },
      { title: 'While you lose', when: `→ ${fmt.date(p.days)}`, ids: ['composition', 'energy', 'rule'] },
      { title: 'At your goal', when: fmt.date(p.days), ids: ['adaptation', 'maintenance'], mark: 'aim' },
      { title: 'Afterwards', when: `${fmt.date(p.days)} →`, ids: ['appetite', 'halflife'] },
    ].map((ph) => Object.assign(ph, { items: ph.ids.map((id) => by[id]).filter(Boolean) })).filter((ph) => ph.items.length);
    const item = (s, lead) => `<article class="ahead__item${lead ? ' is-lead' : ''}"><h4 class="ahead__k">${esc(s.title)}</h4><p class="ahead__v">${esc(s.value)}</p><p class="ahead__t">${esc(s.text)} ${c(s.refs)}</p></article>`;
    return `<div class="ahead">${phases.map((ph) => `<section class="phase" data-mark="${ph.mark || ''}">
        <header class="phase__head"><span class="phase__dot" aria-hidden="true"></span><h3 class="phase__title">${ph.title}</h3><p class="phase__when">${ph.when}</p></header>
        ${ph.items.map((s, i) => item(s, i === 0)).join('')}
      </section>`).join('')}</div>`;
  }

  /* ---------- What else moves the needle ---------- */
  /* The evidence-anchored counterpart to insights(): factors outside the calorie arithmetic
   * that measurably change how a deficit plays out. Everything here is fixed content, not a
   * function of the inputs - the one live number is the reader's own starting deficit, drawn
   * on the same axis as the four effects that were themselves measured in kcal/day, so the
   * comparison is visual rather than asserted. Each card carries the study design and sample
   * behind its figure, because the honest reading of a 16-person crossover is not the honest
   * reading of a meta-analysis. */
  const LEVER_BARS = [
    { label: 'Ultra-processed food, calories and macros matched', v: 508, refs: ['hall2019upf'],
      note: 'Two weeks on each menu, inpatient, eating as much as you like.' },
    { label: 'Sleeping 1.2 hours longer, if you sleep under 6.5', v: -270, refs: ['tasali2022'],
      note: 'Intake measured by doubly labeled water, not by a food diary.' },
    { label: '500 ml of water before each of three meals', v: -130, derived: true, refs: ['dennis2010'],
      note: 'Measured as 43 kcal at one test meal, counted three times; it had faded by week 12.' },
    { label: 'A drink with the meal, before the drink itself counts', v: 82, derived: true, refs: ['kwok2019'],
      note: 'Extra food eaten at that one sitting, pooled over 12 short-term experiments – not a daily effect unless you drink with most meals.' },
  ];

  const LEVER_GROUPS = [
    { title: 'What the weight is made of', items: [
      { k: 'Short sleep moves the loss from fat to lean tissue', v: '55%', unit: 'less of it fat',
        design: 'Randomized crossover · 10 adults with overweight · 14 days on one reduced-calorie diet',
        t: 'Same diet, and roughly the same 3 kg gone either way. On 5.5 hours in bed instead of 8.5, only 0.6 kg of that was fat instead of 1.4 kg, while lean-tissue loss rose from 1.5 kg to 2.4 kg. Hunger and ghrelin were higher and less fat was burned for fuel.',
        q: 'Sleep curtailment decreased the proportion of weight lost as fat by 55%.',
        refs: ['nedeltcheva2010'],
        tail: 'The same direction shows up over years, not just weeks: among 68,183 women followed for 16 years, those sleeping 5 hours or less gained 1.14 kg more than the 7-hour sleepers.', tailRefs: ['patel2006'] },
      { k: 'Past about 500 kcal a day, training stops adding lean mass', v: '500', unit: 'kcal/day',
        design: 'Meta-analysis and meta-regression · randomized trials of 3 weeks or more of resistance training in a deficit',
        t: 'Lifting while in a deficit keeps your strength, no differently from lifting with full energy available. But the meta-regression puts the deficit where resistance training stops adding lean mass at about 500 kcal a day – it is about lean-mass gains stalling, not about losing what training would otherwise have protected. It works alongside the protein target in Nutrition, not instead of it.',
        q: '…an energy deficit of ~500 kcal · day⁻¹ prevented gains in LM [lean mass].',
        refs: ['murphy2022'], dyn: 'deficit' },
    ] },
    { title: 'What you burn without trying', items: [
      { k: 'Moving about without calling it exercise', v: '10×', unit: 'difference in fat gained',
        design: 'Overfeeding study · 16 adults of healthy weight · 1,000 kcal/day surplus for 8 weeks',
        t: 'Fed the same surplus for the same eight weeks, some people burned much of it off by moving more without deciding to: posture, walking about, fidgeting. That swing ran from 98 kcal/day less to 692 kcal/day more, and it explained a ten-fold spread in how much fat they actually put on. The channel runs in reverse on a diet, where eating less quietly makes you move less.',
        q: 'Changes in NEAT accounted for the 10-fold differences in fat storage that occurred…',
        refs: ['levine1999'] },
      { k: 'The same meals, four hours later', v: '4 h', unit: 'later, nothing else changed',
        design: 'Randomized crossover · 16 adults with overweight or obesity · meals, sleep, light and activity held identical',
        t: 'Shifting identical meals about four hours later raised hunger, tilted the ghrelin-to-leptin ratio towards appetite, lowered waking energy expenditure and 24-hour core temperature, and moved fat-tissue gene expression away from releasing fat and towards storing it.',
        q: 'Late eating increased hunger… Furthermore, late eating decreased waketime energy expenditure…',
        refs: ['vujovic2022'] },
    ] },
    { title: 'Whether you can see where you are', items: [
      { k: 'Self-reported intake often runs below actual intake', v: '47%', unit: 'under-reported',
        design: 'Metabolic study · 10 adults who could not lose weight on a reported 1,200 kcal/day · 14 days of calorimetry and doubly labeled water',
        t: "This small group's metabolism turned out to be ordinary: total expenditure sat within 5% of what the equations predicted. Their food and activity records were the thing that was wrong, with intake under-reported by 47% and activity over-reported by 51%. It is one of the reasons a plan and a bathroom scale can disagree, alongside water, timing and measurement noise – a 10-person study does not establish how often it explains any given gap.",
        q: '…underreported their actual food intake by an average (± SD) of 47 ± 16 percent…',
        refs: ['lichtman1992'] },
      { k: 'Logging often tracks with success more than logging carefully', v: '2.7', unit: 'vs 1.7 entries a day',
        design: '24-week online behavioral program · 142 adults',
        t: "Minutes spent recording did not separate the successful from the rest in this program; how often they came back did. People who lost a tenth of their body weight or more opened their diary 2.7 times a day against 1.7 for everyone else – an association, not a controlled test of one against the other. It also gets cheaper with practice: 23 minutes a day in month one, 15 by month six.",
        q: 'The frequency of self-monitoring is significantly related to weight loss…',
        refs: ['harvey2019'] },
      { k: 'Weigh yourself often, but read the trend', v: '1.7 kg', unit: 'added to a program',
        design: 'Meta-analysis of randomized trials · 4 adding self-weighing to an existing program',
        t: 'Adding self-weighing and self-regulation to a weight-loss program was worth an extra 1.7 kg (95% CI 0.8 to 2.6). On its own it did nothing measurable, so the scale is a feedback signal rather than a treatment. Day to day it mostly tracks water, as the first week above shows, which is why the weekly average is the number to read.',
        q: 'Four trials added self-weighing/self-regulation techniques to multi-component programmes and resulted in a significant difference of −1.7 kg…',
        refs: ['madigan2015'] },
    ] },
  ];

  /** The reader's own starting deficit, on the same footing as the deficit shown in Outlook
   *  (both ends rounded to 10 first, so the two never disagree by a stray kcal). */
  const startingDeficit = (r) => (r.plan && r.plan.mode !== 'maintain' ? r10(r.energy.tdee.primary) - r10(r.plan.intake) : 0);

  function leverBars(r) {
    const you = startingDeficit(r);
    // The axis belongs to the four effects (the largest is 508), so it only stretches far
    // enough to seat a modest deficit beside them; a deep one pins to the edge and says so,
    // rather than squashing every bar to a stub to make room for one marker.
    const span = Math.min(800, Math.max(600, Math.ceil((Math.abs(you) + 90) / 100) * 100));
    const offScale = you > span;
    const pos = (v) => Math.max(0, Math.min(100, 50 + v / span * 50)).toFixed(2);
    const row = (b) => {
      const w = Math.abs(b.v) / span * 50;
      const left = b.v < 0 ? 50 - w : 50;
      return `<div class="kbar">
        <span class="kbar__k">${b.label} ${c(b.refs)}<em class="kbar__note">${b.note}</em></span>
        <span class="kbar__track"><i class="kbar__mid"></i>
          <i class="kbar__fill${b.v > 0 ? ' kbar__fill--adds' : ' kbar__fill--cuts'}${b.derived ? ' kbar__fill--derived' : ''}" style="left:${left.toFixed(2)}%;width:${w.toFixed(2)}%"></i>
          ${you > 0 ? `<i class="kbar__you${offScale ? ' kbar__you--off' : ''}" style="left:${pos(-you)}%"></i>` : ''}
        </span>
        <span class="kbar__v">${b.v > 0 ? '+' : '−'}${fmt.n(Math.abs(b.v))}</span>
      </div>`;
    };
    const ticks = [-span, -span / 2, 0, span / 2, span];
    const axis = `<div class="kbar kbar--axis"><span></span><span class="kbar__track">
      ${ticks.map((t) => `<b style="left:${pos(t)}%">${t > 0 ? '+' : t < 0 ? '−' : ''}${fmt.n(Math.abs(t))}</b>`).join('')}
      ${you > 0 ? `<i class="kbar__you kbar__you--axis${offScale ? ' kbar__you--off' : ''}" style="left:${pos(-you)}%"></i>` : ''}
    </span><span class="kbar__v">kcal/day</span></div>`;
    const youNote = you > 0
      ? `<p class="small muted">The amber line marks your own starting deficit, ${fmt.n(you)} kcal a day. The largest effect here is 508 kcal a day, about ${Math.round(508 / you * 100)}% of it.${offScale ? ' Your deficit sits past the left edge of this axis.' : ''}</p>`
      : '<p class="small muted">Set a goal weight below your current one and your starting deficit is drawn on this axis for comparison.</p>';
    const legend = `<p class="kbar__legend"><b class="kbar__key kbar__key--adds"></b>adds to what you eat <b class="kbar__key kbar__key--cuts"></b>takes away from it <b class="kbar__key kbar__key--derived"></b>scaled up from a single-meal measurement</p>`;
    return surface({ title: 'Effects measured in kcal a day', aside: 'one axis, your deficit included' },
      `<div class="kbars">${LEVER_BARS.map(row).join('')}${axis}</div>${legend}${youNote}`);
  }

  function leverCards(r) {
    const you = startingDeficit(r);
    // Quotation marks follow the locale (PL uses low-open/high-close), and sit outside the
    // quoted sentence so the sentence itself stays an exact dictionary key.
    const qm = isPL() ? ['„', '”'] : ['“', '”'];
    // Whole sentences on both branches: apply()'s dictionary keys are phrases, so a bare
    // "above"/"below" spliced into the middle of one would never be translated.
    const dyn = (it) => (it.dyn === 'deficit' && you > 0)
      ? `<p class="lever__own">Your own starting deficit is ${fmt.n(you)}${you > 500 ? ' kcal a day, above that line.' : ' kcal a day, below that line.'}</p>`
      : '';
    // it.v is a hand-authored display string (e.g. "2.7", "1.7 kg") that never passes through
    // fmt.n(), so unlike engine-generated numbers it keeps an English decimal point even in PL
    // - swap it for a comma here rather than via the apply() dictionary (a bare "2.7" key would
    // risk matching unrelated numbers elsewhere).
    const localizeVal = (v) => isPL() ? String(v).replace(/(\d)\.(\d)/g, '$1,$2') : v;
    const card = (it) => `<article class="lever">
      <h4 class="lever__k">${it.k}</h4>
      <p class="lever__v">${localizeVal(it.v)}<small>${it.unit}</small></p>
      <p class="lever__design">${it.design}</p>
      <p class="lever__t">${it.t}</p>
      <blockquote class="lever__q">${qm[0]}${it.q}${qm[1]}<cite>${it.refs.map((id) => FH.refs.get(id).short.split(' (')[0]).join(', ')} ${c(it.refs)}</cite></blockquote>
      ${it.tail ? `<p class="lever__tail">${it.tail} ${c(it.tailRefs)}</p>` : ''}
      ${dyn(it)}
    </article>`;
    return `<div class="levers">${LEVER_GROUPS.map((g) => `<section class="lever-set">
      <h3 class="lever-set__title">${g.title}</h3>${g.items.map(card).join('')}
    </section>`).join('')}</div>`;
  }

  function leversReadNote() {
    return surface({ title: 'How to read these effects' },
      `<div class="callout levers__read">${I('info', 'callout__icon')}<div>
        <p>The figures come from studies of different designs, and several were small or short, so read them for direction and rough size.</p>
        <p>They do not replace the energy balance above. They show what can shift around the plan: the intake you actually reach, how much of the loss comes from fat, and how clearly progress appears.</p>
      </div></div>`);
  }

  function leversBlock(r) {
    return leversReadNote() + leverBars(r) + leverCards(r);
  }

  function targetsCard(r) {
    const n = r.nutrition;
    // Some targets collapse to a single number rather than a real range - always sort low/high
    // and drop the dash when they coincide, instead of printing "87–87 g" or "42–26 g".
    const gv = (lo, hi) => { const a = Math.min(lo, hi), b = Math.max(lo, hi); return a === b ? fmt.n(a) : fmt.n(a) + '–' + fmt.n(b); };
    // One decimal unless a value needs two (children's RDAs such as 0.95), and the same for both ends.
    const pd = n.protein.gPerKg.some((v) => Math.abs(v * 10 - Math.round(v * 10)) > 1e-9) ? 2 : 1;
    const proteinNote = `${fmt.n(n.protein.gPerKg[0], pd)}${n.protein.gPerKg[1] !== n.protein.gPerKg[0] ? '–' + fmt.n(n.protein.gPerKg[1], pd) : ''} g/kg ${esc(n.protein.basis)}${n.protein.note ? '. ' + esc(n.protein.note) : ''} ${c(n.protein.refs)}`;
    const cell = (label, value, unit, note) => `<div class="strip__cell"><span class="strip__label">${label}</span><span class="strip__value">${value}<small>${unit}</small></span><span class="strip__note">${note}</span></div>`;
    const cells = `<div class="strip strip--5">
      ${cell('Protein', gv(n.protein.grams[0], n.protein.grams[1]), 'g', proteinNote)}
      ${cell('Carbohydrate', gv(n.amdr.carbs.grams[0], n.amdr.carbs.grams[1]), 'g', `${n.amdr.carbs.pct.join('–')}% of energy ${c(['iom2005'])}`)}
      ${cell('Fat', gv(n.amdr.fat.grams[0], n.amdr.fat.grams[1]), 'g', `${n.amdr.fat.pct.join('–')}% of energy ${c(['iom2005'])}`)}
      ${cell('Fiber', fmt.n(n.fiber.ai), 'g', 'Adequate Intake for your age & sex; the 14 g/1,000 kcal rule of thumb gives ≈' + fmt.n(Math.max(n.fiber.perKcal, 0)) + ' g at your calorie level ' + c(['iom2005']))}
      ${cell('Water', fmt.n(n.water.litres, 1), 'L', 'From drinks and food ' + c(n.water.refs))}
    </div>`;
    // Acceptable ranges drawn on one 0-100% axis, so the three overlap visibly.
    const share = (label, cls, [a, b]) => `<div class="share__row"><span class="share__k">${label}</span><span class="share__track"><i class="share__bar share__bar--${cls}" style="left:${a}%;width:${b - a}%"></i></span><span class="share__v">${a}–${b}%</span></div>`;
    const shareBlock = `<div class="share"><h3 class="col-title">Share of energy ${c(['iom2005'])}</h3>
      ${share('Carbohydrate', 'carb', n.amdr.carbs.pct)}${share('Fat', 'fat', n.amdr.fat.pct)}${share('Protein', 'protein', n.amdr.protein.pct)}
      <div class="share__row share__row--axis"><span></span><span class="share__track">${[0, 25, 50, 75, 100].map((v) => `<b style="left:${v}%">${v}%</b>`).join('')}</span><span></span></div></div>`;
    const athlete = n.protein.athlete ? `<p class="small muted">Lean athletes in a deficit ${c(n.protein.athlete.refs)}: ${gv(n.protein.athlete.grams[0], n.protein.athlete.grams[1])} g.</p>` : '';
    const body = `${cells}${athlete}
      <div class="cols cols--targets"><div class="cols__col">${shareBlock}</div>
      <div class="cols__col"><div class="callout">${I('run', 'callout__icon')}<p>${esc(n.activity.text)} ${c(n.activity.refs)}</p></div>
      <p class="small muted">Share of ${fmt.kcal(n.kcal)} kcal ${c(['iom2005'])} – Acceptable Macronutrient Distribution Ranges. When the protein target above is higher than the range's lower end, fit carbohydrate and fat around it.</p></div></div>`;
    return surface({}, body);
  }

  /* ============================== Children ============================== */
  function outlookChild(r, ctx) {
    const cp = r.child.primary, p = r.input;
    const pl = isPL(), H = i18n.HERO_PL;
    if (!cp) {
      const maxAge = p.childReference === 'who' ? 19 : 20;
      const lead = pl ? H.childNeedsAge(maxAge) : `BMI-for-age needs an age of 2 to ${maxAge} years.`;
      return `<article class="outlook outlook--solo"><div class="outlook__now"><p class="outlook__lead">${lead}</p></div></article>`;
    }
    const who = cp.reference === 'who';
    const kid = pl ? H.kidGenitive[p.sex] : (p.sex === 'male' ? 'boy' : 'girl');
    const age = Math.floor(p.ageYears);
    const catLabel = esc(cp.category.label);
    let lead;
    if (pl) {
      lead = who ? H.childLeadWho(fmt.n(r.bmi, 1), cp.z >= 0 ? '+' : '−', fmt.n(Math.abs(cp.z), 2), age, kid, catLabel)
        : H.childLeadCdc(fmt.n(r.bmi, 1), fmt.ordinal(cp.percentile), age, kid, catLabel);
    } else {
      lead = who
        ? `BMI ${fmt.n(r.bmi, 1)} is <em>${cp.z >= 0 ? '+' : '−'}${fmt.n(Math.abs(cp.z), 2)} SD</em> from the median for a ${age}\u2011year\u2011old ${kid}, <em>${catLabel}</em>.`
        : `BMI ${fmt.n(r.bmi, 1)} is at the <em>${fmt.ordinal(cp.percentile)}th percentile</em> for a ${age}\u2011year\u2011old ${kid}, <em>${catLabel}</em>.`;
    }
    const o = r.child.other;
    let otherSentence = '';
    if (o) {
      const oCat = esc(o.category.label);
      otherSentence = o.reference === 'who'
        ? (pl ? H.childOtherWho(o.z >= 0 ? '+' : '−', fmt.n(Math.abs(o.z), 2), oCat) : `On the WHO reference: ${o.z >= 0 ? '+' : '−'}${fmt.n(Math.abs(o.z), 2)} SD (${oCat}).`)
        : (pl ? H.childOtherCdc(fmt.ordinal(o.percentile), oCat) : `On the CDC reference: ${fmt.ordinal(o.percentile)}th percentile (${oCat}).`);
    }
    const extendedSentence = cp.extended ? (pl ? H.childExtended(fmt.n(cp.pctOfP95)) : `Above the 95th percentile the CDC's 2022 extended method is used; BMI is ${fmt.n(cp.pctOfP95)}% of the 95th percentile.`) : '';
    const sub = `Children's BMI is judged against children of the same age and sex, because healthy BMI changes a lot while growing. ${otherSentence} ${extendedSentence} ${c(cp.refs)}`;
    const chart = charts.growthChart(p.sex, cp.reference, p.ageYears, r.bmi, cp, { width: ctx.outlookChartW });
    const big = who
      ? `${cp.z >= 0 ? '+' : '−'}${fmt.n(Math.abs(cp.z), 2)}<small>SD</small>`
      : `${fmt.ordinal(cp.percentile)}<small>th</small>`;
    return `<article class="outlook" aria-labelledby="outlook-h">
      <header class="outlook__head"><h2 class="outlook__title" id="outlook-h">${who ? 'Growth chart · WHO BMI-for-age' : 'Growth chart · CDC BMI-for-age'}</h2></header>
      <div class="outlook__grid">
        <div class="outlook__now">
          <p class="outlook__label">${who ? 'z-score' : 'Percentile'}</p>
          <p class="outlook__numeral">${big}</p>
          <p class="outlook__lead">${lead}</p>
          <p class="outlook__sub">${sub}</p>
        </div>
        <div class="outlook__chart">${chart.html}</div>
      </div>
    </article>`;
  }

  function conditionsChild(r) {
    const cp = r.child.primary, e = r.energy;
    const hw = r.pediatric && r.pediatric.healthyWeight;
    const w = r.input.weightKg;
    const cdc = cp && cp.reference !== 'who';
    const pctGauge = cp && cdc ? charts.meter({ min: 0, max: 100, value: cp.percentile, level: cp.category.level, band: [5, 85],
      ticks: [5, 85, 95].map((v) => ({ v, label: String(v) })) }) : '';
    let hwGauge = '';
    if (hw) {
      const lo = Math.min(hw[0], w), hi = Math.max(hw[1], w), sp = hi - lo || 1;
      hwGauge = charts.meter({ min: lo - sp * 0.3, max: hi + sp * 0.3, value: w, band: hw, level: cp ? cp.category.level : null });
    }
    return conditions('Where your child stands today', [
      cond({ label: 'BMI', value: fmt.n(r.bmi, 1), unit: 'kg/m²', level: cp ? cp.category.level : null, note: cp ? fmt.pill(cp.category.label, cp.category.level) : '' }),
      cond({ label: cp && cp.reference === 'who' ? 'z-score' : 'Percentile', value: cp ? (cp.reference === 'who' ? fmt.n(cp.z, 2) : fmt.ordinal(cp.percentile)) : '–', unit: cp && cp.reference !== 'who' ? 'th' : '', gauge: pctGauge, note: cp ? `z = ${fmt.n(cp.z, 2)}` : '' }),
      cond({ label: 'Energy for growth', value: roll('eer', Math.round(e.tdee.primary / 10) * 10, 0, fmt.kcal(e.tdee.primary)), unit: 'kcal/day', note: `Includes ${fmt.n(e.tdee.nasem.growth)} kcal for growth ${c(['nasem2023'])}` }),
      cond({ label: 'Healthy weight now', value: hw ? fmt.n(fmt.massVal(hw[0]), 0) + '–' + fmt.n(fmt.massVal(hw[1]), 0) : '–', unit: fmt.massUnit(), gauge: hwGauge, note: 'At current height and age' }),
    ]);
  }

  function guidanceCard(r) {
    const g = r.pediatric;
    if (!g || !g.goal) return '';
    const body = `<div class="verdict">${I('target', 'verdict__icon')}<p><b>Goal:</b> ${esc(g.goal)} ${c(g.goalRefs)}</p></div>
      ${g.treatment ? `<p>${esc(g.treatment)} ${c(['hampl2023'])}</p>` : ''}
      <p class="small muted">Goals are defined on the CDC percentile scale (${esc(g.goalBasis)}). Because children grow taller, holding weight steady lowers BMI. That is why maintenance, not dieting, is usually the aim. This tool does not produce calorie-deficit plans for children.</p>`;
    return surface({ title: 'What the guidelines recommend' }, body);
  }

  function childBodyCard(r) {
    const cen = r.central;
    let body = '';
    if (cen.whtr) {
      const segs = [
        { from: 0.3, to: 0.5, label: 'Healthy central adiposity', level: 0 },
        { from: 0.5, to: 0.8, label: 'Increased central adiposity', level: 2 },
      ];
      body += `<h3 class="col-title">Waist ÷ height ${c(cen.whtr.refs)}</h3>`;
      body += charts.scale(cen.whtr.value, segs, { min: 0.3, max: 0.8, format: (v) => fmt.n(v, 2) });
    }
    if (r.bodyFat.estimates.length) {
      const rows = r.bodyFat.estimates.map((e) => ({ label: e.name.replace(/ \(.*\)$/, ''), value: e.value, primary: false, note: e.note }));
      if (r.input.bodyFatPct > 0) rows.unshift({ label: 'Your measurement', value: r.input.bodyFatPct, primary: true });
      const range = r.fatClass ? r.fatClass.range : null;
      const dp = charts.dotplot(rows, { band: range ? [range.low, range.overweight] : null, bandLabel: 'healthy range for your age & sex', marker: r.input.bodyFatPct > 0 ? null : r.bodyFat.consensus, markerLabel: 'best estimate', primaryLabel: 'your measurement', format: (v) => fmt.n(v, 0) + '%', minPad: 3, aria: 'Body-fat percentage by method' });
      body += `<h3 class="col-title${cen.whtr ? ' col-title--gap' : ''}">Body fat</h3>${dp.html}`;
      body += `<p class="small muted">Methods: ${r.bodyFat.estimates.map((e) => esc(e.name.replace(/ \(.*\)$/, '')) + c(e.refs)).join(' · ')}</p>`;
    }
    body += '<p class="small muted">A waist under half the height is a simple screening message that works from about age 5; it is less discriminating during adolescence. Body-fat formulas for children are less precise than for adults.</p>';
    return surface({ title: 'Body shape' }, body);
  }

  /* ============================== Assemble ============================== */
  /** Glue each [n] footnote to the word before it, after translation (the dictionary keys end in
   *  a plain space), so a citation never wraps onto a line of its own. */
  const keepCites = (html) => html.replace(/ (<sup class="cite-ref">)/g, '\u00a0$1');
  function render(r, ctx = {}) {
    FH._binders = [];
    if (!r.ok) {
      const html = `<div class="empty-state">${I('edit', 'empty-state__icon')}<h2>Check these details</h2><p>Results appear as soon as the basics are valid.</p><ul>${r.errors.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>`;
      return { html: i18n.apply(html), nav: [] };
    }

    const sections = [];
    if (r.isChild) {
      sections.push(section('sec-overview', 'Overview', null, outlookChild(r, ctx), conditionsChild(r), noticesBlock(r)));
      const cbc = (r.central.whtr || r.bodyFat.estimates.length) ? childBodyCard(r) : '';
      sections.push(section('sec-guidance', 'Guidance', null, duo(guidanceCard(r), cbc)));
      sections.push(section('sec-nutrition', 'Nutrition', { title: 'Nutrition & activity' }, targetsCard(r)));
    } else if (r.input.pregnant) {
      // BMI classification, body-fat estimators, macro targets and the "excess fat?" verdict are
      // all derived from and validated on non-pregnant populations - showing them here would look
      // like a personalised read even though nothing behind them accounts for pregnancy. Only the
      // maintenance-energy estimate (already labelled "planning is switched off") and the warning
      // notice are shown; everything else waits until pregnancy/breastfeeding is unchecked.
      sections.push(section('sec-overview', 'Overview', null, outlookAdult(r, ctx), noticesBlock(r)));
    } else {
      sections.push(section('sec-overview', 'Overview', null, outlookAdult(r, ctx), conditionsAdult(r), noticesBlock(r)));
      const bal = balanceCard(r);
      sections.push(section('sec-plan', 'Plan', bal ? { title: 'Energy balance', lead: 'Where your starting deficit comes from, and why it shrinks as you get lighter.' } : null,
        bal, duo(lossCard(r), milestonesCard(r))));
      sections.push(section('sec-body', 'Body & risk', { title: 'Body composition & risk', lead: `BMI screens weight for height; central fat measures add the risk that BMI misses. ${r.bmiClass.lowerThresholds ? 'Lower BMI thresholds apply for your ethnic background.' : ''}` }, bodyRiskCard(r)));
      sections.push(section('sec-nutrition', 'Nutrition', { title: 'Nutrition & activity' }, targetsCard(r)));
      sections.push(section('sec-insights', 'Insights', { title: 'What to expect along the way', lead: 'What happens in the first week, while you lose, at your goal and afterwards.' }, insights(r)));
      sections.push(section('sec-levers', 'Levers', { title: 'What else moves the needle', lead: 'Outside the calorie arithmetic, and measured: sleep, water, how the food was made, when you eat it, and whether you are looking.' }, leversBlock(r)));
    }

    const nav = sections.map((s) => s.nav).filter(Boolean).map((n) => ({ id: n.id, label: i18n.t(n.label) }));
    const html = keepCites(i18n.apply(sections.map((s) => s.html).join('')));
    return { html, nav };
  }

  /** Everything about how the resting-metabolism model was picked and cross-checked, built on
   *  demand for the detail sheet. Runs its own i18n.apply() since it bypasses render(). */
  function renderBmrPanel(r) {
    const e = r.energy, b = e.bmr, t = e.tdee;
    const rows = b.rows.filter((x) => x.applicable).map((x) => ({
      label: x.short + (x.needsFfm && !e.ffmMeasured ? ' *' : ''),
      value: x.value, primary: x.id === b.primary.id, muted: x.needsFfm && !e.ffmMeasured, note: x.summary,
    }));
    const dp = charts.dotplot(rows, { marker: b.consensus, markerLabel: 'median of weight-based equations', primaryLabel: 'equation used', format: (v) => fmt.n(v), minPad: 60, aria: 'Resting metabolic rate by equation' });
    const table = `<h3 class="sheet__subtitle">All equations, with sources</h3>
      <div class="table-wrap"><table>
      <thead><tr><th>Equation</th><th class="num">kcal/day</th><th>When it fits</th></tr></thead><tbody>
      ${b.rows.map((x) => `<tr class="${x.id === b.primary.id ? 'is-primary' : ''}${x.applicable ? '' : ' is-na'}"><td>${esc(x.name)} ${c(x.refs)}</td><td class="num">${x.applicable ? fmt.n(x.value) : 'n/a'}</td><td>${esc(x.summary)}${x.needsFfm && !x.applicable ? ' Needs body-fat %.' : ''}</td></tr>`).join('')}
      </tbody></table></div>`;
    const pal = t.impliedPal;
    const reasonHint = b.reason + (b.notes.length ? ' ' + b.notes.join(' ') : '');
    const rmseHint = 'The ±1 RMSE spread is expected to bracket about two-thirds of people with your profile, based on the 2023 equations fitted to ~6,500 doubly labeled-water measurements – the gold-standard method for free-living expenditure.';
    const crosscheckHint = 'An independent estimate – resting metabolic rate times an activity multiplier (PAL) – as a sanity check against the equation above.';
    const palHint = 'Physical Activity Level: total expenditure ÷ resting metabolic rate. Free-living adults are rarely below about 1.4; the old “sedentary ×1.2” multiplier undersells almost everyone.';
    const cell = (label, value, unit, note, tip) => `<div class="strip__cell"><span class="strip__label">${label}${hint(label, tip)}</span><span class="strip__value">${value}${unit ? `<small>${unit}</small>` : ''}</span><span class="strip__note">${note}</span></div>`;
    const body = `
      <p class="muted small">Resting metabolic rate (BMR/RMR) is the energy your body uses at complete rest, about 60–70% of the day's total.</p>
      ${dp.html}
      ${rows.some((x) => x.muted) ? '<p class="small muted">* uses fat-free mass estimated from your measurements; enter a measured body-fat % to rely on it.</p>' : ''}
      <div class="verdict">${I('target', 'verdict__icon')}<p><b>Using ${esc(b.primary.name)}: ${fmt.kcal(b.primary.value)} kcal/day.</b> ${esc(reasonHint)} ${c(b.reasonRefs)}</p></div>
      ${table}
      <h3 class="sheet__subtitle">Total daily expenditure</h3>
      <div class="strip strip--3">
        ${cell('Typical error', '± ' + fmt.n(t.nasem.rmse), 'kcal', c(['nasem2023']), rmseHint)}
        ${cell('Cross-check', fmt.kcal(t.factorial.value), 'kcal/day', `BMR × PAL ${fmt.n(t.factorial.pal, 2)} ${c(['fao2004'])}`, crosscheckHint)}
        ${cell('Implied PAL', fmt.n(pal, 2), '', 'Physical Activity Level', palHint)}
      </div>`;
    return keepCites(i18n.apply(body));
  }

  /** The deficit-scenario comparison table, built on demand for the detail sheet. */
  function renderDeficitPanel(r) {
    const p = r.plan;
    if (!p) return '';
    const closest = p.scenarios.reduce((best, s) => Math.abs(s.deficit - p.deficit) < Math.abs(best.deficit - p.deficit) ? s : best, p.scenarios[0]);
    // Only label a row "your plan" when it's actually close to the plan's real deficit - these
    // five presets are 250 kcal apart, so the "closest" one can still be a poor match (e.g. a
    // fixed-intake plan, or one shaped by extra activity) and shouldn't be presented as it.
    const isYours = closest && Math.abs(closest.deficit - p.deficit) <= 75;
    const maxGoalDays = Math.max(1, ...p.scenarios.filter((s) => s.goalDay).map((s) => s.goalDay));
    const goalCell = (s) => s.goalDay
      ? `<span class="mini-bar"><span class="mini-bar__track"><span class="mini-bar__fill" style="width:${Math.round((maxGoalDays - s.goalDay) / maxGoalDays * 100)}%"></span></span><b>${fmt.weeks(s.goalDay)}</b></span>`
      : `<span class="mini-bar mini-bar--empty"><span class="mini-bar__track"></span><b>—</b></span>`;
    const body = `<p class="small muted">Same model, constant intake from today. Guideline diets use a 500–750 kcal/day deficit. ${c(['jensen2014'])}</p>
      <div class="table-wrap"><table><thead><tr><th class="num">Deficit</th><th class="num">Intake</th><th class="num">12 wk</th><th class="num">26 wk</th><th class="num">1 year</th><th class="num">Time to goal</th></tr></thead><tbody>
      ${p.scenarios.map((s) => `<tr class="${s === closest && isYours ? 'is-primary' : ''}"><td class="num">${s.deficit ? '−' + s.deficit : '0'}${s === closest && isYours ? ' <span class="small muted">· your plan</span>' : ''}</td><td class="num">${fmt.kcal(s.intake)}</td><td class="num">${fmt.n(fmt.massVal(s.w12), 1)}</td><td class="num">${fmt.n(fmt.massVal(s.w26), 1)}</td><td class="num">${fmt.n(fmt.massVal(s.w52), 1)}</td><td class="num">${goalCell(s)}</td></tr>`).join('')}
      </tbody></table></div><p class="small muted">Weights in ${fmt.massUnit()}. “—” means the goal is not reached within a year.</p>`;
    return i18n.apply(body);
  }

  FH.board = { render, renderBmrPanel, renderDeficitPanel };
})(typeof self !== 'undefined' ? self : this);
