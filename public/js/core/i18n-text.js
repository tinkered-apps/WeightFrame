/* English and Polish text generators for every narrative sentence the calculation engine
 * produces (safety flags, "what to expect" insights, paediatric guidance, BMR/activity
 * descriptions, the adiposity verdict). Each entry is a small function of the same primitive
 * values the engine already computed; no language logic lives in assess.js/anthro.js/energy.js
 * itself, only calls into T.xxx(...). EN is the default T when a caller passes none, so Node
 * tests (which never pass a locale) see exactly this English text, unchanged.
 *
 * Values arriving here are ALREADY formatted by the caller's locale-aware `F` (see format.js):
 * these functions only choose words and word order around them, never reformat numbers. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else { root.FH = root.FH || {}; root.FH.i18nText = factory(); }
})(typeof self !== 'undefined' ? self : this, function () {
  const sexWord = { en: (sex) => (sex === 'female' ? 'women' : 'men'), pl: (sex) => (sex === 'female' ? 'kobiet' : 'mężczyzn') };

  const EN = {
    // ---- energy.js: activity levels, BMR equation choice & summaries -------------------
    activity: {
      inactive: { label: 'Inactive', desc: 'Daily living only; mostly sitting, no regular exercise.' },
      low: { label: 'Low active', desc: 'About 1 h of moderate activity (e.g. brisk walking) on top of daily living.' },
      active: { label: 'Active', desc: 'Roughly 1-2 h of moderate activity or ~1 h including vigorous exercise daily.' },
      veryActive: { label: 'Very active', desc: 'Physically demanding job or 2+ h of daily vigorous training.' },
    },
    bmrSummary: {
      msj: 'Best-validated general-purpose adult equation, including people with obesity.',
      hb: "Historic standard; tends to over-predict in general populations but was unbiased in athletes (O'Neill 2023).",
      hbrs: 'Re-fit of Harris-Benedict coefficients; similar behaviour.',
      owen: 'Weight-only; tends to under-predict.',
      schofield: 'Weight-only, age-banded; basis of many national energy requirements.',
      schofieldWH: 'Recommended by ESPGHAN/ESPEN for children (best agreement with measured values).',
      henry: 'Largest, most ethnically diverse database (10,552 BMRs); adopted by UK SACN 2011. Lower values than Schofield.',
      livingston: 'Power-law of weight; designed to stay accurate across normal-weight and obese adults.',
      cunningham80: 'Fat-free-mass based; the most accurate family of equations in athletes when FFM is measured.',
      katch: 'FFM-based; only as good as the body-fat measurement feeding it.',
    },
    bmrReason: {
      child: 'For children and adolescents ESPGHAN/ESPEN recommend the Schofield weight-and-height equation, which agreed best with measured resting expenditure in healthy children.',
      athleteMeasured: 'Athlete with measured body composition: Cunningham (fat-free-mass based) showed no significant bias against measured RMR in the 2023 athletes meta-analysis, while Mifflin-St Jeor under-predicted.',
      athlete: 'Athlete without measured body composition: original Harris-Benedict was unbiased in athletes in the 2023 meta-analysis, whereas Mifflin-St Jeor tends to under-predict their higher fat-free mass.',
      general: 'Mifflin-St Jeor predicted resting metabolic rate within ±10% of measured values in more non-obese and obese adults than any other common equation, with the narrowest error range (systematic review, Frankenfield 2005; confirmed in later validations).',
      median: "The middle value across the weight-based equations that apply to you (equations that need a body-fat % are excluded, so they can't skew it when one isn't entered) – an estimate that isn't tied to any single study's population, at the cost of not being validated as an equation in its own right.",
    },
    bmrMedianName: () => 'Median of weight-based equations',
    bmrNotes: {
      asian: 'Most adult equations were derived in mainly white populations and tend to over-predict BMR in Asian adults; the Henry (Oxford) equations, built on a more diverse database, give lower estimates.',
      older: 'After about age 60 measured energy expenditure falls faster than size alone predicts (Pontzer 2021); treat estimates as upper-leaning.',
    },

    bmiOlderNote: () => 'For adults 65+, mortality is lowest at a BMI of roughly 23-30 and rises below 23; a BMI in the "overweight" band is not linked to higher mortality at this age (Winter 2014).',
    pregnancyWarning: () => "Pregnancy or breastfeeding changes your energy needs, and weight-loss targets do not apply. BMI classification, body-fat and nutrition targets below are also hidden, because they're derived from and validated on non-pregnant adults. Talk to your midwife or doctor instead.",

    // ---- anthro.js: excess-adiposity verdict -------------------------------------------
    adiposityFlag: { waist: 'waist circumference', whtr: 'waist-to-height ratio', whr: 'waist-to-hip ratio' },
    adiposityJoin(words) {
      if (words.length <= 1) return words[0] || '';
      if (words.length === 2) return words[0] + ' and ' + words[1];
      return words.slice(0, -1).join(', ') + ' and ' + words[words.length - 1];
    },
    adiposity: {
      over40: () => 'BMI ≥ 40: excess adiposity can be assumed without further measurement.',
      measuredConfirmed: () => 'Measured body fat confirms excess adiposity.',
      measuredNotOver: (bmiOver) => 'Measured body fat is not in the excess range' + (bmiOver ? ' – BMI may overstate fatness (e.g. high muscle mass).' : '.'),
      confirmedByFlags: (joined) => 'Raised BMI is supported by ' + joined + '.',
      unknown: () => 'Add a waist measurement to confirm whether the raised BMI reflects excess fat.',
      notConfirmed: () => 'Central measures do not support the raised BMI. It could reflect muscle or frame instead.',
      possible: (joined) => 'BMI is not raised, but ' + joined + ' are. You may have excess fat around your middle.',
      watch: (word) => 'BMI is not raised, but ' + word + ' is above its threshold. Worth watching.',
      noneAnthro: () => 'No sign of excess adiposity from BMI or central measures.',
      noneBmi: () => 'BMI does not suggest excess adiposity.',
    },

    // ---- assess.js: safety flags --------------------------------------------------------
    flags: {
      vlcd: () => 'Below 800 kcal/day is a very-low-calorie diet: use only as part of a clinically supervised programme.',
      belowFloor: (floorStr, sex) => 'This is below ' + floorStr + ', the lower end of guideline weight-loss diets for ' + sexWord.en(sex) + ' (1,200-1,500 kcal women, 1,500-1,800 kcal men). You may find it harder to meet your nutrient needs.',
      gallstoneRisk: (rateStr) => 'Projected loss of ' + rateStr + ' per week after the first fortnight. Losing more than 1.5 kg (3.3 lb) per week raises the risk of gallstones.',
      fastPace: (pctStr) => 'This projects ≈' + pctStr + ' of body weight per week, faster than the usual 0.5-1% (roughly 0.5-1 kg) per week. Faster loss tends to cost more lean mass.',
      alpertCeiling: (deficitStr, maxStr) => 'The starting deficit (' + deficitStr + ') exceeds the theoretical maximum energy your fat stores can release (~' + maxStr + ', 290 kJ per kg fat). Beyond it, the shortfall is covered more by lean tissue.',
      belowBmr: () => 'Planned intake is below your estimated resting metabolic rate. That is common for guideline diets in people with obesity and not dangerous in itself, but protein and micronutrient quality matter more.',
      leanShare: (pct) => 'About ' + pct + '% of the projected loss is lean tissue. Higher protein and resistance training help preserve it.',
      goalUnderweight: (bmiStr) => 'Goal BMI of ' + bmiStr + ' is below 18.5 (underweight).',
      goalLowOlder: () => 'For adults 65+, a BMI below about 23 is associated with higher mortality. Consider a higher goal.',
      isGain: () => 'Your goal is above your current weight, so the plan shows a weight-gain scenario.',
      plateau: (kgStr) => 'At this intake the model predicts weight levelling off around ' + kgStr + ', so the goal is not reached within 3 years.',
      unreachable: (plateauStr, goalStr) => "This goal isn't reachable by your chosen date – not even at the model's most extreme intake. At that pace, the model instead predicts levelling off around " + plateauStr + ', short of ' + goalStr + '. Try a later date, a smaller goal, or set the intake yourself to see where it leads.',
      deadlineExtended: (reqDays, actDays) => 'Your chosen timeframe (' + Math.round(reqDays / 7) + ' weeks) is not reachable at a safe intake. Even pushed to the lowest intake the model will try, reaching the goal actually takes about ' + Math.round(actDays / 7) + ' weeks.',
      bodyFatClamped: (enteredStr, usedStr) => 'The weight-projection model only supports body-fat inputs from 5% to 60%; your ' + enteredStr + ' was capped to ' + usedStr + ' for that calculation only (other results on this page still use what you entered).',
    },

    // ---- assess.js: milestones -----------------------------------------------------------
    milestone: {
      pct5: () => 'Clinically meaningful: lower triglycerides, blood glucose and HbA1c, reduced diabetes risk.',
      pct10: () => 'Larger benefits; in fatty-liver disease, ≥10% loss resolved steatohepatitis in most patients.',
      pctLabel: (pct) => pct + '% of starting weight',
      kg15: () => "In the DiRECT trial, adults with recently diagnosed type 2 diabetes who lost this much (≥15 kg) had an 86% remission rate at 12 months, vs 4% with usual care. That's a trial result in that specific population, not a personal guarantee, and only relevant if you have type 2 diabetes.",
      kgLabel: (kg) => kg + ' kg lost',
      leavesObese3: () => 'Leaves obesity class III',
      leavesObese2: () => 'Leaves obesity class II',
      leavesObeseRange: () => 'Leaves the obesity range',
      reachesHealthy: () => 'Reaches the healthy BMI range',
      bmiSuffix: (bmiT) => ' (BMI < ' + bmiT + ')',
    },

    // ---- assess.js: paediatric guidance ---------------------------------------------------
    pediatric: {
      goalBasisCdc: (pctStr) => 'CDC percentile ' + pctStr,
      goalBasisWho: () => 'WHO percentile',
      underweight: () => 'BMI is below the healthy range. Discuss growth and nutrition with a paediatrician; weight loss is not appropriate.',
      healthyRange: () => 'Healthy range: aim for healthy growth. Keep BMI tracking along its current percentile as height increases.',
      maintainTeen: () => 'Weight maintenance while growing is the usual goal (the BMI percentile falls as height increases); after growth is complete, gradual loss is acceptable.',
      maintainYounger: () => 'Weight maintenance (or slower weight gain) while growing taller, until BMI is below the 85th percentile.',
      under6Severe: () => 'Weight maintenance while growing. If weight loss happens on a healthy diet, keep it gradual: no more than ~0.5 kg (1 lb) per month.',
      under6: () => 'Weight maintenance while growing, until BMI is below the 85th percentile. Any loss should not exceed ~0.5 kg (1 lb) per month.',
      under12Severe: () => 'Gradual weight loss under clinical supervision, not exceeding an average of ~0.9 kg (2 lb) per week.',
      under12: () => 'Weight maintenance while growing, or gradual loss of no more than ~0.5 kg (1 lb) per month.',
      teenSevere: () => 'Gradual weight loss under clinical supervision is appropriate, not exceeding an average of ~0.9 kg (2 lb) per week.',
      treatment: () => 'For children with overweight or obesity, the AAP 2023 guideline recommends family-based intensive health behaviour and lifestyle treatment (≥26 contact hours over 3-12 months) rather than calorie restriction on your own.',
    },

    // ---- assess.js: nutrition ------------------------------------------------------------
    nutrition: {
      proteinRda: () => 'RDA for age (per kg body weight)',
      proteinGoalWeight: () => 'per kg of goal weight (common convention when BMI ≥ 30; needs track lean mass, not fat)',
      proteinCurrentWeight: () => 'per kg of current body weight',
      proteinOlderNote: () => 'PROT-AGE advises at least 1.0-1.2 g/kg for healthy older adults, more with illness.',
      proteinToddlerNote: () => "Secondary sources quote the 2005 IOM figure for this age band (1-3y) inconsistently (1.0-1.1 g/kg depending on the table consulted); 1.05 g/kg is the average of the values found, not one confirmed table cell.",
      activityToddler: () => 'At least 180 minutes a day of varied physical activity at any intensity, spread across the day – more is better. No specific moderate-to-vigorous target applies yet at this age.',
      activityPreschool: () => 'At least 180 minutes a day of varied physical activity, of which at least 60 minutes should be moderate-to-vigorous, spread across the day.',
      activityChild: () => 'An average of 60 minutes a day of moderate-to-vigorous activity, with vigorous and muscle-strengthening activity on at least 3 days a week.',
      activityAdult: () => '150-300 min/week moderate or 75-150 min/week vigorous activity plus muscle-strengthening on 2+ days. For weight-loss maintenance, 200-300 min/week is associated with less regain.',
    },

    // ---- assess.js: "what to expect" insight cards ----------------------------------------
    story: {
      compositionTitle: () => 'What the lost weight is made of',
      compositionValue: (pct) => pct + '% fat',
      compositionText: (totStr, fatStr, leanStr, waterStr) => 'Of the ' + totStr + ' projected, ≈' + fatStr + ' is fat, ' + leanStr + ' lean tissue and ' + waterStr + ' glycogen-bound water and fluid. The lean share is smaller when you start with more body fat (Forbes curve).',
      firstweekTitle: () => 'The fast first week',
      firstweekText: (fatStr) => 'Expect a quick early drop, only ≈' + fatStr + ' of it fat. Most is water, released as glycogen stores shrink and sodium balance shifts. It comes back once you eat more carbohydrate, so do not judge your progress on week one.',
      energyTitle: () => 'Energy from projected fat loss',
      energyValue: (kcalStr) => kcalStr + ' kcal',
      energyText: () => 'Fat mass means stored fat, not the whole adipose tissue. The model uses ≈9,440 kcal per kg of fat mass lost and ≈1,820 kcal per kg of lean mass lost. Their changing mix, plus water, makes energy per kg lost on the scale variable.',
      adaptationTitle: () => 'Your body will spend less energy',
      adaptationValue: (kcalStr) => '−' + kcalStr + ' kcal/day',
      adaptationText: (dropStr, bodyStr, adaptiveStr, tefStr) => 'At goal, daily expenditure is ≈' + dropStr + ' kcal lower than today: ≈' + bodyStr + ' from a smaller body, ≈' + adaptiveStr + ' from adaptive thermogenesis and ≈' + tefStr + ' from digesting less food.',
      appetiteTitle: () => 'Appetite pushes back',
      appetiteValue: () => '≈+100 kcal/day per kg',
      appetiteText: (kgStr, kcalAmount) => 'In a year-long trial that tracked intake without participants noticing their deficit, appetite rose by roughly 100 kcal/day above baseline for every kg (2.2 lb) lost, about three times the drop in expenditure. So after the first ' + kgStr + ', expect to feel pulled towards eating ~' + kcalAmount + ' kcal/day more. (The study covered modest losses; do not extrapolate linearly to very large ones.)',
      maintenanceTitle: () => 'Your new maintenance intake',
      maintenanceValue: (kcalStr) => kcalStr + ' kcal/day',
      maintenanceText: (goalStr, deltaStr, todayStr) => 'To stay at ' + goalStr + ' you will need ≈' + deltaStr + ' kcal/day less than today\'s maintenance (' + todayStr + ' kcal).',
      ruleTitle: () => 'Why "3500 kcal = 1 lb" misleads',
      ruleValue: (sign, weeks) => sign + weeks + ' weeks',
      ruleText: (ruleWeeks, modelWeeks) => 'The static rule predicts reaching goal in ' + ruleWeeks + ' weeks; the dynamic model says ' + modelWeeks + ' weeks, because expenditure falls as you lose weight. For long diets the rule badly over-promises.',
      halflifeTitle: () => 'Weight responds slowly',
      halflifeValue: (months) => '≈' + months + ' months',
      halflifeText: () => 'For any lasting change in intake, about half of the eventual weight change happens within this time and ~95% takes about four times as long. Larger body-fat stores and less activity make the response slower.',
      rangeTitle: () => 'Healthy weight range for your height',
      rangeText: (bmiMin, bmiMax, ethnicNote) => 'Weights matching a BMI of ' + bmiMin + '–' + bmiMax + ethnicNote + '. BMI is a screening tool: waist and body-fat measures tell you more.',
      rangeEthnicNote: () => ' (lower upper limit recommended for your ethnic background)',
    },
  };

  const PL = {
    activity: {
      inactive: { label: 'Mało aktywny', desc: 'Tylko codzienne czynności; głównie siedzenie, bez regularnych ćwiczeń.' },
      low: { label: 'Lekko aktywny', desc: 'Około 1 godz. umiarkowanej aktywności (np. szybki spacer) ponad codzienne czynności.' },
      active: { label: 'Aktywny', desc: 'Około 1-2 godz. umiarkowanej aktywności lub ~1 godz. z intensywnym wysiłkiem dziennie.' },
      veryActive: { label: 'Bardzo aktywny', desc: 'Praca fizyczna lub 2+ godz. intensywnego treningu dziennie.' },
    },
    bmrSummary: {
      msj: 'Najlepiej zwalidowane ogólne równanie dla dorosłych, także przy otyłości.',
      hb: "Historyczny standard; zwykle zawyża wynik w populacji ogólnej, ale był trafny u sportowców (O'Neill 2023).",
      hbrs: 'Ponowne dopasowanie współczynników Harrisa-Benedicta; podobne zachowanie.',
      owen: 'Tylko na podstawie masy ciała; zwykle zaniża wynik.',
      schofield: 'Tylko masa ciała, z przedziałami wiekowymi; podstawa wielu krajowych norm energetycznych.',
      schofieldWH: 'Zalecane przez ESPGHAN/ESPEN dla dzieci (najlepsza zgodność z pomiarami).',
      henry: 'Największa, najbardziej zróżnicowana etnicznie baza danych (10 552 pomiarów PPM); przyjęte przez brytyjski SACN w 2011 r. Niższe wartości niż Schofield.',
      livingston: 'Funkcja potęgowa masy ciała; zaprojektowana pod kątem dokładności zarówno przy prawidłowej masie, jak i otyłości.',
      cunningham80: 'Oparte na beztłuszczowej masie ciała; najdokładniejsza rodzina równań u sportowców, gdy FFM jest znane.',
      katch: 'Oparte na FFM; dokładne tylko na tyle, na ile dokładny jest pomiar tkanki tłuszczowej.',
    },
    bmrReason: {
      child: 'Dla dzieci i młodzieży ESPGHAN/ESPEN zalecają równanie Schofield uwzględniające masę i wzrost, najlepiej zgodne ze zmierzonym spoczynkowym wydatkiem energetycznym u zdrowych dzieci.',
      athleteMeasured: 'Sportowiec ze zmierzonym składem ciała: równanie Cunninghama (oparte na beztłuszczowej masie ciała) nie wykazało istotnego obciążenia względem zmierzonej PPM w metaanalizie sportowców z 2023 r., podczas gdy Mifflin-St Jeor zaniżało wynik.',
      athlete: 'Sportowiec bez zmierzonego składu ciała: oryginalne równanie Harrisa-Benedicta było trafne u sportowców w metaanalizie z 2023 r., podczas gdy Mifflin-St Jeor zwykle zaniża ich wyższą beztłuszczową masę ciała.',
      general: 'Mifflin-St Jeor przewidywało spoczynkową przemianę materii z dokładnością ±10% względem pomiarów u większej liczby osób z prawidłową masą ciała i otyłością niż jakiekolwiek inne popularne równanie, z najwęższym zakresem błędu (przegląd systematyczny, Frankenfield 2005; potwierdzone w późniejszych walidacjach).',
      median: 'Wartość środkowa spośród równań opartych na masie ciała, które Cię dotyczą (równania wymagające % tkanki tłuszczowej są wyłączone, aby nie zniekształcały wyniku, gdy nie podano tej wartości) – oszacowanie niezwiązane z populacją jednego konkretnego badania, kosztem tego, że sama nie jest równaniem zwalidowanym samodzielnie.',
    },
    bmrMedianName: () => 'Mediana równań opartych na masie ciała',
    bmrNotes: {
      asian: 'Większość równań dla dorosłych opracowano głównie w populacjach białych i mają one tendencję do zawyżania PPM u dorosłych pochodzenia azjatyckiego; równania Henry\'ego (Oxford), oparte na bardziej zróżnicowanej bazie danych, dają niższe szacunki.',
      older: 'Po około 60. roku życia zmierzony wydatek energetyczny spada szybciej, niż wynikałoby to samej z wielkości ciała (Pontzer 2021); traktuj szacunki jako raczej zawyżone.',
    },

    bmiOlderNote: () => 'U dorosłych 65+ śmiertelność jest najniższa przy BMI ok. 23-30 i rośnie poniżej 23; kategoria „nadwaga” nie wiąże się w tym wieku z wyższą śmiertelnością (Winter 2014).',
    pregnancyWarning: () => 'Ciąża lub karmienie piersią zmieniają Twoje zapotrzebowanie energetyczne, a cele odchudzania w tym czasie nie mają zastosowania. Poniżej ukryte są też klasyfikacja BMI oraz cele dotyczące tkanki tłuszczowej i odżywiania, ponieważ są wyliczane i zwalidowane dla dorosłych, którzy nie są w ciąży. Porozmawiaj o tym z położną lub lekarzem.',

    adiposityFlag: { waist: 'obwód pasa', whtr: 'stosunek pasa do wzrostu', whr: 'stosunek pasa do bioder' },
    adiposityJoin(words) {
      if (words.length <= 1) return words[0] || '';
      if (words.length === 2) return words[0] + ' i ' + words[1];
      return words.slice(0, -1).join(', ') + ' i ' + words[words.length - 1];
    },
    adiposity: {
      over40: () => 'BMI ≥ 40: nadmiar tkanki tłuszczowej można założyć bez dalszych pomiarów.',
      measuredConfirmed: () => 'Zmierzona zawartość tkanki tłuszczowej potwierdza jej nadmiar.',
      measuredNotOver: (bmiOver) => 'Zmierzona zawartość tkanki tłuszczowej nie mieści się w zakresie nadmiaru' + (bmiOver ? ' – BMI może zawyżać otłuszczenie (np. przy dużej masie mięśniowej).' : '.'),
      confirmedByFlags: (joined) => 'Podwyższone BMI jest potwierdzone przez ' + joined + '.',
      unknown: () => 'Dodaj pomiar obwodu pasa, aby potwierdzić, czy podwyższone BMI odzwierciedla nadmiar tkanki tłuszczowej.',
      notConfirmed: () => 'Miary centralnej otyłości nie potwierdzają podwyższonego BMI. Może ono odzwierciedlać budowę ciała lub masę mięśniową.',
      possible: (joined) => 'BMI nie jest podwyższone, ale ' + joined + ' tak. Możesz mieć nadmiar tłuszczu w okolicy brzucha.',
      watch: (word) => 'BMI nie jest podwyższone, ale ' + word + ' przekracza swój próg. Warto to obserwować.',
      noneAnthro: () => 'Brak oznak nadmiaru tkanki tłuszczowej na podstawie BMI ani miar centralnej otyłości.',
      noneBmi: () => 'BMI nie sugeruje nadmiaru tkanki tłuszczowej.',
    },

    flags: {
      vlcd: () => 'Poniżej 800 kcal/dzień to dieta bardzo niskokaloryczna: stosuj wyłącznie pod nadzorem klinicznym.',
      belowFloor: (floorStr, sex) => 'To poniżej ' + floorStr + ', dolnej granicy zalecanych diet redukcyjnych dla ' + sexWord.pl(sex) + ' (1200-1500 kcal kobiety, 1500-1800 kcal mężczyźni). Trudniej Ci będzie pokryć zapotrzebowanie na składniki odżywcze.',
      gallstoneRisk: (rateStr) => 'Przewidywany ubytek ' + rateStr + ' na tydzień po pierwszych dwóch tygodniach. Utrata ponad 1,5 kg (3,3 funta) tygodniowo zwiększa ryzyko kamicy żółciowej.',
      fastPace: (pctStr) => 'To przewiduje ubytek ≈' + pctStr + ' masy ciała na tydzień, szybciej niż typowe 0,5-1% (mniej więcej 0,5-1 kg) na tydzień. Szybsza utrata masy zwykle kosztuje więcej masy beztłuszczowej.',
      alpertCeiling: (deficitStr, maxStr) => 'Początkowy deficyt (' + deficitStr + ') przekracza teoretyczne maksimum energii, jakie mogą uwolnić zapasy tłuszczu (~' + maxStr + ', 290 kJ na kg tłuszczu). Powyżej tego poziomu brakującą energię pokrywa w większym stopniu masa beztłuszczowa.',
      belowBmr: () => 'Planowana podaż kalorii jest niższa niż szacowana spoczynkowa przemiana materii. To częste w zalecanych dietach przy otyłości i samo w sobie nie jest niebezpieczne, ale tym bardziej liczy się jakość białka i mikroskładników.',
      leanShare: (pct) => 'Około ' + pct + '% przewidywanego ubytku to masa beztłuszczowa. Więcej białka i trening oporowy pomagają ją zachować.',
      goalUnderweight: (bmiStr) => 'Docelowe BMI wynoszące ' + bmiStr + ' jest poniżej 18,5 (niedowaga).',
      goalLowOlder: () => 'U dorosłych 65+ BMI poniżej ok. 23 wiąże się z wyższą śmiertelnością. Rozważ wyższy cel.',
      isGain: () => 'Twój cel jest wyższy niż obecna masa ciała, więc plan przedstawia scenariusz przyrostu masy.',
      plateau: (kgStr) => 'Przy tej podaży kalorii model przewiduje ustabilizowanie masy ciała w okolicach ' + kgStr + ', więc cel nie zostanie osiągnięty w ciągu 3 lat.',
      unreachable: (plateauStr, goalStr) => 'Ten cel nie jest osiągalny w wybranym terminie – nawet przy najbardziej skrajnej podaży kalorii, jaką dopuszcza model. Przy tym tempie model przewiduje ustabilizowanie się w okolicach ' + plateauStr + ', czyli poniżej celu ' + goalStr + '. Wybierz późniejszy termin, mniejszy cel albo ustaw podaż kalorii samodzielnie, aby zobaczyć, dokąd prowadzi.',
      deadlineExtended: (reqDays, actDays) => 'Wybrany termin (' + Math.round(reqDays / 7) + ' tyg.) nie jest osiągalny przy bezpiecznej podaży kalorii. Nawet przy najniższej podaży, jaką próbuje model, osiągnięcie celu zajmuje faktycznie około ' + Math.round(actDays / 7) + ' tyg.',
      bodyFatClamped: (enteredStr, usedStr) => 'Model prognozy masy ciała obsługuje tylko zawartość tkanki tłuszczowej w zakresie 5-60%; Twoje ' + enteredStr + ' zostało ograniczone do ' + usedStr + ' wyłącznie na potrzeby tego obliczenia (pozostałe wyniki na tej stronie nadal używają podanej przez Ciebie wartości).',
    },

    milestone: {
      pct5: () => 'Klinicznie istotne: niższe trójglicerydy, glukoza we krwi i HbA1c, mniejsze ryzyko cukrzycy.',
      pct10: () => 'Większe korzyści; przy stłuszczeniu wątroby utrata ≥10% masy ciała cofnęła stłuszczeniowe zapalenie wątroby u większości pacjentów.',
      pctLabel: (pct) => pct + '% masy początkowej',
      kg15: () => 'W badaniu DiRECT dorośli ze świeżo rozpoznaną cukrzycą typu 2, którzy stracili tyle (≥15 kg), mieli 86% remisji po 12 miesiącach, wobec 4% przy standardowej opiece. To wynik badania w tej konkretnej populacji, a nie osobista gwarancja, i ma znaczenie tylko przy cukrzycy typu 2.',
      kgLabel: (kg) => 'utrata ' + kg + ' kg',
      leavesObese3: () => 'Wyjście z otyłości III stopnia',
      leavesObese2: () => 'Wyjście z otyłości II stopnia',
      leavesObeseRange: () => 'Wyjście z zakresu otyłości',
      reachesHealthy: () => 'Osiągnięcie prawidłowego zakresu BMI',
      bmiSuffix: (bmiT) => ' (BMI < ' + bmiT + ')',
    },

    pediatric: {
      goalBasisCdc: (pctStr) => 'percentyl CDC ' + pctStr,
      goalBasisWho: () => 'percentyl WHO',
      underweight: () => 'BMI jest poniżej zdrowego zakresu. Omów wzrastanie i sposób odżywiania z pediatrą; odchudzanie nie jest tu wskazane.',
      healthyRange: () => 'Zakres prawidłowy: celem jest zdrowy wzrost. Warto utrzymać BMI na obecnym percentylu w miarę wzrastania dziecka.',
      maintainTeen: () => 'Utrzymanie masy ciała w trakcie wzrastania to zwykle właściwy cel (percentyl BMI spada wraz ze wzrostem wzrostu); po zakończeniu wzrastania stopniowa redukcja jest dopuszczalna.',
      maintainYounger: () => 'Utrzymanie masy ciała (lub wolniejszy przyrost) w miarę wzrastania, aż BMI spadnie poniżej 85. percentyla.',
      under6Severe: () => 'Utrzymanie masy ciała w trakcie wzrastania. Jeśli w ramach zdrowej diety dojdzie do utraty masy, niech będzie stopniowa: nie więcej niż ~0,5 kg miesięcznie.',
      under6: () => 'Utrzymanie masy ciała w trakcie wzrastania, aż BMI spadnie poniżej 85. percentyla. Ewentualny ubytek nie powinien przekraczać ~0,5 kg miesięcznie.',
      under12Severe: () => 'Stopniowe odchudzanie pod nadzorem klinicznym, nieprzekraczające średnio ~0,9 kg (2 funty) tygodniowo.',
      under12: () => 'Utrzymanie masy ciała w trakcie wzrastania lub stopniowa redukcja nie większa niż ~0,5 kg miesięcznie.',
      teenSevere: () => 'Stopniowe odchudzanie pod nadzorem klinicznym jest wskazane, nieprzekraczające średnio ~0,9 kg (2 funty) tygodniowo.',
      treatment: () => 'Dla dzieci z nadwagą lub otyłością wytyczne AAP z 2023 r. zalecają rodzinną, intensywną terapię behawioralną dotyczącą zdrowia i stylu życia (≥26 godzin kontaktu w ciągu 3-12 miesięcy), a nie samodzielne ograniczanie kalorii.',
    },

    nutrition: {
      proteinRda: () => 'zalecana norma dla wieku (na kg masy ciała)',
      proteinGoalWeight: () => 'na kg docelowej masy ciała (typowa konwencja przy BMI ≥ 30; trzeba śledzić masę beztłuszczową, nie tłuszczową)',
      proteinCurrentWeight: () => 'na kg obecnej masy ciała',
      proteinOlderNote: () => 'PROT-AGE zaleca co najmniej 1,0-1,2 g/kg dla zdrowych starszych dorosłych, więcej w chorobie.',
      proteinToddlerNote: () => 'Źródła wtórne podają wartość IOM z 2005 r. dla tego przedziału wieku (1-3 lata) niespójnie (1,0-1,1 g/kg, zależnie od konsultowanej tabeli); 1,05 g/kg to średnia z odnalezionych wartości, a nie odczyt z jednej potwierdzonej komórki tabeli.',
      activityToddler: () => 'Co najmniej 180 minut dziennie zróżnicowanej aktywności fizycznej o dowolnej intensywności, rozłożonej w ciągu dnia – im więcej, tym lepiej. W tym wieku nie obowiązuje jeszcze konkretny próg aktywności umiarkowanej do dużej intensywności.',
      activityPreschool: () => 'Co najmniej 180 minut dziennie zróżnicowanej aktywności fizycznej, z czego co najmniej 60 minut powinno mieć umiarkowaną do dużej intensywność, rozłożonej w ciągu dnia.',
      activityChild: () => 'Średnio 60 minut dziennie aktywności o umiarkowanej do dużej intensywności, w tym intensywny wysiłek i ćwiczenia wzmacniające mięśnie co najmniej 3 dni w tygodniu.',
      activityAdult: () => '150-300 min/tydzień umiarkowanej lub 75-150 min/tydzień intensywnej aktywności plus ćwiczenia wzmacniające mięśnie w 2+ dni. Dla utrzymania efektu odchudzania 200-300 min/tydzień wiąże się z mniejszym nawrotem masy.',
    },

    story: {
      compositionTitle: () => 'Z czego składa się utracona masa',
      compositionValue: (pct) => pct + '% tłuszczu',
      compositionText: (totStr, fatStr, leanStr, waterStr) => 'Z przewidywanych ' + totStr + ' to ≈' + fatStr + ' tłuszczu, ' + leanStr + ' masy beztłuszczowej i ' + waterStr + ' wody związanej z glikogenem i płynów. Udział masy beztłuszczowej jest mniejszy, gdy zaczynasz z wyższą zawartością tłuszczu (krzywa Forbesa).',
      firstweekTitle: () => 'Szybki pierwszy tydzień',
      firstweekText: (fatStr) => 'Spodziewaj się szybkiego początkowego spadku, z czego tylko ≈' + fatStr + ' to tłuszcz. Reszta to woda, uwalniana wraz z kurczeniem się zapasów glikogenu i zmianami bilansu sodu. Wraca, gdy zjesz więcej węglowodanów, więc nie oceniaj postępów po pierwszym tygodniu.',
      energyTitle: () => 'Energia związana z utratą masy tłuszczu',
      energyValue: (kcalStr) => kcalStr + ' kcal',
      energyText: () => 'Masa tłuszczu oznacza zapas tłuszczu, a nie całą tkankę tłuszczową. Model przyjmuje około 9440 kcal na kg utraconej masy tłuszczu i około 1820 kcal na kg utraconej masy beztłuszczowej. Ich zmienne proporcje oraz woda sprawiają, że kilogram utraconej masy ciała nie ma stałej wartości energetycznej.',
      adaptationTitle: () => 'Twoje ciało będzie zużywać mniej energii',
      adaptationValue: (kcalStr) => '−' + kcalStr + ' kcal/dzień',
      adaptationText: (dropStr, bodyStr, adaptiveStr, tefStr) => 'Przy osiągnięciu celu dzienny wydatek energetyczny jest ≈' + dropStr + ' kcal niższy niż dziś: ≈' + bodyStr + ' z powodu mniejszego ciała, ≈' + adaptiveStr + ' z adaptacyjnej termogenezy i ≈' + tefStr + ' z trawienia mniejszej ilości pokarmu.',
      appetiteTitle: () => 'Apetyt działa w drugą stronę',
      appetiteValue: () => '≈+100 kcal/dzień na kg',
      appetiteText: (kgStr, kcalAmount) => 'W rocznym badaniu, które śledziło spożycie kalorii bez wiedzy uczestników o deficycie, apetyt rósł o mniej więcej 100 kcal/dzień ponad wartość wyjściową na każdy utracony kg, czyli około trzy razy więcej niż spadek wydatku energetycznego. Po utracie pierwszych ' + kgStr + ' spodziewaj się więc chęci zjedzenia ~' + kcalAmount + ' kcal/dzień więcej. (Badanie dotyczyło umiarkowanych ubytków masy; nie ekstrapoluj tego liniowo na bardzo duże.)',
      maintenanceTitle: () => 'Twoja nowa podaż utrzymująca masę ciała',
      maintenanceValue: (kcalStr) => kcalStr + ' kcal/dzień',
      maintenanceText: (goalStr, deltaStr, todayStr) => 'Aby utrzymać ' + goalStr + ', będziesz potrzebować ≈' + deltaStr + ' kcal/dzień mniej niż dzisiejsza podaż utrzymująca (' + todayStr + ' kcal).',
      ruleTitle: () => 'Dlaczego reguła „3500 kcal = 1 funt” myli',
      ruleValue: (sign, weeks) => sign + weeks + ' tyg.',
      ruleText: (ruleWeeks, modelWeeks) => 'Statyczna reguła przewiduje osiągnięcie celu w ' + ruleWeeks + ' tyg.; model dynamiczny mówi o ' + modelWeeks + ' tyg., ponieważ wydatek energetyczny spada wraz z utratą masy. Przy długich dietach reguła znacząco zawyża obietnicę.',
      halflifeTitle: () => 'Masa ciała reaguje powoli',
      halflifeValue: (months) => '≈' + months + ' mies.',
      halflifeText: () => 'Przy każdej trwałej zmianie podaży kalorii około połowa docelowej zmiany masy ciała następuje w tym czasie, a ~95% zajmuje mniej więcej cztery razy dłużej. Większe zapasy tłuszczu i mniejsza aktywność spowalniają tę reakcję.',
      rangeTitle: () => 'Prawidłowy zakres masy ciała dla Twojego wzrostu',
      rangeText: (bmiMin, bmiMax, ethnicNote) => 'Masy odpowiadające BMI ' + bmiMin + '–' + bmiMax + ethnicNote + '. BMI to narzędzie przesiewowe: obwód pasa i pomiar tkanki tłuszczowej mówią więcej.',
      rangeEthnicNote: () => ' (niższa górna granica zalecana dla Twojego pochodzenia etnicznego)',
    },
  };

  const T = { en: EN, pl: PL };
  function get(locale) { return T[locale] || EN; }
  return { EN, PL, get };
});
