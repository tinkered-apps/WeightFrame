# The science behind WeightFrame

A research report on every number the dashboard shows: which formulas exist, which one the
evidence favours in which situation, what the app implements, and how each coefficient was
verified. The same content, condensed, is in the app under **Methods** and **Sources**, and every
number on the dashboard carries a numbered citation linking to its source.

Research date: September 2026. All 78 cited sources were checked: DOIs resolved through
Crossref and PubMed IDs through NCBI E-utilities, with titles matched to the intended paper.

---

## 1. Summary of decisions

| Quantity | Implemented (primary) | Why | Also shown |
|---|---|---|---|
| Adult BMI class | WHO 2000; lower cut-offs (23 / 27.5) for South Asian, Chinese/other Asian, Middle Eastern, Black African/African-Caribbean backgrounds | WHO 2004 expert consultation; NICE NG246 (2025) | Note for ages 65+ (Winter 2014) |
| Is the high BMI really excess fat? | Lancet Commission 2025 logic: confirm with waist, waist-to-height or waist-to-hip ratio, or a body-fat measurement; assumed above BMI 40 | BMI alone misclassifies | — |
| Child BMI | CDC 2000 LMS percentiles; above P95 the CDC 2022 extended (Wei 2020) method | US clinical standard; fixes z-score compression | WHO 2006 (under 5) and WHO 2007 (5–19) |
| Resting metabolic rate | Mifflin-St Jeor (adults); Schofield weight+height (children); Cunningham 1980 (athletes with measured body fat); Harris-Benedict 1919 (athletes without) | Frankenfield 2005 SR; ESPGHAN/ESPEN 2005; O'Neill 2023 meta-analysis | 9 other equations side by side |
| Total daily expenditure | National Academies 2023 EER equations | Fitted to ~6,500 doubly-labelled-water measurements | BMR × PAL cross-check; ±RMSE ranges |
| Weight over time | Hall et al. 2011 dynamic model (NIH Body Weight Planner model) | Validated against feeding studies; captures adaptation and water shifts | Classic 3,500 kcal/lb rule, for contrast |
| Body fat % | Measured value if given; else median of circumference methods (RFM, US Navy); else median of BMI-based formulas | Circumference methods track DXA better than BMI-only formulas | CUN-BAE, Gallagher, Deurenberg |
| Healthy body-fat range | Gallagher 2000 (by age, sex, ethnicity) | Only published ranges anchored to BMI outcomes | FMI classes (Kelly 2009), FFMI |
| Central fat | Waist (WHO 2008 / IDF), waist-to-height (NICE 2025), waist-to-hip (WHO 2008) | Guideline thresholds | — |
| Plan safety | AHA/ACC/TOS 2013 intake bands, NHLBI pace, NICE VLCD rule, NIDDK gallstone risk, Alpert fat-release ceiling | Guideline consensus | — |
| Factors outside the arithmetic | Twelve studies on sleep, food processing, pre-meal water, alcohol, meal timing, NEAT, deficit depth with training, and self-monitoring | Each card prints its design and sample beside the figure; the four measured in kcal/day are drawn against the user's own deficit | Section 10a |
| Children's plans | No deficit plans; AAP 2023 + Expert Committee 2007 goals | Growth invalidates adult models; guidelines favour family-based treatment | Energy requirement for growth |

---

## 2. BMI for adults

`BMI = weight (kg) / height (m)²`

**WHO 2000 classes:** < 16 severe thinness, 16–16.99 moderate, 17–18.49 mild; 18.5–24.9 healthy;
25–29.9 overweight (pre-obese); 30–34.9 obesity I; 35–39.9 obesity II; ≥ 40 obesity III.

**Ethnicity.** At the same BMI, many Asian populations carry more body fat and cardiometabolic
risk. The WHO Expert Consultation (Lancet 2004) proposed public-health action points at 23 and
27.5 kg/m². NICE NG246 (2025) applies 23 / 27.5 to people of South Asian, Chinese, other Asian,
Middle Eastern, Black African or African-Caribbean family background. Gallagher 2000 shows the
same effect in body-fat terms: Asian adults have ~2–5 percentage points more fat at a given BMI.

**Older adults.** A meta-analysis of 32 cohorts (≈198,000 people aged ≥ 65, Winter 2014) found
mortality rose below BMI ~23 and was *not* raised in the overweight band. The app shows this
note from age 65 and warns when a goal would take an older adult below BMI 23.

**Limitations and the 2025 Lancet Commission.** BMI cannot distinguish fat from muscle or tell
where fat sits. The Lancet Diabetes & Endocrinology Commission (Rubino 2025, endorsed by 75+
organisations) recommends confirming excess adiposity with at least one anthropometric measure
(waist, waist-to-hip, waist-to-height) or a direct body-fat measurement; above BMI 40 excess
adiposity can be assumed. The app's "Excess body fat?" verdict implements exactly this logic.

**Alternatives considered and not used**
- *"New BMI"* (1.3 × weight / height^2.5, Trefethen): mathematically motivated, not validated
  against health outcomes.
- *Ideal body weight formulas* (Devine, Robinson, Miller, Hamwi): they originate in drug dosing
  and insurance tables, not in outcome data; the healthy BMI range is shown instead.

---

## 3. BMI for children and adolescents (2–19 years)

Healthy BMI changes strongly with age (it falls until ~5–6 years, then rises) and differs by sex,
so children are compared with age- and sex-specific references using the **LMS method** (Cole 1990):

```
z = ((BMI / M)^L − 1) / (L × S)        percentile = Φ(z) × 100
```

L (skew), M (median) and S (coefficient of variation) are taken from the official tables for the
exact sex and age. The app ships the unmodified official tables (see `data-src/`, converted by
`scripts/build_growth_data.py`).

### CDC vs WHO: which one?

| | CDC 2000 | WHO 2006 standard | WHO 2007 reference |
|---|---|---|---|
| Ages | 2–20 y | 0–5 y | 5–19 y |
| Data | US surveys 1963–1994 | Healthy breastfed children, 6 countries (prescriptive) | 1977 NCHS data merged with the 2006 standard |
| Overweight | ≥ 85th percentile | > +2 SD | > +1 SD |
| Obesity | ≥ 95th percentile | > +3 SD | > +2 SD |
| Under | < 5th percentile | < −2 SD (wasting) | < −2 SD (thinness) |
| Used by | USA; AAP 2023 guideline | Most countries, under 5 | Most countries, 5–19 |

Both are computed; the user chooses which leads. **Treatment goals** are always evaluated on the
CDC scale because the AAP and Expert Committee guidance is written in CDC percentiles.

**CDC age convention.** The CDC tables list age "at the half-month point for the entire month",
so a child aged 144.0–144.99 months uses the 144.5 row. Implementing this convention reproduced
the published 95th-percentile values exactly (e.g. 24.23 kg/m² for a 12-year-old boy).

**Above the 95th percentile.** Plain LMS z-scores are compressed at extreme BMI (two 10-year-old
boys with BMI 50 and 55 differ by only 0.03 z). Wei et al. 2020 model BMI above P95 as a
half-normal distribution, the method behind the CDC's 2022 extended BMI-for-age charts:

```
percentile = 90 + 10 × Φ((BMI − P95) / σ)       z = Φ⁻¹(percentile / 100)
σ(boys)  = 0.3728 + 0.5196·age − 0.0091·age²     (age in years)
σ(girls) = 0.8334 + 0.3712·age − 0.0011·age²
```

Severe obesity: class 2 ≥ 120% of P95 (or BMI ≥ 35), class 3 ≥ 140% of P95 (or BMI ≥ 40); the
app also reports BMI as % of P95, the recommended metric for tracking severe obesity.

**WHO beyond ±3 SD.** WHO uses a "restricted" LMS: `z = 3 + (BMI − SD3) / (SD3 − SD2)` (and the
mirror below −3), which the app implements.

*Not implemented:* IOTF (Cole 2000) international cut-offs, which are useful for epidemiology
but not used by the clinical guidelines this app follows.

---

## 4. Resting (basal) metabolic rate: which equation when

BMR/RMR is ~60–70% of daily expenditure. Every equation has roughly ±10% individual error, so
the app shows all applicable equations side by side and picks one by evidence-based rules.

### The equations (kcal/day; W kg, H cm, A years, FFM kg)

| Equation | Formula | Developed in | Notes |
|---|---|---|---|
| Mifflin-St Jeor 1990 | 10W + 6.25H − 5A + 5 (men) / − 161 (women) | 498 healthy adults, 19–78 y, normal weight and obese | Best general performer |
| Harris-Benedict 1918/1919 | men 66.47 + 13.75W + 5.00H − 6.76A; women 655.1 + 9.56W + 1.85H − 4.68A | 239 young, lean adults | Over-predicts in the general population by ~5–15%; unbiased in athletes |
| Roza-Shizgal 1984 | men 88.36 + 13.40W + 4.80H − 5.68A; women 447.6 + 9.25W + 3.10H − 4.33A | Re-fit of HB data | Similar behaviour to HB |
| Owen 1986/1987 | men 879 + 10.2W; women 795 + 7.18W | 104 adults | Weight only; under-predicts |
| Schofield / WHO-FAO-UNU 1985 | age-banded, weight only (e.g. men 30–60: 11.472W + 873.1) | ~7,000 BMRs, many Italian military | Basis of FAO/WHO requirements |
| Henry (Oxford) 2005 | age-banded, weight only (MJ/d; e.g. men 30–60: 0.0592W + 2.48) | 10,552 BMRs incl. tropical and elderly | Lower than Schofield; UK SACN 2011 |
| Livingston-Kohlstadt 2005 | men 293·W^0.433 − 5.92A; women 248·W^0.4356 − 5.09A | Normal-weight and obese adults | Power law; designed for obesity |
| Cunningham 1980 | 500 + 22·FFM | Harris-Benedict data re-analysed | Best in athletes (with measured FFM) |
| Katch-McArdle / Cunningham 1991 | 370 + 21.6·FFM | Synthetic review | Only as good as the FFM input |

Children additionally: **Schofield weight + height** (height in m), e.g. boys 3–10 y
`19.6W + 130.3H + 414.9`, girls 10–18 y `8.365W + 465H + 200`, and Henry's child bands.

### Evidence

- **Frankenfield 2005** (systematic review, J Am Diet Assoc): of the four most-used equations
  (Harris-Benedict, Mifflin-St Jeor, Owen, WHO/FAO/UNU), Mifflin-St Jeor predicted RMR within
  ±10% of measured in more non-obese *and* obese adults than any other, with the narrowest error
  range. Older adults and US ethnic minorities were under-represented.
- **Frankenfield 2013**: Mifflin-St Jeor showed minimal bias across body sizes, with accuracy
  falling in obesity. A 2020 validation in women found Mifflin-St Jeor within ±10% in 80% of
  women with obesity.
- **O'Neill 2023** (meta-analysis, 29 studies, 1,430 athletes, 100 equations): Cunningham 1980,
  Harris-Benedict 1918, Cunningham 1991, De Lorenzo and ten Haaf did not differ significantly from
  measured RMR; Mifflin-St Jeor, Owen, FAO/WHO/UNU, Nelson and Koehler under- or over-predicted.
- **Henry 2005**: the Oxford database (10,552 BMRs, more elderly and tropical subjects) yields
  lower values than Schofield; most Western-derived equations over-predict in Asian adults.
- **ESPGHAN/ESPEN 2005** (paediatric guideline, grade B): use WHO and especially Schofield
  weight+height below 10 years; Harris-Benedict, WHO or Schofield from 10 years.
- **Frankenfield & Ashcraft 2011**: use actual (not adjusted) body weight in these equations for
  people with obesity.
- **Pontzer 2021** (Science, DLW life-course data): expenditure adjusted for size is stable from
  20 to 60 years and declines after ~60.

### Decision rules implemented

| Scenario | Primary equation |
|---|---|
| Child or adolescent (< 18 y) | Schofield weight + height |
| Adult athlete with measured body fat | Cunningham 1980 |
| Adult athlete without body-fat data | Harris-Benedict 1919 |
| Everyone else, including obesity | Mifflin-St Jeor |
| Asian adults | Mifflin-St Jeor, with a note that Henry gives lower (often more realistic) values |
| Age ≥ 60 | Mifflin-St Jeor, with a note on age-related decline |

*Not implemented:* ten Haaf & Weijs 2014 athlete equations (coefficients could only be seen as
images in the source; Cunningham, which the same paper confirmed, is used instead).

---

## 5. Total daily energy expenditure

### Primary: National Academies 2023 (DRI for Energy)

The 2023 Estimated Energy Requirement equations were fitted directly to doubly-labelled-water
measurements of free-living total energy expenditure, the reference method. Adults (19+), kcal/day:

| | Inactive | Low active | Active | Very active |
|---|---|---|---|---|
| Men | 753.07 − 10.83A + 6.50H + 14.10W | 581.47 − 10.83A + 8.30H + 14.94W | 1004.82 − 10.83A + 6.52H + 15.91W | −517.88 − 10.83A + 15.61H + 19.11W |
| Women | 584.90 − 7.01A + 5.72H + 11.71W | 575.77 − 7.01A + 6.60H + 12.14W | 710.25 − 7.01A + 6.54H + 12.34W | 511.83 − 7.01A + 9.07H + 12.56W |

Boys and girls 3–18 have separate equations plus an energy cost of growth (boys 20 at 3 y,
15 at 4–8 y, 25 at 9–13 y, 20 at 14–18 y; girls 15, 15, 30, 20 kcal/day). Under 3 years a single
equation per sex applies.

**Activity categories are data-driven**: they are the quartiles of measured PAL (TEE ÷ BMR).
Adults: inactive 1.00–1.53, low active 1.53–1.68, active 1.68–1.85, very active 1.85–2.50.
Children 3–8 y: < 1.31 / 1.44 / 1.59; 9–13 y: < 1.44 / 1.59 / 1.77; 14–18 y: < 1.56 / 1.73 / 1.92.

**Individual error** (RMSE): men ±339, women ±246, boys ±259, girls ±237 kcal/day. The app shows
this as a "likely range" and a 95% range rather than a falsely precise single number.

### Cross-check: factorial method (BMR × PAL)

FAO/WHO/UNU 2004 lifestyle PALs: sedentary/light 1.40–1.69, active 1.70–1.99, vigorous
2.00–2.40. The widespread multipliers 1.2 / 1.375 / 1.55 / 1.725 / 1.9 have no clear primary
source, and **1.2 "sedentary" is below virtually all free-living DLW measurements** (Black 1996,
574 measurements: free-living PAL rarely falls below ~1.4). The app's factorial cross-check uses
representative PALs inside each NASEM category (adults 1.45 / 1.60 / 1.76 / 2.10).

### Newer, noted but not implemented

Bajunaid et al. 2025 (Nature Food) derived a TEE equation from 6,497 IAEA DLW measurements
(ages 4–96) that needs no activity category. It requires ethnicity and altitude coding and an
author correction was issued in 2025; it is a good candidate for a future version.

---

## 6. Weight change over time

### Why "3,500 kcal = 1 lb" fails

The rule (Wishnofsky 1958; ≈7,700 kcal/kg) treats the body as a static fat store. In reality:
(1) the first weeks include glycogen and water loss, so early loss is *faster* than predicted;
(2) expenditure falls as the body shrinks and through adaptive thermogenesis, so later loss is
*much slower*; (3) the energy content of weight lost changes as the fat/lean mix shifts.
Thomas et al. 2014 and Hall 2008 show the rule increasingly over-predicts loss after a few weeks.

### The Hall 2011 dynamic model (implemented)

Implemented from the Lancet 2011 web appendix (the model behind the NIH Body Weight Planner):

```
ρF·dF/dt = (1 − p)(EI − EE − ρG·dG/dt)        ρF = 39.5 MJ/kg fat
ρL·dL/dt =      p (EI − EE − ρG·dG/dt)        ρL =  7.6 MJ/kg lean
p = C/(C + F),  C = 10.4 kg × ρL/ρF            Forbes curve (Hall 2007)
EE = K + γF·F + γL·L + δ·BW + TEF + AT + ηL·dL/dt + ηF·dF/dt
   γF = 13, γL = 92 kJ/kg/d;  ηF = 750, ηL = 960 kJ/kg
TEF = 0.10·ΔEI;   14·dAT/dt = 0.14·ΔEI − AT    adaptive thermogenesis
δ = ((1 − 0.10)·PAL − 1)·RMR/BW                 physical activity
ρG·dG/dt = CI − kG·G²,  kG = CI_b/G0²,  G0 = 0.5 kg, 2.7 g water per g glycogen
dECF/dt = (ΔNa − 3000·ΔECF − 4000·(1 − CI/CI_b)) / 3220
```

- K is calibrated so that baseline intake equals baseline expenditure (the NASEM TDEE).
- Initial fat mass: measured body fat → circumference estimate → Jackson 2002 (Hall's default:
  men `BW/100 × (0.14·age + 37.31·ln BMI − 103.94)`, women `… + 39.96·ln BMI − 102.01`).
- Integrated with 4th-order Runge-Kutta, half-day steps. The intake that reaches a goal by a date
  is found by bisection; maintenance intake at goal is the model's steady state.
- Rule of thumb that falls out of the model: every 100 kJ (24 kcal) per day of sustained intake
  change moves eventual weight by ~1 kg; about half the change takes ~1 year (Hall 2011).

**What the model shows that static calculators cannot:** the fast first week (mostly water), the
fat/lean/water composition of the loss, the growing gap between the static rule and reality,
the drop in expenditure by goal (smaller body + adaptive thermogenesis + less food to digest),
the maintenance intake after the goal, and the ~1 kg water/glycogen rebound when intake rises to
maintenance.

**Not in the model:** appetite. Polidori 2016 quantified that intake drifts up by ~100 kcal/day
per kg lost, about three times the fall in expenditure, which is the main driver of regain.
Measured over modest losses, so the app does not extrapolate it to large losses.

**Fat-release ceiling:** Alpert 2005 estimated that fat stores can transfer at most ~290 kJ
(69 kcal) per kg of fat per day; deficits above this draw more on lean tissue. Shown as an
informational flag; it is a theoretical estimate, not a guideline.

Adults only: growth makes the model invalid for children.

---

## 7. Body fat: which estimate when

| Method | Inputs | Scope | Accuracy / notes |
|---|---|---|---|
| Measured (DXA, air displacement, 4-compartment) | — | any | Always preferred |
| Relative Fat Mass (Woolcott 2018) | height, waist, sex | ≥ 15 y (RFMp 8–14 y) | Validated against DXA in NHANES; better than BMI |
| US Navy (Hodgdon & Beckett 1984) | height, neck, waist (+hip) | adults | r ≈ 0.9 vs hydrostatic weighing |
| CUN-BAE (Gómez-Ambrosi 2012) | BMI, age, sex | adults 18–80 | Fitted in 6,510 white adults |
| Gallagher 2000 (4-compartment) | BMI, age, sex, ethnicity | adults | Separate Asian equations |
| Deurenberg 1991 | BMI, age, sex | adults; 7–15 y version | Oldest; widely used |

```
Navy (Siri):  %fat = 495 / density − 450
  men    density = 1.0324 − 0.19077·log10(waist − neck) + 0.15456·log10(height)
  women  density = 1.29579 − 0.35004·log10(waist + hip − neck) + 0.22100·log10(height)
RFM   = 64 − 20·(height/waist) + 12·female;  RFMp = 74 − 22·(height/waist) + 5·female
CUN-BAE = −44.988 + 0.503A + 10.689S + 3.172B − 0.026B² + 0.181BS − 0.02BA − 0.005B²S + 0.00021B²A
Gallagher = 64.5 − 848/B + 0.079A − 16.4s + 0.05sA + 39.0s/B;  Asian women 64.8 − 752/B + 0.016A;  Asian men 51.9 − 740/B + 0.029A
Deurenberg adults 1.20B + 0.23A − 10.8s − 5.4;  children 1.51B − 0.70A − 3.6s + 1.4
```

Rule: measured → median of circumference methods → median of BMI-only methods. BMI-only
formulas cannot distinguish a muscular person from a fat one.

**Healthy ranges** (Gallagher 2000, 4-compartment, body fat matching BMI 18.5 / 25 / 30):
White/African American women 21–33% (20–39 y), 23–34% (40–59 y), 24–36% (60–79 y); men 8–20%,
11–22%, 13–25%. Asian adults ~2–5 points higher (Table 5).

**Indices:** fat mass index classes from NHANES DXA (Kelly 2009): men < 6 normal, 6–9 excess,
9–12 / 12–15 / ≥ 15 obese I/II/III; women < 9, 9–13, 13–17 / 17–21 / ≥ 21. Fat-free mass index
normalised to 1.8 m (Kouri 1995; ~25 is near the upper limit in drug-free men).

---

## 8. Central fat

| Measure | Threshold | Source |
|---|---|---|
| Waist, Europid-type values | men ≥ 94 increased, ≥ 102 substantially increased; women ≥ 80 / ≥ 88 | WHO 2008 |
| Waist, South Asian / Chinese / Japanese / Latin American | men ≥ 90, women ≥ 80 | IDF (Alberti 2005) |
| Waist-to-height (adults) | 0.40–0.49 healthy, 0.50–0.59 increased, ≥ 0.60 high | NICE NG246 |
| Waist-to-height (children ≥ 5) | ≥ 0.5 raised; less discriminating in adolescence | McCarthy & Ashwell 2006 |
| Waist-to-hip | men ≥ 0.90, women ≥ 0.85 | WHO 2008 |

Waist-to-height ratio out-performed waist circumference and BMI for cardiometabolic risk in a
meta-analysis (Ashwell 2012).

---

## 9. A safe pace and targets

- Guideline diets: a deficit of ≥ 500 kcal/day, typically 1,200–1,500 kcal/day for women and
  1,500–1,800 for men (AHA/ACC/TOS 2013). 5–10% loss already brings clinically meaningful
  improvements in triglycerides, glucose and HbA1c.
- Pace: 0.5–1 kg (≈ 0.5–1% of body weight) per week (NHLBI 1998); the app's presets are 0.5,
  0.75 and 1.0% of body weight per week, converted to an intake by the dynamic model.
- Below 800 kcal/day = very-low-calorie diet, only under clinical supervision (NICE NG246).
- Rapid loss raises gallstone risk (NIDDK); flagged above 1.5 kg (3.3 lb) per week.
- Milestones: 5% (metabolic benefits), 10% (e.g. NASH resolution in most patients losing ≥ 10%,
  Vilar-Gomez 2015), ≥ 15 kg (type 2 diabetes remission in 86% in DiRECT, Lean 2018).

**Nutrition:** protein 1.2–1.6 g/kg/day during weight loss (Leidy 2015; goal weight used when
BMI ≥ 30), ≥ 1.0–1.2 g/kg for older adults (PROT-AGE), 2.3–3.1 g/kg FFM for lean athletes in a
deficit (Helms 2014); AMDRs carbohydrate 45–65%, fat 20–35% (children 25–35%), protein 10–35%;
fibre 14 g/1,000 kcal and age/sex Adequate Intakes (IOM 2005); total water 2.0 L women / 2.5 L men
(EFSA 2010). **Activity:** 150–300 min/week moderate (WHO 2020), 200–300 min/week helps prevent
regain (ACSM 2009); children 60 min/day.

---

## 10. Children: guidance, not diets

- AAP 2023 Clinical Practice Guideline: offer family-based intensive health-behaviour and
  lifestyle treatment (≥ 26 contact hours over 3–12 months) to children with overweight or
  obesity; do not "watchfully wait".
- Expert Committee 2007 weight goals (the most specific published targets): maintenance while
  growing for the 85th–94th percentile; for ≥ 95th, maintenance or gradual loss of no more than
  ~0.5 kg (1 lb) per month in younger children, and no more than ~0.9 kg (2 lb) per week for
  severe obesity in older children and adolescents.
- The app shows the energy requirement for healthy growth (NASEM 2023), not a deficit.

---

## 10a. What else moves the needle: factors outside the arithmetic

The dashboard's **Levers** section is the only part of the app that is not computed. It exists
because the model above answers "what happens if you hold this intake", and almost every real
failure is a failure to hold it, or a failure of the loss to come out of fat. Each entry had to
clear three bars: an experimental design or a pooled analysis of one (no cross-sectional
associations dressed up as effects, except where quoted for direction and labelled as such), a
number the reader can act on, and a study design honest enough to print beside the number.
Eight of the twelve are randomised trials or meta-analyses: Hall 2019, Tasali 2022, Dennis 2010,
Kwok 2019, Nedeltcheva 2010, Murphy & Koehler 2022, Vujović 2022 and Madigan 2015. Four are not:
Levine 1999 is a single-arm overfeeding experiment, Lichtman 1992 an observational metabolic
study, Harvey 2019 an observational analysis inside one programme, and Patel 2006 a cohort study.
The app labels each design beside its number. All twelve sources were verified through Crossref
in September 2026.

### Effects measured in kcal/day

These four were all reported as a change in daily energy intake, so they are drawn on one
diverging axis with the reader's own starting deficit. The food-environment effect alone,
+508 kcal/day, is as large as the ≥ 500 kcal/day deficit of a guideline diet (section 9).

| Lever | Effect | Design | Source |
|---|---|---|---|
| Ultra-processed vs unprocessed diet, matched for presented calories, energy density, macronutrients, sugar, sodium and fibre | **+508 ± 106 kcal/day** ad libitum intake; +0.9 kg vs −0.9 kg over 2 weeks | Inpatient randomised crossover, 20 weight-stable adults, 2 weeks per arm | Hall 2019 |
| Sleep extension in habitual short sleepers (< 6.5 h), bedtime counselled toward 8.5 h | **−270 kcal/day** (95% CI −393 to −147); sleep +1.2 h/night; no change in expenditure | RCT, 80 adults with overweight, intake measured by doubly labelled water | Tasali 2022 |
| 500 ml water before each of three meals | ~2 kg extra loss over 12 weeks; **−43 kcal** at a single test meal (498 vs 541, P = 0.009), gone by week 12 | RCT, 48 adults aged 55–75 on a hypocaloric diet | Dennis 2010 |
| Alcohol with a meal | **+343 kJ (≈ 82 kcal)** of *food* energy (95% CI 161–525), before the drink's own energy | Meta-analysis, 12 short-term experiments, 417 participants | Kwok 2019 |

The water bar is the only derived figure on the chart and is drawn differently (outlined, not
filled) and labelled as such: 43 kcal × 3 meals ≈ 130 kcal/day. The trial itself reported a
weight outcome, not a daily energy figure, and its acute meal effect was no longer significant
at 12 weeks, so the bar states an upper bound on a mechanism.

The axis is capped at ±800 kcal/day. A deficit deeper than that pins to the edge with a solid
(rather than dashed) marker and the note says so; letting the axis stretch to a 1,300 kcal/day
deficit would squash all four effects into stubs to make room for one line.

### Effects on what the loss is made of

- **Sleep and body composition (Nedeltcheva 2010).** Randomised 2-period crossover, 10 adults
  with overweight, 14 days of the same moderate caloric restriction at 8.5 vs 5.5 h of sleep
  opportunity. Total weight lost was similar; the split was not. Sleep curtailment "decreased
  the proportion of weight lost as fat by 55%" (1.4 vs 0.6 kg) and "increased the loss of
  fat-free body mass by 60%" (1.5 vs 2.4 kg), with higher hunger and ghrelin and a shift away
  from fat oxidation. The long-run cohort signal is quoted alongside it for direction, not
  effect size: in the Nurses' Health Study (Patel 2006, 68,183 women, 16 years) those sleeping
  ≤ 5 h gained 1.14 kg more than 7-hour sleepers.
- **Deficit depth and resistance training (Murphy & Koehler 2022).** Meta-analysis and
  meta-regression of RCTs running resistance training in an energy deficit for ≥ 3 weeks. Lean
  mass gains were impaired versus training without a deficit (ES −0.57, P = 0.02) while strength
  gains were not (ES −0.31, P = 0.28); the meta-regression put the break-even at a deficit of
  about 500 kcal/day. This is the one card that reads the user's own plan back to them, saying
  whether their starting deficit sits above or below that line.

### Effects on what you burn

- **Non-exercise activity thermogenesis (Levine 1999).** 16 adults of healthy weight overfed
  1,000 kcal/day for 8 weeks. Two-thirds of the rise in total expenditure was NEAT; the change
  in NEAT ranged from −98 to +692 kcal/day and "accounted for the 10-fold differences in fat
  storage" (r = 0.77, P < 0.001). Quoted because the same channel runs in reverse on a diet and
  is invisible to both the model and the dieter.
- **Meal timing (Vujović 2022).** Randomised controlled crossover, 16 adults with overweight or
  obesity, identical meals shifted ~4 hours later with nutrient intake, activity, sleep and
  light held constant. Late eating raised hunger (P < 0.0001) and the ghrelin:leptin ratio,
  lowered waketime energy expenditure (P = 0.002) and 24-h core temperature (P = 0.019), and
  moved adipose gene expression toward decreased lipolysis / increased adipogenesis. Small and
  highly controlled: the section presents it as a mechanism, not a prescribed eating window.

### Effects on whether you can see where you are

- **Reported vs actual intake (Lichtman 1992).** 10 adults with a history of "diet resistance"
  studied for 14 days with indirect calorimetry, body-composition analysis and doubly labelled
  water. Total expenditure and RMR were within 5% of prediction, so thermogenesis was not the
  problem. They "underreported their actual food intake by an average of 47 ± 16 percent and
  overreported their physical activity by 51 ± 75 percent". It is one reason a plan and a
  bathroom scale can disagree, and the app says so, along with the caveat that a 10-person study
  cannot show how often it explains a gap.
- **Self-monitoring frequency (Harvey 2019).** 142 adults in a 24-week online behavioural
  programme. Time spent logging did not distinguish outcomes; frequency did: participants
  losing ≥ 10% opened the diary 2.7 times a day vs 1.7 for the rest (P < 0.001). Median time
  fell from 23.2 min/day in month 1 to 14.6 by month 6.
- **Self-weighing (Madigan 2015, with the 2016 erratum).** Adding self-weighing and
  self-regulation techniques to an existing multi-component programme was worth −1.7 kg
  (95% CI −2.6 to −0.8, 4 trials). As a standalone strategy it was not effective (−0.5 kg,
  95% CI −1.3 to 0.3, 1 trial). Both halves are shown, because the message is "read the
  weekly trend as feedback", not "weighing yourself causes weight loss".

### What was considered and left out

- *Breakfast skipping, meal frequency, "metabolism-boosting" foods, green tea, cold exposure*:
  either null in randomised trials or effect sizes too small to report next to the ones above.
- *Stress and cortisol*: the mechanistic literature is real but the interventional weight-loss
  evidence is not strong enough for a quantified card.
- *Cross-sectional associations between hydration and BMI*: no causal design; the app keeps the
  EFSA water reference value as a target in Nutrition and the one randomised pre-meal-water
  trial here.
- *Extrapolating any of these to a person*: the section says the figures come from studies of
  different designs, several small or short, so they give a direction and a rough size.

---

## 11. How the implementation was verified

Unit tests (`npm test`) check the code against published worked examples:

- **Wei 2020 / CDC:** P95 = 20.7 for a girl of 96.5 months and 24.23 for a 12-year-old boy;
  12-year-old boy with BMI 40 → σ = 5.3, percentile 99.985, z ≈ 3.6; 10-year-old boy BMI 21.6 →
  93.9th percentile; 11-year-old boy BMI 23.6 → extended 95.3th; 16-year-old boy BMI 29.3 →
  extended z 1.76.
- **Gallagher 2000** tables reproduced from the equations (e.g. 33% for a 30-year-old woman at
  BMI 25; 35% for an Asian woman).
- **Henry 2005** adult bands match the published kcal forms (e.g. men 18–30: 16.0W + 545).
- **Hall 2011 model:** weight is stable at energy balance; week-1 loss exceeds the 3,500 rule and
  one-year loss falls short of it; half-life of ~7–18 months; simulated long-run change matches
  the appendix's linearised steady-state formula within 12%; ~1 kg eventual change per
  100 kJ/day; the goal solver lands within 0.05 kg; maintenance intake holds weight within 0.6 kg
  over 6 months.
- **US Navy** metric (density) form agrees with the DoD inch formula within 0.3 percentage points.
- NASEM equations, Schofield W+H (ESPGHAN table), Mifflin-St Jeor and Owen checked numerically.

**Coefficient provenance.** NASEM 2023 coefficients were read from the report's Table S-1/S-2;
Hall model parameters from the Lancet web appendix; Wei σ from the paper's Table 3; Gallagher
equations and tables from the paper; Schofield weight-only from the WHO/FAO/UNU table;
Schofield weight+height from the ESPGHAN 2005 guideline; Kelly FMI classes from the paper's
Table 4. Henry's adult 18–60 y bands were cross-checked against two independent sources; the
≥ 60 y and child bands are transcribed from the paper's MJ/day table and are consistent with the
verified bands, but could not be cross-checked independently.

---

## 12. Limitations

- All equations predict *population averages*; individuals differ by ±10–15%. Tracking real
  weight for 2–4 weeks and adjusting intake beats any equation.
- The dynamic model assumes constant intake and activity and ignores appetite feedback and
  changes in spontaneous activity; real-world adherence dominates outcomes.
- Circumference methods depend on measuring technique (the US Navy method measures men's waist
  at the navel; RFM and the WHO thresholds use the midpoint between rib and hip bone).
- Most equations were derived in white populations; ethnicity adjustments exist for BMI, waist
  and body fat but not for the NASEM energy equations.
- Pregnancy, lactation, eating disorders, diabetes medication and chronic illness are out of scope.

---

## References

The full, clickable reference list (78 sources, grouped by topic) is rendered in the app's
**Sources** tab, generated from `public/js/core/refs.js`. Key sources:

- Frankenfield D, et al. J Am Diet Assoc 2005;105:775-789 — RMR equations systematic review.
- Mifflin MD, St Jeor ST, et al. Am J Clin Nutr 1990;51:241-247.
- O'Neill JER, et al. Sports Med 2023;53:2373-2398 — RMR equations in athletes.
- Henry CJK. Public Health Nutr 2005;8:1133-1152 — Oxford equations.
- National Academies. Dietary Reference Intakes for Energy. 2023. doi:10.17226/26818.
- Hall KD, et al. Lancet 2011;378:826-837 (and web appendix) — dynamic weight-change model.
- Hall KD, et al. Cell Metab 2019;30:67-77 — ultra-processed food, inpatient RCT.
- Tasali E, et al. JAMA Intern Med 2022;182:365-374 — sleep extension and energy intake.
- Nedeltcheva AV, et al. Ann Intern Med 2010;153:435-441 — sleep and the fat/lean split.
- Lichtman SW, et al. N Engl J Med 1992;327:1893-1898 — reported vs actual intake.
- Polidori D, et al. Obesity 2016;24:2289-2295 — appetite feedback.
- Wei R, et al. Ann Hum Biol 2020;47:514-521 — CDC extended BMI method.
- Rubino F, et al. Lancet Diabetes Endocrinol 2025;13:221-262 — clinical obesity.
- Gallagher D, et al. Am J Clin Nutr 2000;72:694-701 — healthy body-fat ranges.
- Woolcott OO, Bergman RN. Sci Rep 2018;8:10980 — Relative Fat Mass.
- Jensen MD, et al. Circulation 2014;129(S2):S102-S138 — AHA/ACC/TOS guideline.
- Hampl SE, et al. Pediatrics 2023;151:e2022060640 — AAP childhood obesity guideline.
- Winter JE, et al. Am J Clin Nutr 2014;99:875-890 — BMI and mortality ≥ 65 y.
