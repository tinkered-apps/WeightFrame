/* Hand-built SVG/HTML charts. Each builder returns { html, bind(rootEl) } (or plain HTML for the
 * small gauges) so tooltips can attach after the markup is inserted. Every colour comes from a
 * CSS class, never an inline hex, so light/dark themes and the dark Outlook panel restyle them
 * without touching this file. */
(function (root) {
  const FH = root.FH = root.FH || {};
  const fmt = FH.fmt;
  // charts are built once per render, well after i18n.js has loaded; read FH.i18n lazily.
  const trHtml = (s) => (FH.i18n ? FH.i18n.apply(s) : s);
  const icon = (n) => (FH.icon ? FH.icon(n) : '');

  function niceTicks(min, max, count) {
    const span = max - min || 1;
    const raw = span / Math.max(1, count);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || 10 * mag;
    const out = [];
    for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  /** Enough decimals that neighbouring tick labels never print the same number (a 0.5-kg step
   *  rounded to whole kg used to label a flat maintenance chart "61, 61, 60, 60, 59"). */
  function tickDecimals(ticks) {
    if (ticks.length < 2) return 0;
    const step = Math.abs(ticks[1] - ticks[0]);
    return step >= 1 ? 0 : step >= 0.1 ? 1 : 2;
  }
  // Draw SVGs at the container's real width so 11px labels stay 11px on every screen.
  const chartWidth = (w) => Math.round(Math.max(300, Math.min(1100, w || FH.chartWidth || 760)));
  const lin = (d0, d1, r0, r1) => (v) => r0 + (v - d0) / (d1 - d0) * (r1 - r0);
  const pathFrom = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
  // Rough text width for 11-12px Hanken Grotesk, used only to keep annotation labels inside the plot.
  const textW = (s, px = 11.5) => String(s).length * px * 0.54;

  /* ---------- Tooltip plumbing ---------- */
  const tip = () => document.getElementById('tooltip');
  function showTip(html, x, y) {
    const t = tip(); t.innerHTML = html; t.hidden = false;
    const r = t.getBoundingClientRect();
    let left = x + 14, top = y + 14;
    if (left + r.width > window.innerWidth - 8) left = Math.max(8, x - r.width - 14);
    if (top + r.height > window.innerHeight - 8) top = Math.max(8, y - r.height - 14);
    t.style.left = left + 'px'; t.style.top = top + 'px';
  }
  function hideTip() { tip().hidden = true; }

  /* ---------- Outlook: weight trajectory (drawn for the dark Outlook panel) ---------- */
  function trajectory(plan, ctx) {
    const s = plan.series;
    const W = chartWidth(ctx.width), narrow = W < 560;
    const H = narrow ? 250 : 292;
    // m.t leaves an annotation lane above the plot: notes live there and reach the curve on
    // leader lines, so no label ever sits on top of a gridline or another label.
    const m = { l: 42, r: narrow ? 62 : 82, t: 46, b: 30 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const days = s.day[s.day.length - 1];
    const toU = fmt.massVal;
    const ruleDays = plan.rule3500 ? Math.min(plan.rule3500.daysToGoal, days) : 0;
    const ruleW = (d) => s.weight[0] - (s.weight[0] - plan.goalKg) * d / plan.rule3500.daysToGoal;
    const rulePts = plan.rule3500 && plan.lossKg > 0 ? [[0, s.weight[0]], [ruleDays, ruleW(ruleDays)]] : null;

    const unc = plan.uncertainty;
    let lo = Math.min(...s.weight, plan.goalKg, ...(unc ? unc.burnMore : [])), hi = Math.max(...s.weight, plan.goalKg, ...(unc ? unc.burnLess : []));
    if (ctx.healthy && ctx.healthy.maxKg > lo - 6 && ctx.healthy.maxKg < hi) lo = Math.min(lo, ctx.healthy.maxKg - 1);
    const pad = Math.max(1, (hi - lo) * 0.12);
    const yMin = toU(lo - pad), yMax = toU(hi + pad);
    const x = lin(0, days, m.l, m.l + iw), y = lin(yMin, yMax, m.t + ih, m.t);

    const yt = niceTicks(yMin, yMax, narrow ? 4 : 5);
    const yd = tickDecimals(yt);
    const monthTicks = [];
    const start = new Date(); start.setHours(12, 0, 0, 0);
    for (let k = 1; k < 60; k++) {
      const d = new Date(start.getFullYear(), start.getMonth() + k, 1, 12);
      const dd = (d - start) / 864e5;
      if (dd > days) break;
      monthTicks.push(dd);
    }
    const every = Math.ceil(monthTicks.length / (narrow ? 4 : 7));
    const xt = monthTicks.filter((_, i) => i % every === 0);

    let g = `<defs><linearGradient id="trAreaGrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" class="tr-area-stop1"/><stop offset="1" class="tr-area-stop2"/></linearGradient></defs>`;
    g += '<g class="tr-axis">';
    for (const v of yt) g += `<line class="tr-grid" x1="${m.l}" x2="${m.l + iw}" y1="${y(v)}" y2="${y(v)}"/><text class="tr-tick" x="${m.l - 9}" y="${y(v) + 4}" text-anchor="end">${fmt.n(v, yd)}</text>`;
    for (const d of xt) g += `<line class="tr-grid tr-grid--v" x1="${x(d)}" x2="${x(d)}" y1="${m.t}" y2="${m.t + ih}"/><text class="tr-tick" x="${x(d)}" y="${m.t + ih + 20}" text-anchor="middle">${fmt.shortDate(d)}</text>`;
    g += `<line class="tr-base" x1="${m.l}" x2="${m.l + iw}" y1="${m.t + ih}" y2="${m.t + ih}"/></g>`;

    // BMI classification bands: the healthy range, plus - once you're above it - each level up
    // to your own, like a weather map. Computed here (the geometry depends on yMin/yMax, already
    // settled above) but drawn later, on top of the uncertainty fill - otherwise that fill's own
    // blue tint sits over the band and dilutes/muddies its colour, making a band unrecognisable
    // as itself wherever the two happen to overlap.
    let bandDrawn = false;
    const bandDefs = [];
    if (ctx.healthy) bandDefs.push({ level: 0, loKg: ctx.healthy.minKg, hiKg: ctx.healthy.maxKg, label: 'healthy BMI range' });
    if (ctx.bmiBands) bandDefs.push(...ctx.bmiBands);
    const bandsToPaint = [];
    for (const bd of bandDefs) {
      const hiU = bd.hiKg != null ? toU(bd.hiKg) : yMax;
      const top = Math.min(yMax, hiU), bot = Math.max(yMin, toU(bd.loKg));
      if (!(top > yMin && bot < yMax && top > bot)) continue;
      if (bd.level === 0) bandDrawn = true;
      bandsToPaint.push({ level: bd.level, label: bd.label, ty: y(top), by: y(bot) });
    }
    // goal line
    const goalY = y(toU(plan.goalKg));
    g += `<line class="tr-aim" x1="${m.l}" x2="${m.l + iw}" y1="${goalY}" y2="${goalY}"/>`;

    // area + model line. The likely-range band (below) already shades under the curve, so the
    // plain area fill is only drawn when there's no band - otherwise its gradient keeps going
    // past the band's lower edge, all the way to the axis, leaving a pale strip under the band.
    const mpts = s.day.map((d, i) => [x(d), y(toU(s.weight[i]))]);
    const anim = ctx.animate ? ' is-drawing' : '';
    if (!unc) g += `<path class="tr-area${anim}" d="${pathFrom(mpts)}L${(m.l + iw).toFixed(1)} ${m.t + ih}L${m.l} ${m.t + ih}Z"/>`;
    if (unc) {
      const up = unc.burnLess.map((w, i) => [x(s.day[i]), y(toU(w))]);
      const dn = unc.burnMore.map((w, i) => [x(s.day[i]), y(toU(w))]).reverse();
      g += `<path class="tr-unc${anim}" d="${pathFrom(up.concat(dn))}Z"/>`;
    }
    for (const bp of bandsToPaint) {
      g += `<rect class="tr-band" data-level="${bp.level}" x="${m.l}" width="${iw}" y="${bp.ty.toFixed(1)}" height="${(bp.by - bp.ty).toFixed(1)}"/>`;
      if (bp.by - bp.ty > 16) g += `<text class="tr-band-label" data-level="${bp.level}" x="${m.l + iw - 8}" y="${(bp.ty + 14).toFixed(1)}" text-anchor="end">${fmt.esc(bp.label)}</text>`;
    }

    // Annotation lane: where the plan switches to maintenance, and the harmless water rebound.
    // A note sits beside the line it describes (right first, then left) or, when neither side
    // has room, moves below the chart - it never overlaps the axis, a gridline label or another note.
    const laneRight = m.l + iw;
    const offChart = [];
    const endW = s.weight[s.weight.length - 1];
    const refillTxt = plan.days && plan.lossKg > 0 && endW - plan.goalKg > 0.3
      ? `+${fmt.n(toU(endW - plan.goalKg), 1)} ${fmt.massUnit()} water &amp; glycogen refill → ${fmt.n(toU(endW), 1)} ${fmt.massUnit()}` : '';
    if (plan.days && plan.lossKg !== 0 && plan.mode !== 'maintain') {
      const gx = x(s.dietDays);
      g += `<line class="tr-switch" x1="${gx}" x2="${gx}" y1="8" y2="${m.t + ih}"/>`;
      const sw = textW('switch to maintenance');
      if (gx + 8 + sw <= laneRight) g += `<text class="tr-note" x="${gx + 8}" y="16">switch to maintenance</text>`;
      else if (gx - 8 - sw >= m.l) g += `<text class="tr-note" x="${gx - 8}" y="16" text-anchor="end">switch to maintenance</text>`;
      else offChart.push(`<b>${fmt.date(s.dietDays)}</b>: switch to maintenance`);
      if (refillTxt) {
        const rw = textW(refillTxt.replace(/&amp;/g, '&'));
        if (!narrow && gx + 8 + rw <= laneRight) {
          // The note hangs on a leader that drops to where the rebound shows on the curve.
          const di = Math.min(s.weight.length - 1, s.dietDays + Math.round((days - s.dietDays) * 0.3));
          const lx = Math.max(gx + 14, Math.min(x(di), gx + 8 + rw - 6)), ly = y(toU(s.weight[Math.min(s.weight.length - 1, Math.round((lx - m.l) / iw * days))]));
          g += `<text class="tr-note tr-note--soft" x="${gx + 8}" y="33">${refillTxt}</text>`;
          g += `<line class="tr-leader" x1="${lx}" x2="${lx}" y1="39" y2="${ly - 5}"/><circle class="tr-leader-dot" cx="${lx}" cy="${ly}" r="2.5"/>`;
        // A late switch point (slow-pace plans) can leave no room on the right for this longer
        // line even when "switch to maintenance" fit; stack it on the left instead of dropping
        // it off-chart, same as the switch label's own fallback. No leader here - the rebound
        // point it would point to sits to the right, past the text, so a straight drop line
        // wouldn't read as connected to it anyway.
        } else if (!narrow && gx - 8 - rw >= m.l) {
          g += `<text class="tr-note tr-note--soft" x="${gx - 8}" y="33" text-anchor="end">${refillTxt}</text>`;
        } else offChart.push(refillTxt);
      }
    }
    // 3,500 rule
    if (rulePts) {
      const pts = rulePts.map(([d, w]) => [x(d), y(toU(w))]);
      g += `<path class="tr-rule" d="${pathFrom(pts)}"/>`;
      g += `<circle class="tr-rule-dot" cx="${pts[1][0]}" cy="${pts[1][1]}" r="3.5"/>`;
    }
    g += `<path class="tr-line${anim}" pathLength="1" d="${pathFrom(mpts)}"/>`;
    // Milestones: diamonds at whichever points the plan actually reaches (assess.js decides which).
    const milestones = plan.milestones || [];
    for (const ms of milestones) {
      const mx = x(ms.day), my = y(toU(s.weight[ms.day]));
      g += `<rect class="tr-ms" x="${mx - 5}" y="${my - 5}" width="10" height="10" rx="1.5" transform="rotate(45 ${mx} ${my})"/>`;
    }
    // goal reached + you
    if (plan.days && plan.mode !== 'maintain') g += `<circle class="tr-dot" cx="${x(s.dietDays)}" cy="${y(toU(s.weight[s.dietDays]))}" r="4.5"/>`;
    g += `<circle class="tr-you-halo" cx="${mpts[0][0]}" cy="${mpts[0][1]}" r="11"/><circle class="tr-you" cx="${mpts[0][0]}" cy="${mpts[0][1]}" r="5.5"/>`;
    // Right margin: the goal line is labelled "goal / 78.0 kg". The curve end gets its own value
    // only when the goal is never reached (a plateau), where it means something different.
    const endY = mpts[mpts.length - 1][1];
    const gxR = m.l + iw + 10;
    let gy = goalY;
    if (!plan.days) {
      const close = Math.abs(goalY - endY) < 30;
      g += `<text class="tr-end" x="${gxR}" y="${endY + 4}">${fmt.n(toU(endW), 1)} ${fmt.massUnit()}</text>`;
      if (close) gy = goalY >= endY ? endY + 30 : endY - 30;
    }
    g += `<text class="tr-end tr-end--soft" x="${gxR}" y="${gy - 3}">goal</text><text class="tr-end" x="${gxR}" y="${gy + 12}">${fmt.n(toU(plan.goalKg), 1)} ${fmt.massUnit()}</text>`;
    // crosshair
    g += `<line class="tr-xh" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}" visibility="hidden"/>`;
    g += `<circle class="tr-xh-dot" r="5" visibility="hidden"/>`;
    g += `<rect class="hit" x="${m.l}" y="${m.t}" width="${iw}" height="${ih}"/>`;

    const hasWhy = plan.lossKg > 0.25 && plan.days && plan.expenditure;
    const ruleLabelText = fmt.units === 'metric' ? '7,700 kcal = 1 kg' : '3,500 kcal = 1 lb';
    // The rule's own "would promise X weeks" explanation hangs off its legend entry as a hint
    // instead of a paragraph under the chart, so it doesn't compete with the chart for space.
    const ruleHint = ctx.ruleTip ? `<button type="button" class="hint" data-tip="${fmt.esc(ctx.ruleTip)}" aria-label="“${ruleLabelText}” rule – more info">${icon('help')}</button>${fmt.cite(['hall2011'])}` : '';
    const legend = `<div class="legend legend--dark">
      <span><i class="lg lg--line"></i>Dynamic model (NIH / Hall 2011)</span>
      ${unc ? `<span><i class="lg lg--unc"></i>Likely range<button type="button" class="hint" data-tip="The same plan if your true maintenance sits anywhere in its likely range: ±1 prediction error of the National Academies 2023 equation, which covers about 2 in 3 people." aria-label="Likely range – more info">${icon('help')}</button></span>` : ''}
      ${rulePts ? `<span><i class="lg lg--rule"></i>“${ruleLabelText}” rule${ruleHint}</span>` : ''}
      ${bandDrawn ? '<span><i class="lg lg--band"></i>Healthy BMI range</span>' : ''}
      ${milestones.length ? '<span><i class="lg lg--ms"></i>Milestone</span>' : ''}
      <span><i class="lg lg--you"></i>You today</span>
    </div>`;
    const chip = hasWhy ? `<button type="button" class="why-chip">${icon('info')}<span>Why the curve bends</span></button>` : '';
    const desc = `Projected weight from ${fmt.mass(s.weight[0])} to ${fmt.mass(plan.goalKg)}.`;
    const notes = offChart.length ? `<p class="chart-notes">${offChart.join(' · ')}</p>` : '';
    const html = `<div class="chart chart--dark"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${fmt.esc(desc)}">${g}</svg></div>` + notes + legend;

    function bind(el) {
      const svg = el.querySelector('.chart--dark svg'); if (!svg) return;
      const hit = svg.querySelector('.hit'), xh = svg.querySelector('.tr-xh'), dot = svg.querySelector('.tr-xh-dot');
      const move = (ev) => {
        const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY;
        const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        const d = Math.max(0, Math.min(days, Math.round((p.x - m.l) / iw * days)));
        const px = x(d), py = y(toU(s.weight[d]));
        xh.setAttribute('x1', px); xh.setAttribute('x2', px); xh.setAttribute('visibility', 'visible');
        dot.setAttribute('cx', px); dot.setAttribute('cy', py); dot.setAttribute('visibility', 'visible');
        const ms = milestones.find((q) => Math.abs(q.day - d) <= 1);
        let h;
        if (ms) {
          h = `<b>${fmt.date(ms.day)}</b> · week ${fmt.n(ms.day / 7, 0)}<br>`;
          h += `<span class="tt-key tt-key--ms"></span><b>${fmt.esc(ms.label)}</b> · ${fmt.mass(s.weight[ms.day])}`;
          if (ms.text) h += `<br>${fmt.esc(ms.text)}`;
          if (ms.refs && ms.refs.length) h += ` ${fmt.cite(ms.refs)}`;
        } else {
          const dFat = s.fat[d] - s.fat[0], dLean = s.lean[d] - s.lean[0], dWater = (s.glyWater[d] - s.glyWater[0]) + s.ecf[d];
          h = `<b>${fmt.date(d)}</b> · week ${fmt.n(d / 7, 0)}<br>`;
          h += `<span class="tt-key tt-key--line"></span>Model: <b>${fmt.mass(s.weight[d])}</b><br>`;
          if (unc) h += `<span class="tt-key tt-key--unc"></span>Likely range ${fmt.n(toU(unc.burnMore[d]), 1)}–${fmt.mass(unc.burnLess[d])}<br>`;
          if (rulePts && d <= ruleDays) h += `<span class="tt-key tt-key--rule"></span>${fmt.units === 'metric' ? '7,700 kcal/kg rule: ' : '3,500 kcal/lb rule: '}${fmt.mass(ruleW(d))}<br>`;
          h += `Fat ${fmt.massDelta(dFat)} · lean ${fmt.massDelta(dLean)} · water ${fmt.massDelta(dWater)}<br>`;
          h += `Intake ${fmt.kcal(s.intake[d])} · burning ${fmt.kcal(s.ee[d])} kcal/day`;
        }
        showTip(trHtml(h), ev.clientX, ev.clientY);
      };
      hit.addEventListener('pointermove', move);
      hit.addEventListener('pointerleave', () => { xh.setAttribute('visibility', 'hidden'); dot.setAttribute('visibility', 'hidden'); hideTip(); });

      const chip = el.querySelector('.why-chip');
      if (chip && hasWhy) {
        const ex = plan.expenditure;
        let open = false;
        const showWhy = () => {
          let h = '<b>Why the curve bends</b><br>';
          h += `Burning today: ${fmt.kcal(ex.start)} kcal/day<br>`;
          h += `Burning at goal: ${fmt.kcal(ex.atGoal)} kcal/day<br>`;
          h += `… smaller body: −${fmt.kcal(ex.bodySize)}<br>`;
          h += `… adaptive thermogenesis: −${fmt.kcal(ex.adaptive)}<br>`;
          h += `… less food to digest: −${fmt.kcal(ex.tef)}<br>`;
          h += `So the gap between intake and expenditure narrows every week and loss slows, unless intake keeps dropping or activity rises. ${fmt.cite(['hall2011'])}`;
          const br = chip.getBoundingClientRect();
          showTip(trHtml(h), br.left, br.bottom - 6);
          open = true;
        };
        const hideWhy = () => { hideTip(); open = false; };
        chip.addEventListener('mouseenter', showWhy);
        chip.addEventListener('mouseleave', hideWhy);
        chip.addEventListener('focus', showWhy);
        chip.addEventListener('blur', hideWhy);
        chip.addEventListener('click', (e) => { e.stopPropagation(); open ? hideWhy() : showWhy(); });
      }
    }
    return { html, chip, bind };
  }

  /* ---------- Dot plot (Cleveland), built in HTML so text stays legible at any width ---------- */
  function dotplot(rows, o) {
    // rows: [{label, value, primary, muted, note}], o: {band:[lo,hi], bandLabel, marker, markerLabel, format, minPad, aria}
    const vals = rows.map((r) => r.value).concat(o.band || [], o.marker != null ? [o.marker] : []);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const pad = Math.max((hi - lo) * 0.1, o.minPad || 1);
    lo -= pad; hi += pad;
    const pos = (v) => ((v - lo) / (hi - lo) * 100).toFixed(2) + '%';
    const f = o.format || ((v) => fmt.n(v));
    const ticks = niceTicks(lo, hi, 4);
    let under = ticks.map((t) => `<i class="dots__grid" style="left:${pos(t)}"></i>`).join('');
    if (o.band) {
      const b0 = Math.max(lo, o.band[0]), b1 = Math.min(hi, o.band[1]);
      if (b1 > b0) under = `<i class="dots__band" style="left:${pos(b0)};width:${((b1 - b0) / (hi - lo) * 100).toFixed(2)}%"></i>` + under;
    }
    if (o.marker != null) under += `<i class="dots__marker" style="left:${pos(o.marker)}"></i>`;
    let h = `<div class="dots" role="img" aria-label="${fmt.esc(o.aria || '')}">`;
    const keys = [];
    if (o.band) keys.push(`<span><i class="lg lg--band-light"></i>${fmt.esc(o.bandLabel || '')}</span>`);
    if (o.marker != null && o.markerLabel) keys.push(`<span><i class="lg lg--marker"></i>${fmt.esc(o.markerLabel)}</span>`);
    keys.push('<span><i class="lg lg--you"></i>' + fmt.esc(o.primaryLabel || 'used') + '</span>');
    for (const r of rows) {
      const cls = r.primary ? ' is-primary' : r.muted ? ' is-muted' : '';
      h += `<div class="dots__row${cls}" title="${fmt.esc(r.label + ': ' + f(r.value) + (r.note ? ' – ' + r.note : ''))}"><span class="dots__label">${fmt.esc(r.label)}</span><span class="dots__track">${under}<i class="dots__stem" style="width:${pos(r.value)}"></i><i class="dots__dot" style="left:${pos(r.value)}"></i></span><span class="dots__val">${f(r.value)}</span></div>`;
    }
    h += `<div class="dots__row dots__row--axis"><span></span><span class="dots__track">${ticks.map((t) => `<b style="left:${pos(t)}">${f(t)}</b>`).join('')}</span><span></span></div></div>`;
    const hasPrimary = rows.some((r) => r.primary);
    return { html: h + `<div class="legend">${hasPrimary ? keys.join('') : keys.slice(0, -1).join('')}</div>`, bind() {} };
  }

  /* ---------- Classification scale (BMI, waist-to-height): coloured bands + a value pin ---------- */
  function scale(value, segs, o) {
    // segs: [{from,to,label,level}] in value units; o: {min,max,format}
    const span = o.max - o.min;
    const pos = (v) => Math.max(0, Math.min(100, (v - o.min) / span * 100));
    const on = segs.findIndex((s) => value >= s.from && value < s.to);
    const f = o.format || ((v) => v);
    let h = `<div class="scale${o.compact ? ' scale--compact' : ''}"><div class="scale__track">`;
    segs.forEach((s, i) => {
      const w = pos(s.to) - pos(s.from);
      h += `<span class="scale__seg${i === on ? ' is-on' : ''}" data-level="${s.level != null ? s.level : ''}" style="flex:${w} 0 0" title="${fmt.esc(s.label)}"></span>`;
    });
    h += '</div>';
    for (const s of segs.slice(1)) h += `<span class="scale__tick" style="left:${pos(s.from)}%">${f(s.from)}</span>`;
    const lvl = on >= 0 && segs[on].level != null ? segs[on].level : '';
    h += `<span class="scale__pin" data-level="${lvl}" style="left:${pos(value)}%">${o.compact ? '' : `<b>${f(value)}</b>`}<i></i></span></div>`;
    return h;
  }

  /* ---------- Meter: one small instrument for a condition tile ----------
   * o: { min, max, value, band:[lo,hi], fill:true (fill from min to value), level, ticks:[{v,label}] } */
  function meter(o) {
    const span = o.max - o.min;
    const pos = (v) => Math.max(0, Math.min(100, (v - o.min) / span * 100)).toFixed(2);
    let h = `<div class="meter" aria-hidden="true"><div class="meter__track">`;
    if (o.band) h += `<i class="meter__band" style="left:${pos(o.band[0])}%;width:${(pos(o.band[1]) - pos(o.band[0])).toFixed(2)}%"></i>`;
    if (o.fill) h += `<i class="meter__fill" style="width:${pos(o.value)}%"></i>`;
    h += `</div>`;
    if (o.value != null && !o.fill) h += `<i class="meter__pin" data-level="${o.level != null ? o.level : ''}" style="left:${pos(o.value)}%"></i>`;
    if (o.ticks) h += o.ticks.map((t) => `<span class="meter__tick" style="left:${pos(t.v)}%">${t.label}</span>`).join('');
    return h + '</div>';
  }

  /* ---------- Children's growth chart (drawn for the dark Outlook panel) ---------- */
  function growthChart(sex, reference, ageYears, bmi, childRes, ctx = {}) {
    const G = FH.growth;
    const W = chartWidth(ctx.width), narrow = W < 560;
    const H = narrow ? 290 : 320, m = { l: 40, r: 62, t: 16, b: 46 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const maxM = reference === 'who' ? 228 : 240;
    const pcts = reference === 'who'
      ? [{ p: 2.275, label: '−2 SD' }, { p: 50, label: 'median' }, { p: 84.13, label: '+1 SD' }, { p: 97.725, label: '+2 SD' }]
      : [{ p: 5, label: '5th' }, { p: 50, label: '50th' }, { p: 85, label: '85th' }, { p: 95, label: '95th' }];
    const curves = G.curves(sex, reference, pcts.map((q) => q.p), 24, maxM, 3);
    let sev = null;
    if (reference === 'cdc' && childRes && childRes.percentile >= 95) {
      sev = [];
      for (let mo = 24; mo <= 240; mo += 3) sev.push([mo / 12, 1.2 * G.bmiAtPercentile(sex, mo, 95, 'cdc')]);
    }
    const allY = Object.values(curves).flat().map((p) => p[1]).concat([bmi]).concat(sev ? sev.map((p) => p[1]) : []);
    const yMin = Math.floor(Math.min(...allY) - 1), yMax = Math.ceil(Math.max(...allY) + 1);
    const x = lin(2, maxM / 12, m.l, m.l + iw), y = lin(yMin, yMax, m.t + ih, m.t);
    let g = '<g class="tr-axis">';
    for (const v of niceTicks(yMin, yMax, 6)) g += `<line class="tr-grid" x1="${m.l}" x2="${m.l + iw}" y1="${y(v)}" y2="${y(v)}"/><text class="tr-tick" x="${m.l - 9}" y="${y(v) + 4}" text-anchor="end">${v}</text>`;
    for (let a = 2; a <= maxM / 12; a += (narrow ? 4 : 2)) g += `<line class="tr-base" x1="${x(a)}" x2="${x(a)}" y1="${m.t + ih}" y2="${m.t + ih + 5}"/><text class="tr-tick" x="${x(a)}" y="${m.t + ih + 19}" text-anchor="middle">${a}</text>`;
    g += `<line class="tr-base" x1="${m.l}" x2="${m.l + iw}" y1="${m.t + ih}" y2="${m.t + ih}"/>`;
    g += `<text class="tr-tick tr-tick--title" x="${m.l}" y="${m.t + ih + 40}" text-anchor="start">age, years</text></g>`;
    // healthy band between lowest and third curve
    const lowC = curves[pcts[0].p], upC = curves[pcts[2].p];
    const band = lowC.map((p) => [x(p[0]), y(p[1])]).concat(upC.slice().reverse().map((p) => [x(p[0]), y(p[1])]));
    g += `<path class="tr-band" d="${pathFrom(band)}Z"/>`;
    pcts.forEach((q, i) => {
      const pts = curves[q.p].map((p) => [x(p[0]), y(p[1])]);
      g += `<path class="gc-curve${i === 1 ? ' gc-curve--mid' : ''}" d="${pathFrom(pts)}"/>`;
      const last = pts[pts.length - 1];
      g += `<text class="tr-note tr-note--soft" x="${last[0] + 7}" y="${last[1] + 4}">${q.label}</text>`;
    });
    if (sev) {
      const pts = sev.map((p) => [x(p[0]), y(p[1])]);
      g += `<path class="gc-sev" d="${pathFrom(pts)}"/>`;
      g += `<text class="tr-note gc-sev-label" x="${pts[pts.length - 1][0] + 7}" y="${pts[pts.length - 1][1] + 4}">120% P95</text>`;
    }
    const cx = x(ageYears), cy = y(bmi);
    g += `<circle class="tr-you-halo" cx="${cx}" cy="${cy}" r="13"/><circle class="tr-you" cx="${cx}" cy="${cy}" r="6.5"><title>BMI ${fmt.n(bmi, 1)} at ${fmt.n(ageYears, 1)} years</title></circle>`;
    const legend = `<div class="legend legend--dark">
      <span><i class="lg lg--curve"></i>${reference === 'who' ? 'WHO z-score curves' : 'CDC percentile curves'}</span>
      <span><i class="lg lg--band"></i>Healthy range</span>
      ${sev ? '<span><i class="lg lg--sev"></i>Severe obesity threshold (120% of 95th)</span>' : ''}
      <span><i class="lg lg--you"></i>Your child</span></div>`;
    return { html: `<div class="chart chart--dark"><svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="BMI-for-age chart with the child's BMI plotted">${g}</svg></div>` + legend, bind() {} };
  }

  FH.charts = { trajectory, dotplot, scale, meter, growthChart, niceTicks, showTip, hideTip };
})(typeof self !== 'undefined' ? self : this);
