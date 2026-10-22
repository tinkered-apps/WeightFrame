/* Two renderers, each its own tab: "Methods" (how each number is calculated, which formula
 * wins when) and "Sources" (the numbered bibliography every [n] footnote links to). */
(function (root) {
  const FH = root.FH = root.FH || {};
  const { fmt } = FH;
  const c = (ids) => fmt.cite(ids);

  /* ---- Formula building blocks --------------------------------------------------------
   * A `.formula` block never nests another <div> inside it (dl/p only) - i18n.js's apply()
   * shields formula blocks from its translation pass with a non-greedy regex that stops at
   * the FIRST </div>, so a nested div would truncate the shield early. Classification tables
   * therefore render as siblings *after* a .formula block, never inside one. Symbols and
   * expressions are intentionally left untranslated in both locales, same as equation names
   * and citations elsewhere - they're notation, not prose. */
  // Every men/women pair gets its own row (never crammed onto one line with a "·" that reads
  // as ambiguous with the "·" used elsewhere as a plain separator - multiplication is always
  // "×" in these formulas, on purpose, so "·" never has to do double duty) and the word itself
  // is colour-coded so a column of rows scans as two groups, not one wall of identical text.
  const men = (s) => `<b class="formula__sex formula__sex--m">${s}</b>`;
  const women = (s) => `<b class="formula__sex formula__sex--f">${s}</b>`;
  const legend = (pairs) => `<dl class="formula__legend">${pairs.map(([sym, desc]) => `<dt>${sym}</dt><dd>${desc}</dd>`).join('')}</dl>`;
  const eqs = (rows) => `<dl class="formula__eqs">${rows.map(([label, expr]) => `<dt>${label || ''}</dt><dd>${expr}</dd>`).join('')}</dl>`;
  const formula = (pairs, rows, note) => `<div class="formula">${pairs && pairs.length ? legend(pairs) : ''}${eqs(rows)}${note ? `<p class="formula__note">${note}</p>` : ''}</div>`;
  const table = (headers, rows) => `<div class="table-wrap"><table><thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

  const M = [
    {
      title: 'BMI for adults',
      body: `<p>Body mass index screens weight relative to height. It does not see fat versus muscle, or where fat sits.</p>
${formula([], [['BMI', 'weight (kg) ÷ height (m)²']])}
${table(['BMI', 'WHO class'], [
  ['&lt; 18.5', 'Underweight'],
  ['18.5–24.9', 'Healthy'],
  ['25–29.9', 'Overweight'],
  ['30–34.9', 'Obesity I'],
  ['35–39.9', 'Obesity II'],
  ['≥ 40', 'Obesity III'],
])}
<p class="small muted" style="margin-top:8px">Lower thresholds apply for South Asian, Chinese and other Asian, Middle Eastern, and Black African / African-Caribbean backgrounds: 23 overweight, 27.5 obesity, and 32.5 / 37.5 for obesity classes II / III.</p>
<ul>
<li>Several populations carry more body fat and cardiometabolic risk at the same BMI, hence the lower action points. ${c(['who2004asia', 'nice2025'])}</li>
<li>From 65 years, mortality is lowest around BMI 23–30 and rises below 23; "overweight" is not a risk marker at that age. ${c(['winter2014'])}</li>
<li>The 2025 Lancet Commission: BMI alone cannot diagnose obesity. Confirm with waist, waist-to-hip or waist-to-height ratio, or a body-fat measurement (not needed above BMI 40). ${c(['rubino2025'])}</li>
</ul>
<p class="verdict">Used as a screen, always paired with a waist-based measure when one is entered.</p>`,
    },
    {
      title: 'BMI for children (2–19 years)',
      body: `<p>Healthy BMI changes with age and differs between boys and girls, so a child's BMI is converted to a percentile or z-score using official reference tables (LMS method). ${c(['cole1990'])}</p>
${formula(
  [
    ['z', 'z-score: standard deviations from the median for that age and sex'],
    ['L, M, S', "reference values looked up for the child's exact age and sex"],
    ['Φ', 'the normal distribution\'s cumulative function (turns a z-score into a percentile)'],
  ],
  [
    ['z-score', '((BMI ÷ M)^L − 1) ÷ (L × S)'],
    ['Percentile', 'Φ(z) × 100'],
  ],
)}
${formula(
  [
    ['P95', 'the 95th-percentile BMI for that age and sex'],
    ['σ', 'spread of the extended scale, itself a function of age'],
    ['SD2, SD3', "the WHO reference's +2 SD and +3 SD curves"],
  ],
  [
    ['CDC, above the 95th percentile', '90 + 10 × Φ((BMI − P95) ÷ σ)'],
    ['σ (boys)', '0.3728 + 0.5196 × age − 0.0091 × age²'],
    ['σ (girls)', '0.8334 + 0.3712 × age − 0.0011 × age²'],
    ['WHO, beyond ±3 SD', 'z = 3 + (BMI − SD3) ÷ (SD3 − SD2)'],
  ],
  'These two replace the plain z-score formula above only at the extreme high end, where it stops being reliable (see below).',
)}
<ul>
<li><b>CDC 2000</b> (US standard, 2–20 y): underweight &lt; 5th, healthy 5th–&lt;85th, overweight 85th–&lt;95th, obesity ≥ 95th; severe obesity class 2 ≥ 120% of the 95th percentile, class 3 ≥ 140%. ${c(['cdc2000', 'cdc2022ext', 'hampl2023'])}</li>
<li>The plain LMS formula compresses very high BMIs into almost identical z-scores; the CDC extended method fixes that and is used automatically above the 95th percentile. ${c(['wei2020'])}</li>
<li><b>WHO</b>: 2006 Growth Standards under 5 years (overweight &gt; +2 SD, obesity &gt; +3 SD) and the 2007 Reference for 5–19 years (overweight &gt; +1 SD, obesity &gt; +2 SD). ${c(['who2006', 'deonis2007'])}</li>
</ul>
<p class="verdict">Both references are computed; you choose which one leads. Guidance thresholds are applied on the CDC scale because the treatment guidelines are written in CDC percentiles.</p>`,
    },
    {
      title: 'Resting metabolic rate: which equation when',
      body: `<p>Every equation below predicts resting metabolic rate (RMR) from a handful of easy-to-measure inputs – the table shows exactly which inputs each one uses.</p>
${formula(
  [
    ['W', 'weight, kg'],
    ['H', 'height, cm'],
    ['A', 'age, years'],
    ['FFM', 'fat-free mass, kg (from measured or estimated body fat %)'],
  ],
  [
    ['Mifflin-St Jeor', `${men('men')}: 10W + 6.25H − 5A + 5`],
    ['', `${women('women')}: 10W + 6.25H − 5A − 161`],
    ['Harris-Benedict', `${men('men')}: 66.47 + 13.75W + 5.00H − 6.76A`],
    ['', `${women('women')}: 655.1 + 9.56W + 1.85H − 4.68A`],
    ['Roza-Shizgal (1984 revision)', `${men('men')}: 88.36 + 13.40W + 4.80H − 5.68A`],
    ['', `${women('women')}: 447.6 + 9.25W + 3.10H − 4.33A`],
    ['Owen', `${men('men')}: 879 + 10.2W`],
    ['', `${women('women')}: 795 + 7.18W`],
    ['Livingston', `${men('men')}: 293 × W^0.433 − 5.92A`],
    ['', `${women('women')}: 248 × W^0.4356 − 5.09A`],
    ['Schofield / WHO', `age-banded, weight only (e.g. ${men('men')} 30–60: 11.472W + 873.1)`],
    ['Henry (Oxford)', `age-banded, weight only (e.g. ${men('men')} 30–60: 0.0592W + 2.48 MJ)`],
    ['Cunningham 1980', '500 + 22 × FFM'],
    ['Katch-McArdle', '370 + 21.6 × FFM (same equation as Cunningham 1991)'],
  ],
  'All results in kcal/day.',
)}
<ul>
<li><b>General adults, including obesity → Mifflin-St Jeor.</b> It predicted within ±10% of measured RMR in more non-obese and obese adults than Harris-Benedict, Owen or WHO, with the narrowest error range. ${c(['frankenfield2005', 'frankenfield2013'])}</li>
<li><b>Athletes with measured body composition → Cunningham.</b> In a 2023 meta-analysis (29 studies, 1,430 athletes) Cunningham, Harris-Benedict and ten Haaf were unbiased; Mifflin-St Jeor, Owen and WHO under- or over-predicted. ${c(['oneill2023', 'cunningham1980'])}</li>
<li><b>Athletes without body-fat data → Harris-Benedict (1919).</b> Same meta-analysis. ${c(['oneill2023'])}</li>
<li><b>Asian adults</b>: most equations were fitted in white populations and over-predict; Henry's Oxford equations use a larger, more diverse dataset and give lower values. ${c(['henry2005'])}</li>
<li><b>Obesity</b>: use actual weight, not an "adjusted" weight, in these equations. ${c(['frankenfield2011'])} FFM-based equations are only as good as the body-fat number feeding them.</li>
<li><b>Children → Schofield weight + height</b> (ESPGHAN/ESPEN, grade B). Harris-Benedict is unsuitable under 10 years. ${c(['espghan2005', 'schofield1985'])}</li>
</ul>
<p class="verdict">Every equation is shown side by side, and you choose which one leads. By default, Auto picks the equation the evidence supports for your profile and prints the reason next to it. Expect ±10% individual error from any of them.</p>`,
    },
    {
      title: 'Total daily energy expenditure (TDEE)',
      body: `<p>Primary estimate: the <b>National Academies 2023</b> equations, fitted directly to doubly-labeled-water measurements of free-living energy expenditure. ${c(['nasem2023'])}</p>
${formula(
  [
    ['A', 'age, years'],
    ['H', 'height, cm'],
    ['W', 'weight, kg'],
  ],
  [
    [`Adults 19+, inactive - ${men('men')}`, '753.07 − 10.83A + 6.50H + 14.10W'],
    [`Adults 19+, inactive - ${women('women')}`, '584.90 − 7.01A + 5.72H + 11.71W'],
    ['Children 3–18', 'separate equations + energy for growth (15–30 kcal/day)'],
  ],
  'kcal/day. Other activity categories use their own coefficients – whichever applies to you is shown in the results.',
)}
${formula(
  [['PAL', 'physical activity level = TEE ÷ BMR']],
  [
    ['Activity categories, adults (PAL)', 'inactive &lt; 1.53 · low active 1.53–1.68 · active 1.68–1.85 · very active ≥ 1.85'],
    ['Cross-check (factorial method)', 'TEE = BMR × PAL'],
  ],
  fmt.esc('FAO/WHO/UNU 2004'),
)}
<ul>
<li>Individual prediction error (RMSE): men ±339, women ±246, boys ±259, girls ±237 kcal/day, shown as a range, not hidden. ${c(['nasem2023'])}</li>
<li>The popular multipliers 1.2 / 1.375 / 1.55 / 1.725 / 1.9 have no clear primary source, and 1.2 "sedentary" is below virtually all free-living measurements (PAL ≈ 1.4 or more). ${c(['black1996', 'fao2004'])}</li>
<li>Energy expenditure adjusted for body size is stable from 20 to 60 years and declines after ~60. ${c(['pontzer2021'])}</li>
<li>Newer: a 2025 equation from 6,497 IAEA measurements predicts TEE without an activity category, but it needs ethnicity and altitude coding and was corrected after publication. Noted here, not yet implemented. ${c(['bajunaid2025'])}</li>
</ul>`,
    },
    {
      title: 'Weight change over time: the dynamic model',
      body: `<p>The projection uses the NIH body-weight model of Hall et al. (Lancet 2011), the model behind the NIH Body Weight Planner, implemented from the paper's web appendix. ${c(['hall2011'])}</p>
${formula(
  [
    ['F, L, G', 'fat, lean and glycogen mass, kg'],
    ['EI, EE', 'energy intake and expenditure, kcal/day'],
    ['ρF, ρL', 'energy density: fat 39.5 MJ/kg, lean 7.6 MJ/kg'],
    ['p', 'share of any imbalance that comes from lean rather than fat mass'],
  ],
  [
    ['Fat balance', 'ρF × dF/dt = (1 − p) × (EI − EE − ρG × dG/dt)'],
    ['Lean balance', 'ρL × dL/dt = p × (EI − EE − ρG × dG/dt)'],
    ['Forbes curve', 'p = C ÷ (C + F), where C = 10.4 kg × ρL/ρF'],
  ],
  'The Forbes curve is why the leaner you are, the more of each kilogram lost comes from lean tissue rather than fat.',
)}
${formula(
  [
    ['BW', 'body weight, kg'],
    ['K, γF, γL, δ', 'fitted constants relating body size to expenditure'],
    ['TEF', 'thermic effect of food – the energy cost of digesting what you eat'],
    ['AT', 'adaptive thermogenesis – the extra metabolic slowdown beyond what smaller body size alone explains'],
  ],
  [
    ['Expenditure', 'EE = K + γF×F + γL×L + δ×BW + TEF + AT + ηF×dF/dt + ηL×dL/dt'],
    ['Adaptive thermogenesis', 'τ × dAT/dt = 0.14 × ΔEI − AT, τ = 14 days'],
  ],
  'γF 13, γL 92 kJ/kg/day · ηF 750, ηL 960 kJ/kg (cost of building new tissue) · TEF = 0.10 × ΔEI · ΔEI = change in intake from baseline. Glycogen (2.7 g water per g) and sodium-driven fluid shifts model the first week separately.',
)}
<ul>
<li>Starting fat mass: measured if given, else the circumference estimate, else Jackson 2002 (the model's own default). ${c(['jackson2002'])}</li>
<li>The "3,500 kcal = 1 lb" rule (7,700 kcal/kg) ignores falling expenditure and water shifts: it under-predicts week one and increasingly over-promises after. ${c(['wishnofsky1958', 'thomas2014', 'hall2008'])}</li>
<li>Rule of thumb from the model: every 10 kJ (2.4 kcal) per day of sustained intake change moves eventual weight by ~0.1 kg; half the change takes about a year. ${c(['hall2011'])}</li>
<li>Not in the model: appetite. Intake tends to drift up ~100 kcal/day per kg lost, which is why plans must survive the maintenance phase. ${c(['polidori2016'])}</li>
</ul>
<p class="verdict">Adults only. Growth makes the adult model invalid for children, so none is projected for them.</p>`,
    },
    {
      title: 'Body fat: which estimate when',
      body: `<p>Circumference-based methods (a tape measure) beat formulas that use only BMI, because two people with the same BMI can carry very different amounts of fat.</p>
${formula(
  [
    ['waist, neck, hip, height', 'body circumferences and height, cm'],
  ],
  [
    [`US Navy – ${men('men')}, density`, '1.0324 − 0.19077 × log(waist − neck) + 0.15456 × log(height)'],
    [`US Navy – ${women('women')}, density`, '1.29579 − 0.35004 × log(waist + hip − neck) + 0.22100 × log(height)'],
    ['US Navy – % body fat', '495 ÷ density − 450 (Siri equation)'],
    ['RFM, adults (15+)', '64 − 20 × (height ÷ waist) + 12 × female'],
    ['RFMp, children (8–14)', '74 − 22 × (height ÷ waist) + 5 × female'],
  ],
  '"female" = 1 if true, 0 if not (0 for "male"). Result: % body fat.',
)}
${formula(
  [
    ['B', 'BMI, kg/m²'],
    ['A', 'age, years'],
    ['S', 'sex in CUN-BAE: 1 = female, 0 = male'],
    ['s', 'sex in Gallagher and Deurenberg: 1 = male, 0 = female'],
  ],
  [
    ['CUN-BAE', '−44.988 + 0.503A + 10.689S + 3.172B − 0.026B² + 0.181BS − 0.02BA − 0.005B²S + 0.00021B²A'],
    ['Gallagher (4-compartment)', '64.5 − 848/B + 0.079A − 16.4s + 0.05sA + 39.0s/B'],
    ['Deurenberg, adults', '1.20B + 0.23A − 10.8s − 5.4'],
    ['Deurenberg, children', '1.51B − 0.70A − 3.6s + 1.4'],
  ],
  'BMI-only formulas: no circumference needed, but they cannot separate a muscular person from a fat one. Result: % body fat.',
)}
<ul>
<li>Measured values (DXA, air displacement, 4-compartment) always win. ${c(['kelly2009'])}</li>
<li>With a tape measure, circumference methods (RFM validated against DXA in NHANES; US Navy) beat BMI-only formulas; their median is used. ${c(['woolcott2018', 'hodgdon1984'])}</li>
<li>BMI-only formulas (CUN-BAE, Gallagher, Deurenberg) are a fallback; they cannot tell a muscular person from a fat one. ${c(['gomezambrosi2012', 'gallagher2000', 'deurenberg1991'])}</li>
<li>Healthy ranges come from Gallagher 2000: the body fat matching BMI 18.5 / 25 / 30 by age, sex and ethnicity (e.g. women 20–39: 21–33%, men 20–39: 8–20%). ${c(['gallagher2000'])}</li>
<li>Fat mass index classes (kg/m²) from NHANES DXA; fat-free mass index normalized to 1.8 m. ${c(['kelly2009', 'kouri1995'])}</li>
</ul>`,
    },
    {
      title: 'Central fat',
      // A function, not a plain string like every other entry: 'Men'/'Women' are table row
      // labels, not formula notation, so (unlike the equation tables above) they need
      // translating - but they're too short/common to be safe apply() substring keys (see
      // EXACT_ONLY in i18n.js), so they go through FH.i18n.t() instead. M is built once at
      // script-load time, before app.js has applied the saved locale, so t() must be called
      // from here - deferred until renderMethods() actually runs - not baked into the string.
      body: () => `<p>Two people can share a BMI and carry very different amounts of fat around the waist – central ("visceral") fat carries extra cardiometabolic risk that BMI alone misses.</p>
${table(['Waist circumference', 'Increased risk', 'Substantially increased'], [
  [`${men(FH.i18n.t('Men'))}, Europid`, '≥ 94 cm', '≥ 102 cm'],
  [`${women(FH.i18n.t('Women'))}, Europid`, '≥ 80 cm', '≥ 88 cm'],
  [`${men(FH.i18n.t('Men'))}, Asian / Latin American`, '≥ 90 cm', '—'],
  [`${women(FH.i18n.t('Women'))}, Asian / Latin American`, '≥ 80 cm', '—'],
])}
${table(['Ratio', 'Threshold'], [
  ['Waist ÷ height, adults', '0.40–0.49 healthy · 0.50–0.59 increased · ≥ 0.60 high'],
  ['Waist ÷ height, children (5+)', '≥ 0.5 raised'],
  [`Waist ÷ hip, ${men(FH.i18n.t('men'))}`, '≥ 0.90 substantially increased'],
  [`Waist ÷ hip, ${women(FH.i18n.t('women'))}`, '≥ 0.85 substantially increased'],
])}
<ul>
<li>Waist-to-height ratio predicted cardiometabolic risk better than waist or BMI in a meta-analysis and is NICE's recommended adult measure alongside BMI. ${c(['ashwell2012', 'nice2025'])}</li>
<li>Thresholds: WHO 2008 and the IDF's ethnic-specific cut-offs. ${c(['who2008waist', 'idf2006'])}</li>
<li>"Keep your waist to less than half your height" also works for children, less so in adolescence. ${c(['mccarthy2006'])}</li>
</ul>`,
    },
    {
      title: 'A safe pace',
      body: `<ul>
<li>Guideline diets: a deficit of ≥ 500 kcal/day, typically 1,200–1,500 kcal/day for women and 1,500–1,800 for men; 5–10% loss already brings meaningful health benefits. ${c(['jensen2014'])}</li>
<li>Usual pace 0.5–1 kg (≈ 0.5–1% of body weight) per week; faster loss costs more lean mass. ${c(['nhlbi1998', 'helms2014'])}</li>
<li>Below 800 kcal/day is a very-low-calorie diet: only with clinical supervision. ${c(['nice2025'])}</li>
<li>Rapid loss raises gallstone risk; the app flags more than 1.5 kg (3.3 lb) per week and never plans a faster pace on its own. ${c(['niddkGallstones', 'weinsier1995'])}</li>
<li>Theoretical ceiling on energy released from fat: ~290 kJ (69 kcal) per kg of fat per day. Larger deficits draw more on lean tissue. ${c(['alpert2005'])}</li>
<li>Milestones: 5% (metabolic benefits), 10% (e.g. fatty-liver resolution), ≥ 15 kg (type 2 diabetes remission in 86% in DiRECT). ${c(['jensen2014', 'vilargomez2015', 'lean2018'])}</li>
</ul>`,
    },
    {
      title: 'Daily targets',
      body: `<ul>
<li>Protein while losing weight: 1.2–1.6 g/kg/day helps preserve lean mass and satiety. With BMI ≥ 30 the app uses goal weight, since protein needs follow lean mass. ${c(['leidy2015'])} Older adults: at least 1.0–1.2 g/kg. ${c(['bauer2013'])} Lean, resistance-trained athletes in a deficit: 2.3–3.1 g/kg fat-free mass. ${c(['helms2014'])}</li>
<li>Macronutrient ranges (AMDR): carbohydrate 45–65%, fat 20–35% (children 25–35%), protein 10–35%; fiber 14 g per 1,000 kcal and age/sex Adequate Intakes. ${c(['iom2005'])}</li>
<li>Total water: 2.0 L/day women, 2.5 L/day men, from drinks and food. ${c(['efsa2010water'])}</li>
<li>Activity: 150–300 min/week moderate for adults; 60 min/day for children. 200–300 min/week helps prevent regain. ${c(['who2020pa', 'donnelly2009'])}</li>
</ul>`,
    },
    {
      title: 'Children: guidance, not diets',
      body: `<ul>
<li>AAP 2023: children with overweight or obesity should be offered family-based intensive health-behavior and lifestyle treatment (≥ 26 contact hours over 3–12 months). ${c(['hampl2023'])}</li>
<li>Weight goals by age and BMI percentile (Expert Committee 2007): maintenance while growing for most; if loss is appropriate, no more than ~0.5 kg per month (younger children) or ~0.9 kg per week (severe obesity, older children and teens). ${c(['barlow2007'])}</li>
<li>Energy shown is the National Academies requirement for healthy growth at the chosen activity level, not a deficit target. ${c(['nasem2023'])}</li>
</ul>`,
    },
    {
      title: 'Deliberately left out',
      body: `<ul>
<li><b>"Ideal body weight" formulas</b> (Devine, Robinson, Miller, Hamwi) come from drug dosing and insurance tables, not health outcomes. The healthy BMI range is shown instead.</li>
<li><b>"New BMI" (weight × 1.3 ÷ height^2.5)</b> has not been validated against health outcomes.</li>
<li><b>Fixed activity multipliers</b> and the <b>3,500 kcal rule</b> for anything beyond a few weeks (see above).</li>
<li><b>Bathroom-scale body fat</b> as an override: consumer bioimpedance varies by several percentage points with hydration.</li>
</ul>`,
    },
  ];

  function renderMethods() {
    // A sticky contents list beside one reading column: the write-ups vary a lot in length, so
    // side-by-side cards left ragged gaps; a single column with wayfinding reads like a document.
    const html = `<header class="page-head"><h1>Methods</h1>
      <p class="methods__lead">How every number on the dashboard is calculated, and which formula wins in which situation, and why. Every <sup class="cite-ref">[n]</sup> links to its full citation in <b>Sources</b>.</p>
      <p class="methods__note">WeightFrame gives population-based estimates for education, not medical advice or a diagnosis.</p></header>
      <div class="methods__layout">
        <nav class="toc" aria-label="Methods"><ol>${M.map((m, i) => `<li><a href="#m-${i}">${m.title}</a></li>`).join('')}</ol></nav>
        <div class="methods__col">${M.map((m, i) => `<section class="method" id="m-${i}"><h2>${m.title}</h2>${typeof m.body === 'function' ? m.body() : m.body}</section>`).join('')}</div>
      </div>`;
    return FH.i18n.apply(html);
  }

  function renderSources() {
    // Topic-group headings (e.g. "BMR", "Body fat") are UI chrome, translated below; the
    // bibliography entries themselves stay in their original language, as is conventional -
    // shielded from FH.i18n.apply()'s dictionary pass (real paper titles routinely contain
    // words like "Age", "Fat" or "Intake" that would otherwise get mid-title substituted).
    const shield = [];
    const keep = (s) => { shield.push(s); return `\x00CITE${shield.length - 1}\x00`; };
    // Manual claim-review record: population/study type/limitations/correction status are the
    // reviewer's own English notes (shielded like the citation text itself), so they read the
    // same in both languages; only the row labels are translated UI chrome. Present only for
    // sources that have actually been checked this way - most references only carry link
    // metadata (Crossref/PubMed resolution), which is a different, weaker kind of check.
    const row = (label, value) => value ? `<div><dt>${fmt.esc(FH.i18n.t(label))}</dt><dd>${keep(fmt.esc(value))}</dd></div>` : '';
    const review = (r) => r.population ? `<dl class="ref-item__review">
        ${row('Population', r.population)}
        ${row('Study type', r.studyType)}
        ${row('Limitations', r.limitations)}
        ${row('Corrections', r.correctionStatus)}
        <div><dt>${fmt.esc(FH.i18n.t('Claim last checked'))}</dt><dd>${fmt.esc(r.lastChecked)}</dd></div>
      </dl>` : '';
    const groups = FH.refs.orderedTopics;
    const body = groups.map((g) => `<div class="sources__topic"><h2>${fmt.esc(FH.i18n.t(g.topic))}</h2><ol>${g.items.map((r) =>
      `<li class="ref-item" id="ref-${r.id}"><span class="ref-item__num">${r.num}</span><span class="ref-item__body"><b>${keep(fmt.esc(r.tag))}.</b> ${keep(fmt.esc(r.cite))} <a href="${r.url}" target="_blank" rel="noopener">${fmt.esc(r.url.replace(/^https?:\/\//, ''))}</a>${review(r)}</span></li>`).join('')}</ol></div>`).join('');
    const html = `<header class="page-head"><h1>Sources</h1>
      <p class="sources__lead">Full bibliography for every citation in the app, numbered in the order they first appear. ${FH.refs.count} sources, checked against Crossref / NCBI. A few sources critical to a specific claim also carry a manual claim-review record (population, study type, limitations, correction status) below their entry.</p></header>
      <div class="sources__grid">${body}</div>`;
    return FH.i18n.apply(html).replace(/\x00CITE(\d+)\x00/g, (_, i) => shield[+i]);
  }

  FH.methods = { renderMethods, renderSources };
})(typeof self !== 'undefined' ? self : this);
