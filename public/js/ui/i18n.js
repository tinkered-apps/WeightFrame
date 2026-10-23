/* UI-layer translation. Two mechanisms:
 *  - `hero.*` / `chrome.*` functions: a handful of sentences with several interpolated
 *    values and language-dependent word order/grammar (hero headline, growth-chart headline)
 *    get a real PL function, called directly by board.js, same pattern as core/i18n-text.js.
 *  - Everything else (card titles, dt/dd labels, table headers, one-off static sentences,
 *    classification labels like "Overweight"): a flat dictionary of English source string ->
 *    Polish string. board.js/methods.js build their HTML in English as before (unchanged), and
 *    `FH.i18n.apply(html)` does one ordered-by-length find/replace pass over the *rendered*
 *    string right before it reaches the page. Numbers, dates and engine-generated sentences
 *    (already localized via i18n-text.js) are never dictionary keys, so they pass through
 *    untouched. <div class="formula"> blocks (equations) are left in their original notation
 *    in both languages, as is conventional for mathematical/technical text. */
(function (root) {
  const FH = root.FH = root.FH || {};
  let locale = 'en';

  /* ---- Flat phrase dictionary (English source -> Polish) ------------------------------ */
  const PL = {
    // Masthead / tabs
    'Weight & energy, grounded in science.': 'Masa ciała i energia oparte na wiedzy naukowej.',
    'Dashboard': 'Panel',
    'Methods': 'Metody',
    'Sources': 'Źródła',
    'Skip to results': 'Przejdź do wyników',
    'WeightFrame gives population-based estimates for education, not medical advice or a diagnosis.': 'WeightFrame podaje szacunki populacyjne w celach edukacyjnych, a nie poradę medyczną ani rozpoznanie.',
    'Privacy': 'Prywatność',
    'Estimates for information only, not medical advice.': 'Szacunki wyłącznie informacyjne, nie porada medyczna.',
    'An estimate from population equations, not medical advice. Talk to a doctor before a large change, or if you have a health condition or take medication.':
      'Szacunek z równań populacyjnych, nie porada medyczna. Porozmawiaj z lekarzem przed dużą zmianą albo jeśli chorujesz lub przyjmujesz leki.',

    // Form: You
    'Sex': 'Płeć',
    'Female': 'Kobieta',
    'Male': 'Mężczyzna',
    'Age': 'Wiek',
    // 'yr'/'mo' are also in EXACT_ONLY below: too short to be a safe substring key (they'd
    // match inside "months"/"model"/"thermogenesis"...) but still needed for exact data-i18n
    // lookup, and t()'s EN fallback relies on the key itself being the real English text.
    'yr': 'lat',
    'mo': 'mies.',
    'Height': 'Wzrost',
    'Weight': 'Waga',
    'Ethnic background': 'Pochodzenie etniczne',
    'Daily activity': 'Codzienna aktywność',
    // Activity button labels (energy.js ACTIVITY.label - the .desc hint text is separately
    // translated via i18n-text.js since it's threaded through the engine's T bundle).
    'Inactive': 'Mało aktywny',
    'Low active': 'Lekko aktywny',
    'Active': 'Aktywny',
    'Very active': 'Bardzo aktywny',
    'Pregnant or breastfeeding': 'Ciąża lub karmienie piersią',
    'White / European': 'Europejskie (białe)',
    'South Asian': 'Południowoazjatyckie',
    'Chinese / East or Southeast Asian': 'Chińskie / wschodnio- lub południowo-wschodnioazjatyckie',
    'Black African / African-Caribbean': 'Afrykańskie (czarnoskóre) / afrokaraibskie',
    'Middle Eastern': 'Bliskowschodnie',
    'Latino / Latin American': 'Latynoamerykańskie',
    'Other / Prefer not to say': 'Inne / wolę nie podawać',

    // Form: Measurements
    'Measurements': 'Pomiary',
    'optional · sharper results': 'opcjonalnie · dokładniejsze wyniki',
    'Measure on bare skin, relaxed, after breathing out. Waist: midway between the lowest rib and hip bone (this is the site used for waist-risk, waist-to-height and waist-to-hip results). Hip: widest point. Neck: just below the larynx. The US Navy body-fat method wants a different waist site (men: at the navel; women: narrowest point) – see its note below if you use it, since the same number feeds both.':
      'Mierz na gołej skórze, w rozluźnionej pozycji, po wydechu. Obwód pasa: w połowie odległości między najniższym żebrem a kością biodrową (w tym miejscu wykonuje się pomiar do oceny ryzyka związanego z obwodem pasa, stosunku obwodu pasa do wzrostu i stosunku obwodu pasa do obwodu bioder). Obwód bioder: w najszerszym miejscu. Obwód szyi: tuż poniżej krtani. Metoda US Navy wymaga pomiaru pasa w innym miejscu (mężczyźni: na wysokości pępka; kobiety: w najwęższym miejscu talii). Jeśli z niej korzystasz, przeczytaj poniższą uwagę, bo ten sam wynik służy do obu obliczeń.',
    'Waist': 'Pas',
    'Hip': 'Biodra',
    'Neck': 'Szyja',
    'Measured body fat': 'Zmierzona zawartość tkanki tłuszczowej',
    'Athlete equations': 'Równania dla sportowców',

    // Form: Goal
    'Goal': 'Cel',
    'Goal weight': 'Masa docelowa',
    'How to get there': 'Jak osiągnąć cel',
    'Gentle': 'Łagodnie',
    'Moderate': 'Umiarkowanie',
    'Faster': 'Szybciej',
    'By a date': 'Do daty',
    'Set my intake': 'Ustaw kcal',
    'Weeks to goal': 'Tygodni do celu',
    'Daily intake': 'Dzienne spożycie kalorii',
    'Extra exercise': 'Dodatkowy ruch',

    // Form: growth chart
    'Growth chart': 'Siatka centylowa',
    'CDC (US)': 'CDC (USA)',
    'WHO (international)': 'WHO (międzynarodowa)',

    'Sample': 'Przykład',
    'Clear': 'Wyczyść',
    'Share': 'Udostępnij',
    'Load reference profile': 'Wczytaj profil przykładowy',
    'Clear inputs': 'Wyczyść dane',
    'Copy shareable link': 'Kopiuj link do udostępnienia',
    'Link copied!': 'Link skopiowany!',
    'Copy failed': 'Nie udało się skopiować',

    // Board nav / section heads
    'Overview': 'Przegląd',
    'Plan': 'Plan',
    'Body & risk': 'Sylwetka i ryzyko',
    'Nutrition': 'Odżywianie',
    'Insights': 'Wnioski',
    'Guidance': 'Wskazówki',
    'Body shape': 'Sylwetka',
    'Nutrition & activity': 'Odżywianie i aktywność',
    'What the guidelines recommend': 'Co zalecają wytyczne',
    'paediatrics': 'pediatria',

    // Hero (adult) - static fragments around interpolated values
    'Energy balance': 'Bilans energetyczny',
    'Your projection · starts today': 'Twoja prognoza · zaczyna się dziś',
    'Weight-loss planning is switched off. ': 'Planowanie redukcji masy ciała jest wyłączone. ',
    'Your goal matches your current weight, so this is a maintenance projection. Change the goal weight to plan a loss.':
      'Twój cel odpowiada obecnej wadze, więc to prognoza utrzymania masy ciała. Zmień docelową wagę, aby zaplanować redukcję.',
    'Expenditure falls as weight falls, so a fixed intake always ends in a plateau. Lower the intake, add activity, or pick a date instead.':
      'Wydatek energetyczny spada wraz ze spadkiem masy ciała, więc przy stałym spożyciu kalorii waga z czasem się stabilizuje. Zmniejsz spożycie, dodaj aktywność albo zamiast tego wybierz datę.',
    'Projection from the NIH dynamic model.': 'Prognoza z dynamicznego modelu NIH.',
    'switch to maintenance': 'przejście na utrzymanie wagi',
    'water &amp; glycogen refill': 'uzupełnienie wody i glikogenu',
    'goal': 'cel',
    'Dynamic model (NIH / Hall 2011)': 'Model dynamiczny (NIH / Hall 2011)',
    'Forecast': 'Prognoza',
    '“3,500 kcal = 1 lb” rule': 'reguła „3500 kcal = 1 funt”',
    '“7,700 kcal = 1 kg” rule': 'reguła „7700 kcal = 1 kg”',
    'Healthy BMI range': 'Prawidłowy zakres BMI',
    'You today': 'Ty dzisiaj',
    // charts.js: growth chart legend/axis
    'CDC percentile curves': 'Krzywe percentylowe CDC',
    'WHO z-score curves': 'Krzywe z-score WHO',
    'Healthy range': 'Prawidłowy zakres',
    'Severe obesity threshold (120% of 95th)': 'Próg ciężkiej otyłości (120% wartości 95. percentyla)',
    // anthro.js bodyFatClass() labels
    'Below healthy range': 'Poniżej prawidłowego zakresu',
    'Above healthy (≈ overweight)': 'Powyżej prawidłowego zakresu (≈ nadwaga)',
    'Obesity range': 'Zakres otyłości',
    'Your child': 'Twoje dziecko',
    'age, years': 'wiek (lata)',
    'median': 'mediana',
    // charts.js: trajectory hover tooltip (built live on pointer move, translated eagerly too)
    'week ': 'tydz. ',
    'Model: ': 'Model: ',
    '7,700 kcal/kg rule: ': 'reguła 7700 kcal/kg: ',
    '3,500 kcal/lb rule: ': 'reguła 3500 kcal/funt: ',
    'Fat ': 'Tłuszcz ',
    ' · lean ': ' · beztłuszczowa ',
    ' · water ': ' · woda ',
    'Intake ': 'Spożycie ',
    ' · burning ': ' · spalanie ',
    ' kcal/day': ' kcal/dzień',
    // Bare form: readout() puts the unit in its own <small> tag with no surrounding space.
    'kcal/day': 'kcal/dzień',

    // Readouts
    'BMI': 'BMI',
    'Maintenance': 'Utrzymanie',
    'Likely range ': 'Prawdopodobny zakres ',
    'Resting burn': 'PPM',
    'Body fat': 'Tkanka tłuszczowa',
    'Measured': 'Zmierzone',
    'Estimated from your measurements': 'Oszacowane z Twoich pomiarów',
    'Estimated from BMI, age & sex': 'Oszacowane z BMI, wieku i płci',
    'Add waist and neck for an estimate': 'Dodaj pomiary pasa i szyi, aby uzyskać oszacowanie',

    // Consolidated warnings/notices (hero card)
    'Worth knowing': 'Warto wiedzieć',

    // readout() "?" hint button aria-label suffix
    ' – more info': ' – więcej informacji',

    // "?" hint tooltips on the plan KPI tiles (exact-match via i18n.t(), read from the
    // untranslated data-tip attribute - see the "?" hint shielding note in apply() below).
    "Computed by the NIH dynamic model (Hall 2011), which adjusts for your body's slowing metabolism as you lose weight – not a fixed 7,700 kcal-per-kilogram rule.":
      'Obliczone za pomocą dynamicznego modelu NIH (Hall 2011), który uwzględnia spowolnienie przemiany materii w miarę utraty masy ciała, a nie stałą regułę kalorii na kilogram.',
    "Computed by the NIH dynamic model (Hall 2011), which adjusts for your body's slowing metabolism as you lose weight – not a fixed 3,500 kcal-per-pound rule.":
      'Obliczone za pomocą dynamicznego modelu NIH (Hall 2011), który uwzględnia spowolnienie przemiany materii w miarę utraty masy ciała, a nie stałą regułę kalorii na funt.',
    "The gap between today's maintenance and your planned intake. The model narrows this gap on its own as your body adapts, even at a constant intake.":
      'Różnica między dzisiejszym zapotrzebowaniem na utrzymanie masy ciała a planowanym spożyciem kalorii. Model sam ją zmniejsza w miarę adaptacji organizmu, nawet przy stałym spożyciu.',
    'From the National Academies 2023 equation, fitted to about 6,500 doubly labeled-water measurements – the gold-standard method for free-living energy expenditure.':
      'Na podstawie równania National Academies z 2023 r., dopasowanego do około 6500 pomiarów metodą podwójnie znakowanej wody, uznawaną za złoty standard pomiaru wydatku energetycznego w codziennym życiu.',
    'Guideline diets stay under about 1% of body weight a week. Faster loss raises the risk of gallstones and losing lean tissue along with fat.':
      'Zalecane diety zakładają zwykle tempo utraty masy ciała nieprzekraczające około 1% tygodniowo. Szybsza utrata zwiększa ryzyko kamicy żółciowej i utraty masy beztłuszczowej wraz z tłuszczem.',
    "Lower than today's maintenance because a lighter body burns less energy – from the same NIH dynamic model (Hall 2011) used for your projection.":
      'Niższe od dzisiejszego zapotrzebowania na utrzymanie masy ciała, ponieważ lżejszy organizm zużywa mniej energii. To ten sam dynamiczny model NIH (Hall 2011), który wykorzystano do prognozy.',
    'Why this equation?': 'Dlaczego to równanie?',
    'The ±1 RMSE spread is expected to bracket about two-thirds of people with your profile, based on the 2023 equations fitted to ~6,500 doubly labeled-water measurements – the gold-standard method for free-living expenditure.':
      'Zakres ±1 RMSE powinien obejmować około dwie trzecie osób o Twoim profilu. Opiera się na równaniach z 2023 r. dopasowanych do około 6500 pomiarów metodą podwójnie znakowanej wody, uznawaną za złoty standard pomiaru wydatku energetycznego w codziennym życiu.',
    'An independent estimate – resting metabolic rate times an activity multiplier (PAL) – as a sanity check against the equation above.':
      'Niezależne oszacowanie, czyli spoczynkowa przemiana materii pomnożona przez mnożnik aktywności (PAL), służące do sprawdzenia powyższego równania.',
    'Physical Activity Level: total expenditure ÷ resting metabolic rate. Free-living adults are rarely below about 1.4; the old “sedentary ×1.2” multiplier undersells almost everyone.':
      'Poziom aktywności fizycznej: całkowity wydatek energetyczny ÷ spoczynkowa przemiana materii. U dorosłych żyjących w warunkach codziennych rzadko spada poniżej około 1,4; stary mnożnik 1,2 dla „siedzącego trybu życia” zaniża wynik u niemal każdej osoby.',

    // Resting-metabolism model chooser (form) + its detail panel (formerly "Energy card")
    'Resting metabolism model': 'Model spoczynkowej przemiany materii',
    'Auto (evidence-based choice)': 'Automatycznie (wybór oparty na badaniach)',
    'Median of weight-based equations': 'Mediana równań opartych na masie ciała',
    'What you burn': 'Ile spalasz',
    'median of weight-based equations': 'mediana równań opartych na masie ciała',
    'equation used': 'użyte równanie',
    "Resting metabolic rate (BMR/RMR) is the energy your body uses at complete rest, about 60–70% of the day's total.":
      'Spoczynkowa przemiana materii (PPM) to energia, jaką organizm zużywa w całkowitym spoczynku, stanowiąca około 60–70% całkowitego dziennego wydatku energetycznego.',
    '* uses fat-free mass estimated from your measurements; enter a measured body-fat % to rely on it.':
      '* wykorzystuje masę beztłuszczową oszacowaną na podstawie Twoich pomiarów; wpisz zmierzoną zawartość tkanki tłuszczowej, aby model mógł użyć tego wyniku.',
    'Using ': 'Zastosowano: ',
    'Total daily expenditure': 'Całkowity dzienny wydatek energetyczny',
    'Typical error': 'Typowy błąd',
    'Cross-check': 'Sprawdzenie',
    'BMR × PAL ': 'PPM × PAL ',
    'Implied PAL': 'Wynikowy PAL',
    'Physical Activity Level': 'Poziom aktywności fizycznej',
    'All equations, with sources': 'Wszystkie równania i ich źródła',
    'Equation': 'Równanie',
    'When it fits': 'Kiedy stosować',
    ' Needs body-fat %.': ' Wymaga podanej zawartości tkanki tłuszczowej.',

    // Deficit-scenario panel (formerly "Plan card")
    'Starting deficit': 'Deficyt startowy',
    'Time to goal': 'Czas do celu',
    'Average pace': 'Średnie tempo',
    '/week': '/tydzień',
    'Maintenance after goal': 'Utrzymanie po osiągnięciu celu',
    '· your plan': '· Twój plan',
    'What different deficits do': 'Jak działają różne deficyty',
    'Same model, constant intake from today. Guideline diets use a 500–750 kcal/day deficit. ':
      'Ten sam model i stałe spożycie kalorii od dziś. Zalecane diety zakładają deficyt 500–750 kcal dziennie. ',
    'Deficit': 'Deficyt',
    'Intake': 'Spożycie',
    '12 wk': '12 tyg.',
    '26 wk': '26 tyg.',
    '1 year': '1 rok',
    'Weights in ': 'Masa ciała w ',
    '. “—” means the goal is not reached within a year.': '. „—” oznacza, że cel nie zostanie osiągnięty w ciągu roku.',

    // Body composition & risk card (merged BMI + body composition)
    'Body composition & risk': 'Skład ciała i ryzyko',
    'healthy range for your age & sex': 'prawidłowy zakres dla Twojego wieku i płci',
    'healthy range for your age &amp; sex': 'prawidłowy zakres dla Twojego wieku i płci',
    'best estimate': 'najlepsze oszacowanie',
    'your measurement': 'Twój pomiar',
    'Your measurement': 'Twój pomiar',
    'Methods: ': 'Metody: ',
    '. Healthy band: ': '. Prawidłowy zakres: ',
    'Add waist (and neck; women also hip) under <b>Measurements</b>: circumference methods beat BMI-only formulas.':
      'Dodaj pomiar pasa (oraz szyi; kobiety także bioder) w sekcji <b>Pomiary</b>: metody oparte na obwodach są dokładniejsze od formuł korzystających wyłącznie z BMI.',
    'Fat mass': 'Masa tłuszczu',
    'Fat-free mass': 'Masa beztłuszczowa',
    'Muscle, organs, bone, water': 'Mięśnie, narządy, kości, woda',
    'Fat mass index': 'Wskaźnik masy tłuszczowej',
    'Fat-free mass index': 'Wskaźnik masy beztłuszczowej',
    'Fat-free mass index (height-normalized) rarely exceeds ~25 in drug-free men.':
      'Wskaźnik masy beztłuszczowej (znormalizowany względem wzrostu) rzadko przekracza ~25 u mężczyzn nieprzyjmujących środków dopingujących.',
    'Not enough data.': 'Za mało danych.',
    // Body-fat estimator names/notes (anthro.js ESTIMATORS, static regardless of locale)
    'US Navy (circumferences)': 'US Navy (obwody)',
    'Relative Fat Mass (height/waist)': 'Relative Fat Mass (wzrost/pas)',
    // Bare form (board.js strips the parenthetical for chart labels/the Methods: line) - stays
    // English like the other estimator names, but needs its own entry so the generic 'Fat' key
    // below doesn't partially match inside it.
    'Relative Fat Mass': 'Relative Fat Mass',
    'CUN-BAE (BMI, age, sex)': 'CUN-BAE (BMI, wiek, płeć)',
    'Gallagher (BMI, age, sex, ethnicity)': 'Gallagher (BMI, wiek, płeć, pochodzenie)',
    'Deurenberg (BMI, age, sex)': 'Deurenberg (BMI, wiek, płeć)',
    'Needs neck and waist (women also hip). Men: waist at navel; women: narrowest waist.':
      'Wymaga pomiaru szyi i pasa (u kobiet także bioder). U mężczyzn pas mierzy się na wysokości pępka, a u kobiet w najwęższym miejscu talii.',
    'Validated against DXA in NHANES; RFMp variant for 8-14 years.': 'Sprawdzona względem DXA w badaniu NHANES; wariant RFMp dla osób w wieku 8–14 lat.',
    'Derived against air-displacement plethysmography in 6,510 white adults.': 'Opracowane na podstawie pletyzmografii powietrznej u 6510 dorosłych rasy białej.',
    '4-compartment reference; separate equations for Asian adults. Derived in adults with BMI ≤ 35.':
      'Model referencyjny z czterema przedziałami; osobne równania dla dorosłych pochodzenia azjatyckiego. Opracowany u dorosłych z BMI ≤ 35.',
    "Oldest BMI-based formula; has a separate children's version (7-15 y).": 'Najstarsza formuła oparta na BMI; ma osobną wersję dla dzieci w wieku 7–15 lat.',
    // Fat-mass-index classes (anthro.js fmiClass)
    'Underfat': 'Niedobór tłuszczu',
    'Normal': 'Prawidłowy',
    'Excess fat': 'Nadmiar tłuszczu',
    'Obese class I': 'Otyłość I stopnia',
    'Obese class II': 'Otyłość II stopnia',
    'Obese class III': 'Otyłość III stopnia',

    // Central fat measures (now part of Body composition & risk)
    'Underweight': 'Niedowaga',
    'Healthy': 'Prawidłowa',
    'Overweight': 'Nadwaga',
    'Obesity I': 'Otyłość I',
    'Obesity II': 'Otyłość II',
    'Obesity III': 'Otyłość III',
    'BMI screens weight for height; central fat measures add the risk that BMI misses. ':
      'BMI służy do przesiewowej oceny masy ciała względem wzrostu, a pomiary tłuszczu brzusznego pokazują dodatkowe ryzyko, którego samo BMI nie wykrywa. ',
    'Lower BMI thresholds apply for your ethnic background.': 'Dla Twojego pochodzenia etnicznego obowiązują niższe progi BMI.',
    'Waist ÷ height': 'Pas ÷ wzrost',
    'Waist ÷ hip': 'Pas ÷ biodra',
    'Waist ÷ height, adults': 'Pas ÷ wzrost, dorośli',
    'Waist ÷ height, children (5+)': 'Pas ÷ wzrost, dzieci (5+)',
    '0.40–0.49 healthy · 0.50–0.59 increased · ≥ 0.60 high': '0,40–0,49 prawidłowy · 0,50–0,59 zwiększony · ≥ 0,60 wysoki',
    '≥ 0.5 raised': '≥ 0,5 podwyższony',
    '≥ 0.90 substantially increased': '≥ 0,90 znacznie zwiększone',
    '≥ 0.85 substantially increased': '≥ 0,85 znacznie zwiększone',
    ', European background': ', pochodzenie europejskie',
    ', Asian / Latin American': ', pochodzenie azjatyckie / latynoamerykańskie',
    'Add your waist (and hip) under <b>Measurements</b> to see central-fat risk.':
      'Dodaj pomiar obwodu pasa (i bioder) w sekcji <b>Pomiary</b>, aby zobaczyć ryzyko związane z tłuszczem brzusznym.',
    'Excess body fat?': 'Nadmiar tkanki tłuszczowej?',
    'The 2025 Lancet Commission on clinical obesity asks for BMI to be confirmed by a waist-based measure or body-fat measurement before calling it obesity.':
      'Komisja Lancet ds. otyłości klinicznej (2025) zaleca potwierdzenie BMI pomiarem obwodu pasa lub pomiarem tkanki tłuszczowej przed rozpoznaniem otyłości.',
    // waist / whtr / whr labels (anthro.js)
    'Not increased': 'Niezwiększone',
    'Increased risk': 'Zwiększone ryzyko',
    'Substantially increased risk': 'Znacznie zwiększone ryzyko',
    'Below 0.4 (check for underweight)': 'Poniżej 0,4 (sprawdź, czy nie jest to niedowaga)',
    'Healthy central adiposity': 'Prawidłowy poziom tłuszczu brzusznego',
    'Increased central adiposity': 'Podwyższony poziom tłuszczu brzusznego',
    'High central adiposity': 'Wysoki poziom tłuszczu brzusznego',
    'Below WHO risk threshold': 'Poniżej progu ryzyka WHO',

    // Loss composition card
    'What you will lose': 'Co utracisz',
    'composition': 'skład',
    'Fat': 'Tłuszcz',
    'Lean tissue': 'Masa beztłuszczowa',
    'Glycogen & water': 'Glikogen i woda',
    "The lean share depends on how much fat you start with (Forbes' curve): the leaner you are, the more of each kilogram comes from lean tissue. ":
      'Udział masy beztłuszczowej zależy od początkowej ilości tłuszczu (krzywa Forbesa): im mniej masz go na początku, tym większa część każdego utraconego kilograma pochodzi z masy beztłuszczowej. ',
    'Why the curve bends': 'Dlaczego krzywa się spłaszcza',
    'Burning today': 'Spalanie dzisiaj',
    'Burning at goal': 'Spalanie po osiągnięciu celu',
    '… smaller body': '… mniejsza masa ciała',
    '… adaptive thermogenesis': '… adaptacyjna termogeneza',
    '… less food to digest': '… mniej pokarmu do strawienia',
    'So the gap between intake and expenditure narrows every week and loss slows, unless intake keeps dropping or activity rises. ':
      'Dlatego różnica między spożyciem a wydatkiem energetycznym z każdym tygodniem się zmniejsza, a utrata masy ciała zwalnia, chyba że nadal jesz mniej lub zwiększasz aktywność. ',

    // Chart: milestone diamond markers (see js/ui/charts.js trajectory())
    'Milestone': 'Cel pośredni',

    // Chart/graphic aria-labels (screen-reader only, no visible layout risk)
    'Composition of projected loss': 'Skład przewidywanego ubytku masy ciała',
    'Body-fat percentage by method': 'Odsetek tkanki tłuszczowej według metody',
    'Resting metabolic rate by equation': 'Spoczynkowa przemiana materii według równania',
    "BMI-for-age chart with the child's BMI plotted": 'Wykres BMI dla wieku z zaznaczonym BMI dziecka',

    // Insights
    'What to expect along the way': 'Czego spodziewać się po drodze',
    ' insights': ' wniosków',

    // Targets card
    'Daily targets': 'Dzienne cele',
    'per day': 'na dzień',
    'Protein': 'Białko',
    'Lean athletes in a deficit ': 'Szczupli, wytrenowani sportowcy w deficycie ',
    'Fiber': 'Błonnik',
    'Adequate Intake for your age & sex; the 14 g/1,000 kcal rule of thumb gives ≈': 'Wystarczające spożycie dla Twojego wieku i płci; przybliżenie 14 g na 1000 kcal daje ≈',
    ' g at your calorie level ': ' g przy Twoim poziomie kalorii ',
    'Water': 'Woda',
    'From drinks and food ': 'Z napojów i jedzenia ',
    'Share of ': 'Udział w ',
    '% of energy ': '% energii ',
    'Carbohydrate': 'Węglowodany',
    "Acceptable Macronutrient Distribution Ranges. When the protein target above is higher than the range's lower end, fit carbohydrate and fat around it.":
      'Akceptowalne zakresy rozkładu makroskładników (AMDR). Jeśli powyższy cel białkowy jest wyższy niż dolna granica zakresu, dobierz do niego ilość węglowodanów i tłuszczu.',

    // Child hero / readouts / guidance
    'Growth chart · CDC BMI-for-age': 'Siatka centylowa · BMI względem wieku CDC',
    'Growth chart · WHO BMI-for-age': 'Siatka centylowa · BMI wg wieku WHO',
    "Children's BMI is judged against children of the same age and sex, because healthy BMI changes a lot while growing. ":
      'BMI u dzieci ocenia się w porównaniu z dziećmi w tym samym wieku i tej samej płci, ponieważ prawidłowa wartość BMI znacznie zmienia się w trakcie wzrostu. ',
    'Percentile': 'Percentyl',
    'z-score': 'z-score',
    'Energy for growth': 'Energia na wzrost',
    'Includes ': 'Zawiera ',
    ' kcal for growth ': ' kcal na wzrost ',
    'Healthy weight now': 'Prawidłowa masa ciała teraz',
    'At current height and age': 'Przy obecnym wzroście i wieku',
    'Goal: ': 'Cel: ',
    "Goals are defined on the CDC percentile scale (":
      'Cele wyznacza się na skali percentyli CDC (',
    "). Because children grow taller, holding weight steady lowers BMI. That is why maintenance, not dieting, is usually the aim. This tool does not produce calorie-deficit plans for children.":
      '). Ponieważ dzieci rosną, utrzymanie stałej masy ciała obniża BMI. Dlatego zwykle celem jest utrzymanie masy ciała, a nie odchudzanie. Narzędzie nie tworzy planów deficytu kalorii dla dzieci.',
    'A waist under half the height is a simple screening message that works from about age 5; it is less discriminating during adolescence. Body-fat formulas for children are less precise than for adults.':
      'Obwód pasa mniejszy niż połowa wzrostu to prosty wskaźnik przesiewowy, który działa od około 5. roku życia, ale w okresie dojrzewania jest mniej miarodajny. Formuły oceniające tkankę tłuszczową u dzieci są mniej dokładne niż u dorosłych.',
    'screening': 'badanie przesiewowe',

    // Levers: what else moves the needle
    'Levers': 'Czynniki',
    'What else moves the needle': 'Co jeszcze wpływa na wynik',
    'Outside the calorie arithmetic, and measured: sleep, water, how the food was made, when you eat it, and whether you are looking.':
      'Poza liczeniem kalorii są też czynniki, których wpływ zmierzono: długość snu, picie wody, stopień przetworzenia jedzenia, pora posiłków i monitorowanie postępów.',
    'Effects measured in kcal a day': 'Efekty wyrażone w kcal na dobę',
    'one axis, your deficit included': 'jedna oś, z zaznaczonym Twoim deficytem',
    'How to read these effects': 'Jak interpretować te wyniki',
    'The figures come from studies of different designs, and several were small or short, so read them for direction and rough size.':
      'Wyniki pochodzą z badań o różnym schemacie, a część z nich była niewielka lub krótkotrwała, więc traktuj je jako wskazówkę co do kierunku i przybliżonej skali.',
    'They do not replace the energy balance above. They show what can shift around the plan: the intake you actually reach, how much of the loss comes from fat, and how clearly progress appears.':
      'Nie zastępują powyższego bilansu energetycznego. Pokazują, co w praktyce może zmienić efekt planu: rzeczywiste spożycie kalorii, udział tłuszczu w utraconej masie i widoczność postępów.',
    'Ultra-processed food, calories and macros matched': 'Żywność ultraprzetworzona, przy takiej samej liczbie kalorii i proporcji makroskładników',
    'Two weeks on each menu, inpatient, eating as much as you like.': 'Po dwa tygodnie na każdym jadłospisie, w warunkach szpitalnych; uczestnicy jedli bez ograniczeń.',
    'Sleeping 1.2 hours longer, if you sleep under 6.5': 'Sen dłuższy o 1,2 godziny przy czasie snu krótszym niż 6,5 godziny',
    'Intake measured by doubly labeled water, not by a food diary.': 'Spożycie ocenione metodą podwójnie znakowanej wody, a nie na podstawie dzienniczka żywieniowego.',
    '500 ml of water before each of three meals': '500 ml wody przed każdym z trzech posiłków',
    'Measured as 43 kcal at one test meal, counted three times; it had faded by week 12.':
      'W jednym posiłku testowym zmierzono 43 kcal i przemnożono wynik przez trzy; do 12. tygodnia efekt zanikł.',
    'A drink with the meal, before the drink itself counts': 'Alkohol do posiłku, przed doliczeniem kalorii z samego napoju',
    'Extra food eaten at that one sitting, pooled over 12 short-term experiments – not a daily effect unless you drink with most meals.':
      'Dodatkowe jedzenie podczas tego posiłku, uśrednione na podstawie 12 krótkich eksperymentów. To nie jest efekt dobowy, chyba że pijesz alkohol przy większości posiłków.',
    'adds to what you eat ': 'zwiększa spożycie ',
    'takes away from it ': 'zmniejsza spożycie ',
    'scaled up from a single-meal measurement': 'przeliczone na większą skalę na podstawie pomiaru przy jednym posiłku',
    'The amber line marks your own starting deficit, ': 'Bursztynowa linia pokazuje Twój początkowy deficyt, ',
    ' Your deficit sits past the left edge of this axis.': ' Twój deficyt znajduje się poza lewą krawędzią tej osi.',
    ' kcal a day. The largest effect here is 508 kcal a day, about ': ' kcal na dobę. Największy pokazany efekt to 508 kcal na dobę, czyli około ',
    '% of it.': '% tej wartości.',
    'Set a goal weight below your current one and your starting deficit is drawn on this axis for comparison.':
      'Po ustawieniu wagi docelowej poniżej obecnej Twój początkowy deficyt pojawi się na tej osi do porównania.',
    'Your own starting deficit is ': 'Twój początkowy deficyt to ',
    ' kcal a day, above that line.': ' kcal na dobę, powyżej tej granicy.',
    ' kcal a day, below that line.': ' kcal na dobę, poniżej tej granicy.',

    'What the weight is made of': 'Z czego składa się utrata masy ciała',
    'Short sleep moves the loss from fat to lean tissue': 'Krótki sen zmniejsza udział tłuszczu w utraconej masie',
    'less of it fat': 'mniej tłuszczu w utraconej masie',
    'Randomized crossover · 10 adults with overweight · 14 days on one reduced-calorie diet':
      'Randomizowane badanie krzyżowe · 10 dorosłych z nadwagą · 14 dni na tej samej diecie redukcyjnej',
    'Same diet, and roughly the same 3 kg gone either way. On 5.5 hours in bed instead of 8.5, only 0.6 kg of that was fat instead of 1.4 kg, while lean-tissue loss rose from 1.5 kg to 2.4 kg. Hunger and ghrelin were higher and less fat was burned for fuel.':
      'Ta sama dieta i mniej więcej te same 3 kg utraconej masy w obu wariantach. Przy 5,5 godziny w łóżku zamiast 8,5 tylko 0,6 kg stanowił tłuszcz, a nie 1,4 kg; utrata masy beztłuszczowej wzrosła z 1,5 kg do 2,4 kg. Uczestnicy odczuwali większy głód i mieli wyższy poziom greliny, a ich organizm spalał mniej tłuszczu jako paliwa.',
    'Sleep curtailment decreased the proportion of weight lost as fat by 55%.':
      'Skrócenie snu zmniejszyło udział tłuszczu w utraconej masie ciała o 55%.',
    'The same direction shows up over years, not just weeks: among 68,183 women followed for 16 years, those sleeping 5 hours or less gained 1.14 kg more than the 7-hour sleepers.':
      'Ten sam kierunek widać w skali lat, nie tylko tygodni: wśród 68 183 kobiet obserwowanych przez 16 lat kobiety śpiące 5 godzin lub krócej przytyły o 1,14 kg więcej niż te śpiące 7 godzin.',
    'Past about 500 kcal a day, training stops adding lean mass': 'Powyżej deficytu około 500 kcal na dobę trening przestaje zwiększać masę beztłuszczową',
    'Meta-analysis and meta-regression · randomized trials of 3 weeks or more of resistance training in a deficit':
      'Metaanaliza i metaregresja · randomizowane badania trwające co najmniej 3 tygodnie, dotyczące treningu oporowego w deficycie',
    'Lifting while in a deficit keeps your strength, no differently from lifting with full energy available. But the meta-regression puts the deficit where resistance training stops adding lean mass at about 500 kcal a day – it is about lean-mass gains stalling, not about losing what training would otherwise have protected. It works alongside the protein target in Nutrition, not instead of it.':
      'Trening oporowy podczas deficytu pomaga utrzymać siłę, podobnie jak przy pełnej dostępności energii. Metaregresja wskazuje jednak, że przy deficycie około 500 kcal dziennie trening oporowy przestaje zwiększać masę beztłuszczową. Chodzi o zatrzymanie przyrostu, a nie o utratę tego, co trening w innych warunkach pomógłby zachować. Trening uzupełnia cel białkowy w sekcji „Odżywianie”, ale go nie zastępuje.',
    '…an energy deficit of ~500 kcal · day⁻¹ prevented gains in LM [lean mass].':
      '…deficyt energetyczny rzędu ~500 kcal/dobę uniemożliwiał przyrost LM [masy beztłuszczowej].',

    'What you burn without trying': 'Co spalasz bez dodatkowych ćwiczeń',
    'Moving about without calling it exercise': 'Codzienny ruch poza ćwiczeniami',
    'difference in fat gained': 'różnicy w przyroście masy tłuszczowej',
    'Overfeeding study · 16 adults of healthy weight · 1,000 kcal/day surplus for 8 weeks':
      'Badanie nad przekarmianiem · 16 dorosłych z prawidłową masą ciała · nadwyżka 1000 kcal na dobę przez 8 tygodni',
    'Fed the same surplus for the same eight weeks, some people burned much of it off by moving more without deciding to: posture, walking about, fidgeting. That swing ran from 98 kcal/day less to 692 kcal/day more, and it explained a ten-fold spread in how much fat they actually put on. The channel runs in reverse on a diet, where eating less quietly makes you move less.':
      'Podczas tych samych ośmiu tygodni z taką samą nadwyżką kalorii niektórzy spalali jej dużą część, nie planując dodatkowego ruchu: zmieniali postawę, chodzili i wiercili się. Różnica wynosiła od 98 kcal mniej do 692 kcal więcej na dobę i wyjaśniała dziesięciokrotną różnicę w faktycznym przyroście tłuszczu. Na diecie działa to w drugą stronę: mniejsze spożycie kalorii może po cichu ograniczać ruch.',
    'Changes in NEAT accounted for the 10-fold differences in fat storage that occurred…':
      'Zmiany NEAT odpowiadały za dziesięciokrotne różnice w odkładaniu tłuszczu, które wystąpiły…',
    'The same meals, four hours later': 'Te same posiłki, cztery godziny później',
    'later, nothing else changed': 'później, przy niezmienionych pozostałych warunkach',
    'Randomized crossover · 16 adults with overweight or obesity · meals, sleep, light and activity held identical':
      'Randomizowane badanie krzyżowe · 16 dorosłych z nadwagą lub otyłością · identyczne posiłki, czas snu, oświetlenie i aktywność',
    'Shifting identical meals about four hours later raised hunger, tilted the ghrelin-to-leptin ratio towards appetite, lowered waking energy expenditure and 24-hour core temperature, and moved fat-tissue gene expression away from releasing fat and towards storing it.':
      'Przesunięcie identycznych posiłków o około cztery godziny zwiększyło głód, przesunęło stosunek greliny do leptyny w stronę większego apetytu, obniżyło wydatek energetyczny podczas czuwania i dobową temperaturę głęboką ciała oraz zmieniło ekspresję genów tkanki tłuszczowej: zamiast uwalniania tłuszczu sprzyjała ona jego magazynowaniu.',
    'Late eating increased hunger… Furthermore, late eating decreased waketime energy expenditure…':
      'Późne jedzenie zwiększyło głód… Ponadto późne jedzenie obniżyło wydatek energetyczny podczas czuwania…',

    'Whether you can see where you are': 'Czy wiesz, na czym stoisz',
    'Self-reported intake often runs below actual intake': 'Deklarowane spożycie kalorii często jest niższe od rzeczywistego',
    'under-reported': 'zaniżonego spożycia w raportach',
    'Metabolic study · 10 adults who could not lose weight on a reported 1,200 kcal/day · 14 days of calorimetry and doubly labeled water':
      'Badanie metaboliczne · 10 dorosłych, którzy nie chudli przy raportowanych 1200 kcal na dobę · 14 dni kalorymetrii i wody podwójnie znakowanej',
    "This small group's metabolism turned out to be ordinary: total expenditure sat within 5% of what the equations predicted. Their food and activity records were the thing that was wrong, with intake under-reported by 47% and activity over-reported by 51%. It is one of the reasons a plan and a bathroom scale can disagree, alongside water, timing and measurement noise – a 10-person study does not establish how often it explains any given gap.":
      'Metabolizm tej niewielkiej grupy nie odbiegał od normy: całkowity wydatek energetyczny mieścił się w granicach 5% wartości przewidywanej przez równania. Błąd tkwił w zapisach jedzenia i aktywności: spożycie zaniżono o 47%, a aktywność zawyżono o 51%. To jeden z powodów, dla których plan i wskazania wagi łazienkowej mogą się nie zgadzać, obok wpływu wody, pory pomiaru i szumu pomiarowego. Badanie na 10 osobach nie pokazuje jednak, jak często to wyjaśnia konkretną rozbieżność.',
    '…underreported their actual food intake by an average (± SD) of 47 ± 16 percent…':
      '…zaniżali w deklaracjach rzeczywiste spożycie jedzenia średnio (± SD) o 47 ± 16%…',
    'Logging often tracks with success more than logging carefully': 'Sukces wiąże się bardziej z częstotliwością zapisywania niż z dokładnością zapisów',
    'vs 1.7 entries a day': 'w porównaniu z 1,7 wpisu dziennie',
    '24-week online behavioral program · 142 adults': '24-tygodniowy internetowy program zmiany zachowania · 142 osoby dorosłe',
    "Minutes spent recording did not separate the successful from the rest in this program; how often they came back did. People who lost a tenth of their body weight or more opened their diary 2.7 times a day against 1.7 for everyone else – an association, not a controlled test of one against the other. It also gets cheaper with practice: 23 minutes a day in month one, 15 by month six.":
      'W tym programie liczba minut poświęconych na zapisywanie nie odróżniała osób, którym się udało, od pozostałych. Decydowało to, jak często wracały do dzienniczka. Osoby, które straciły co najmniej 10% masy ciała, otwierały go 2,7 raza dziennie, a pozostali 1,7 raza. To związek zaobserwowany w badaniu, a nie kontrolowane porównanie obu zachowań. Z czasem zapisywanie zajmowało też mniej czasu: 23 minuty dziennie w pierwszym miesiącu i 15 w szóstym.',
    'The frequency of self-monitoring is significantly related to weight loss…':
      'Częstość samokontroli wiąże się istotnie z utratą masy ciała…',
    'Weigh yourself often, but read the trend': 'Waż się często, ale obserwuj trend',
    'added to a program': 'dołączone do programu',
    'Meta-analysis of randomized trials · 4 adding self-weighing to an existing program':
      'Metaanaliza randomizowanych badań · 4 badania, w których do istniejącego programu dodano samodzielne ważenie',
    'Adding self-weighing and self-regulation to a weight-loss program was worth an extra 1.7 kg (95% CI 0.8 to 2.6). On its own it did nothing measurable, so the scale is a feedback signal rather than a treatment. Day to day it mostly tracks water, as the first week above shows, which is why the weekly average is the number to read.':
      'Dodanie samodzielnego ważenia i samoregulacji do programu odchudzania wiązało się z dodatkową utratą 1,7 kg (95% CI 0,8–2,6). Samo ważenie nie dało mierzalnego efektu, więc waga jest sygnałem zwrotnym, a nie metodą leczenia. Wahania z dnia na dzień odzwierciedlają głównie wodę, jak pokazuje pierwszy tydzień powyżej. Dlatego warto obserwować średnią tygodniową.',
    'Four trials added self-weighing/self-regulation techniques to multi-component programmes and resulted in a significant difference of −1.7 kg…':
      'W czterech badaniach do programów wieloskładnikowych dodano techniki samodzielnego ważenia/samoregulacji, co dało istotną różnicę −1,7 kg…',

    // Errors
    'Check these details': 'Sprawdź te dane',
    'Results appear as soon as the basics are valid.': 'Wyniki pojawią się, gdy podstawowe dane będą poprawne.',
    // Sources tab topic-group headings (FH.refs.orderedTopics)
    'Children': 'Dzieci', 'BMR': 'PPM (BMR)', 'TDEE': 'TDEE', 'Dynamics': 'Dynamika',
    'Adiposity': 'Otyłość centralna', 'Guidelines': 'Wytyczne',
    'Activity': 'Aktywność', 'Sleep & behavior': 'Sen i zachowanie', 'Outcomes': 'Wyniki kliniczne',

    // .hint tooltip contents (data-tip)
    'Predictive equations are fitted separately for males and females because body composition and resting metabolic rate differ systematically between them.':
      'Równania predykcyjne dopasowuje się osobno dla kobiet i mężczyzn, ponieważ skład ciała i spoczynkowa przemiana materii systematycznie się między nimi różnią.',
    'Adjusts BMI, waist and body-fat thresholds: several populations carry more risk at a lower BMI.':
      'Uwzględnia inne progi BMI, obwodu pasa i tkanki tłuszczowej: w niektórych populacjach wyższe ryzyko pojawia się już przy niższym BMI.',
    'Only if measured (DXA, BodPod, a clinical scan). Home scales are too imprecise to override the estimates.':
      'Tylko po wykonaniu pomiaru (DXA, BodPod lub badanie kliniczne). Wagi domowe są zbyt niedokładne, aby zastąpić nimi oszacowanie.',
    'On top of today. E.g. a daily 30-min brisk walk ≈ 120–150 kcal for a 70–80 kg adult.':
      'Dodatkowo, poza dzisiejszą aktywnością. Na przykład szybki, 30-minutowy spacer dziennie to około 120–150 kcal u osoby dorosłej o masie 70–80 kg.',
    'CDC 2000 charts are the US standard; WHO 2006/2007 references are used in most other countries. Both are shown in the results.':
      'Siatki CDC 2000 są standardem w USA, a referencje WHO 2006/2007 stosuje się w większości pozostałych krajów. W wynikach pokazujemy obie.',

    'Age must be between 2 and 100 years.': 'Wiek musi wynosić od 2 do 100 lat.',
    'Height must be between 80 and 250 cm.': 'Wzrost musi wynosić od 80 do 250 cm.',
    'Weight must be between 10 and 350 kg.': 'Masa ciała musi wynosić od 10 do 350 kg.',
    'Select sex.': 'Wybierz płeć.',
    'Daily intake must be above 0 and at most 6,000 kcal.': 'Dzienna podaż musi być większa od 0 i wynosić najwyżej 6000 kcal.',
    'Weeks must be between 2 and 156.': 'Liczba tygodni musi wynosić od 2 do 156.',

    // Footer
    'WeightFrame gives population-based estimates, not medical advice. Individual energy needs vary by roughly ±10–15% around any equation. Children, pregnancy, breastfeeding, eating disorders, diabetes medication and chronic illness need individual clinical advice.':
      'WeightFrame podaje szacunki populacyjne, a nie poradę medyczną. Indywidualne zapotrzebowanie energetyczne może odbiegać od wyniku dowolnego równania o około ±10–15%. Dzieci, ciąża, karmienie piersią, zaburzenia odżywiania, leki na cukrzycę i choroby przewlekłe wymagają indywidualnej porady medycznej.',
  };

  /* ---- Forecast redesign (2026-09): rail, outlook panel, conditions, energy balance ---- */
  Object.assign(PL, {
    'Your details': 'Twoje dane',
    'Edit': 'Edytuj',
    'weeks': 'tyg.',
    'Theme: follows your system': 'Motyw: zgodny z ustawieniami systemu',
    'Theme: light': 'Motyw: jasny',
    'Theme: dark': 'Motyw: ciemny',
    'Your outlook': 'Twoja prognoza',
    // Without the trailing space the old key (above) never matched the hero's sentence.
    'Weight-loss planning is switched off.': 'Planowanie redukcji masy ciała jest wyłączone.',
    'No weight-change plan is shown. The notice below explains why.': 'Plan zmiany masy ciała nie jest pokazywany. Wyjaśnia to komunikat poniżej.',
    'At this BMI the formulas disagree widely, so treat each one as a rough guide.': 'Przy tym BMI wzory dają bardzo różne wyniki, więc traktuj każdy z nich jako przybliżenie.',
    'Glycogen and its water rise by ': 'Glikogen i związana z nim woda rosną o ',
    ', because you eat more carbohydrate than before, so the scale drops less than this.': ', ponieważ jesz więcej węglowodanów niż wcześniej, więc waga spada mniej, niż wynika z tych liczb.',
    'healthy BMI range': 'prawidłowy zakres BMI',
    'Starting surplus': 'Nadwyżka startowa',
    'Where you stand today': 'Gdzie jesteś dziś',
    'Where your child stands today': 'Gdzie jest dziś Twoje dziecko',
    'of your daily burn': 'dziennego wydatku energetycznego',
    'Where your starting deficit comes from, and why it shrinks as you get lighter.':
      'Skąd bierze się Twój początkowy deficyt i dlaczego maleje, gdy masa ciała spada.',
    'You burn': 'Spalasz',
    'You eat': 'Jesz',
    'Activity & digestion': 'Aktywność i trawienie',
    'Planned intake': 'Planowane spożycie',
    'Surplus': 'Nadwyżka',
    'At your goal you will burn about ': 'Po osiągnięciu celu będziesz spalać około ',
    ', so the same intake leaves a smaller gap every week.': ', więc przy tym samym spożyciu różnica z każdym tygodniem będzie mniejsza.',
    'Milestones along the way': 'Cele pośrednie',
    'What happens in the first week, while you lose, at your goal and afterwards.': 'Co dzieje się w pierwszym tygodniu, w trakcie redukcji, po osiągnięciu celu i później.',
    'Share of energy': 'Udział w energii',
    'Likely range': 'Prawdopodobny zakres',
    'The same plan if your true maintenance sits anywhere in its likely range: ±1 prediction error of the National Academies 2023 equation, which covers about 2 in 3 people.':
      'Ten sam plan przy dowolnej wartości rzeczywistego utrzymania w przewidywanym zakresie, wyznaczonym przez błąd predykcji ±1 równania National Academies z 2023 r. Zakres obejmuje około 2 na 3 osoby.',
    'First week': 'Pierwszy tydzień',
    'While you lose': 'W trakcie redukcji',
    'At your goal': 'Po osiągnięciu celu',
    'Afterwards': 'Później',
    'More below': 'Więcej poniżej',
  });

  /* ---- Complex, multi-variable sentences: real functions, not phrase substitution -------
   * board.js builds its own English version of each of these inline (unchanged) and calls
   * the matching HERO_PL.xxx(...) function instead, only when locale is 'pl'. Polish word
   * order and grammatical agreement (e.g. "-letniego" vs "-letniej") differ enough from
   * English that phrase substitution would produce broken sentences here. */
  const HERO_PL = {
    maintainOnly: (kcalEm) => `Jedz około ${kcalEm}, aby utrzymać `,
    plateau: (kcalEm, plateauMass, goalMass) => `Przy ${kcalEm} masa ciała ustabilizuje się w okolicach ${plateauMass}, nie osiągając ${goalMass}.`,
    reach: (kcalEm, goalMass, dateEm, weeksStr) => `Jedząc około ${kcalEm}, osiągniesz ${goalMass} około ${dateEm}, czyli za ${weeksStr}.`,
    ruleWould: (weeksStr, ruleLabel) => `Popularna reguła ${ruleLabel} przewidywałaby ${weeksStr}. Nie uwzględnia jednak, że lżejszy organizm spala mniej energii. `,
    afterGoal: (kcalStr) => `Po osiągnięciu celu utrzymanie masy ciała będzie wymagać około ${kcalStr} kcal dziennie. `,
    maintenanceIs: (kcalEm) => `Dzienne spożycie kalorii na utrzymanie masy ciała wynosi około ${kcalEm}.`,
    childNeedsAge: (maxAge) => `BMI wg wieku można obliczyć dla osób w wieku od 2 do ${maxAge} lat.`,
    kidGenitive: { male: 'chłopca', female: 'dziewczynki' },
    childLeadWho: (bmiStr, sign, zStr, age, kidGenitive, categoryLower) => `BMI ${bmiStr} oznacza ${sign}${zStr} SD względem mediany dla ${age}-letni${kidGenitive === 'dziewczynki' ? 'ej' : 'ego'} ${kidGenitive}, <em>${categoryLower}</em>.`,
    childLeadCdc: (bmiStr, pctStr, age, kidGenitive, categoryLower) => `BMI ${bmiStr} znajduje się na <em>${pctStr}. percentylu</em> dla ${age}-letni${kidGenitive === 'dziewczynki' ? 'ej' : 'ego'} ${kidGenitive}, <em>${categoryLower}</em>.`,
    childOtherWho: (sign, zStr, categoryLower) => `Na skali WHO: ${sign}${zStr} SD (${categoryLower}).`,
    childOtherCdc: (pctStr, categoryLower) => `Na skali CDC: ${pctStr}. percentyl (${categoryLower}).`,
    childExtended: (pctOfP95) => `Powyżej 95. percentyla stosowana jest rozszerzona metoda CDC z 2022 r.; BMI wynosi ${pctOfP95}% wartości 95. percentyla.`,
  };

  /* ---- Category-label translations keyed by exact English label text (child growth categories
   * reuse the same "Healthy weight"/"Overweight" keys already in PL above; the few labels unique
   * to WHO 2006/2007 are added here). ---- */
  Object.assign(PL, {
    'Healthy weight': 'Prawidłowa masa ciała',
    'Severe thinness': 'Ciężka niedowaga',
    'Moderate thinness': 'Umiarkowana niedowaga',
    'Mild thinness (underweight)': 'Lekka niedowaga',
    'Obesity class I': 'Otyłość I stopnia',
    'Obesity class II': 'Otyłość II stopnia',
    'Obesity class III': 'Otyłość III stopnia',
    'Obesity (class 1)': 'Otyłość (stopień 1)',
    'Severe obesity (class 2)': 'Ciężka otyłość (stopień 2)',
    'Severe obesity (class 3)': 'Ciężka otyłość (stopień 3)',
    'Obesity': 'Otyłość',
    'Possible risk of overweight': 'Możliwe ryzyko nadwagi',
    'Severe wasting (BMI-for-age)': 'Ciężkie wyniszczenie (BMI wg wieku)',
    'Wasting (BMI-for-age)': 'Wyniszczenie (BMI wg wieku)',
    'Severe thinness (BMI-for-age)': 'Ciężka niedowaga (BMI wg wieku)',
    'Thinness': 'Niedowaga',
    'Below 0.5': 'Poniżej 0,5',
    'Above 0.5: likely central fat excess': 'Powyżej 0,5: prawdopodobny nadmiar tłuszczu centralnego',
    'boy': 'chłopiec',
    'girl': 'dziewczynka',
  });

  /* ---- Methods & Sources tabs: headings and prose (formula blocks stay in their original
   * mathematical notation in both languages, as is conventional for equations). ------------ */
  Object.assign(PL, {
    'How every number on the dashboard is calculated, and which formula wins in which situation, and why. Every <sup class="cite-ref">[n]</sup> links to its full citation in <b>Sources</b>.':
      'Jak obliczany jest każdy wynik na panelu, który wzór stosujemy w danej sytuacji i dlaczego. Każdy <sup class="cite-ref">[n]</sup> prowadzi do pełnego opisu źródła w zakładce <b>Źródła</b>.',
    'Full bibliography for every citation in the app, numbered in the order they first appear. ':
      'Pełna bibliografia wszystkich źródeł cytowanych w aplikacji, ponumerowana według kolejności pierwszego użycia. ',
    ' sources, checked against Crossref / NCBI. A few sources critical to a specific claim also carry a manual claim-review record (population, study type, limitations, correction status) below their entry.':
      ' źródeł, sprawdzonych w Crossref i NCBI. Przy kilku źródłach kluczowych dla konkretnych twierdzeń znajduje się także ręczna notatka weryfikacyjna (populacja, rodzaj badania, ograniczenia i status korekt) pod wpisem.',
    'Population': 'Populacja',
    'Study type': 'Rodzaj badania',
    'Limitations': 'Ograniczenia',
    'Corrections': 'Korekty',
    'Claim last checked': 'Ostatnia weryfikacja twierdzenia',

    'BMI for adults': 'BMI dla dorosłych',
    'Body mass index screens weight relative to height. It does not see fat versus muscle, or where fat sits.':
      'Wskaźnik masy ciała (BMI) służy do przesiewowej oceny masy ciała względem wzrostu. Nie pokazuje, ile z niej stanowi tłuszcz, ile mięśnie ani gdzie odkłada się tłuszcz.',
    'Several populations carry more body fat and cardiometabolic risk at the same BMI, hence the lower action points. ':
      'W niektórych populacjach przy tym samym BMI występuje więcej tkanki tłuszczowej i wyższe ryzyko sercowo-metaboliczne, dlatego stosuje się niższe progi. ',
    'From 65 years, mortality is lowest around BMI 23–30 and rises below 23; "overweight" is not a risk marker at that age. ':
      'Po 65. roku życia śmiertelność jest najniższa przy BMI około 23–30 i rośnie poniżej 23; w tym wieku sama „nadwaga” nie wskazuje na zwiększone ryzyko. ',
    'The 2025 Lancet Commission: BMI alone cannot diagnose obesity. Confirm with waist, waist-to-hip or waist-to-height ratio, or a body-fat measurement (not needed above BMI 40). ':
      'Komisja Lancet z 2025 r.: samo BMI nie wystarcza do rozpoznania otyłości. Potwierdź wynik pomiarem obwodu pasa, stosunkiem obwodu pasa do bioder lub wzrostu albo pomiarem tkanki tłuszczowej (powyżej BMI 40 nie jest to konieczne). ',
    'Used as a screen, always paired with a waist-based measure when one is entered.':
      'Służy do przesiewowej oceny i zawsze łączy się z pomiarem obwodu pasa, jeśli taki pomiar podano.',
    'Lower thresholds apply for South Asian, Chinese and other Asian, Middle Eastern, and Black African / African-Caribbean backgrounds: 23 overweight, 27.5 obesity, and 32.5 / 37.5 for obesity classes II / III.':
      'Niższe progi dotyczą osób pochodzenia południowoazjatyckiego, chińskiego lub innego azjatyckiego, bliskowschodniego oraz osób czarnoskórych pochodzenia afrykańskiego lub afrokaraibskiego: BMI 23 oznacza nadwagę, 27,5 otyłość, a 32,5 / 37,5 otyłość II / III stopnia.',
    'WHO class': 'Klasa WHO',

    'BMI for children (2–19 years)': 'BMI dla dzieci (2–19 lat)',
    "Healthy BMI changes with age and differs between boys and girls, so a child's BMI is converted to a percentile or z-score using official reference tables (LMS method). ":
      'Prawidłowa wartość BMI zmienia się z wiekiem i różni między chłopcami a dziewczynkami, dlatego BMI dziecka przelicza się na percentyl lub wynik z-score za pomocą oficjalnych tabel referencyjnych (metoda LMS). ',
    'CDC 2000</b> (US standard, 2–20 y): underweight &lt; 5th, healthy 5th–&lt;85th, overweight 85th–&lt;95th, obesity ≥ 95th; severe obesity class 2 ≥ 120% of the 95th percentile, class 3 ≥ 140%. ':
      'CDC 2000</b> (standard USA, 2–20 lat): niedowaga &lt; 5. percentyla, prawidłowa masa ciała 5.–&lt;85. percentyla, nadwaga 85.–&lt;95. percentyla, otyłość ≥ 95. percentyla; ciężka otyłość stopnia 2 zaczyna się od ≥ 120% wartości 95. percentyla, a stopnia 3 od ≥ 140%. ',
    'The plain LMS formula compresses very high BMIs into almost identical z-scores; the CDC extended method fixes that and is used automatically above the 95th percentile. ':
      'Zwykły wzór LMS spłaszcza bardzo wysokie wartości BMI do niemal identycznych wyników z-score; rozszerzona metoda CDC rozwiązuje ten problem i automatycznie stosuje się ją powyżej 95. percentyla. ',
    'WHO</b>: 2006 Growth Standards under 5 years (overweight &gt; +2 SD, obesity &gt; +3 SD) and the 2007 Reference for 5–19 years (overweight &gt; +1 SD, obesity &gt; +2 SD). ':
      'WHO</b>: standardy wzrastania WHO z 2006 r. dla dzieci poniżej 5 lat (nadwaga &gt; +2 SD, otyłość &gt; +3 SD) oraz referencja z 2007 r. dla wieku 5–19 lat (nadwaga &gt; +1 SD, otyłość &gt; +2 SD). ',
    'Both references are computed; you choose which one leads. Guidance thresholds are applied on the CDC scale because the treatment guidelines are written in CDC percentiles.':
      'Obie referencje obliczamy, a Ty wybierasz, która ma być główna. Progi wskazówek klinicznych stosujemy na skali CDC, ponieważ wytyczne leczenia posługują się percentylami CDC.',

    'Resting metabolic rate: which equation when': 'Spoczynkowa przemiana materii: które równanie wybrać',
    'Every equation below predicts resting metabolic rate (RMR) from a handful of easy-to-measure inputs – the table shows exactly which inputs each one uses.':
      'Każde z poniższych równań szacuje spoczynkową przemianę materii (PPM) na podstawie kilku łatwych do zmierzenia danych. Tabela pokazuje dokładnie, których danych używa każde równanie.',
    'General adults, including obesity → Mifflin-St Jeor.</b> It predicted within ±10% of measured RMR in more non-obese and obese adults than Harris-Benedict, Owen or WHO, with the narrowest error range. ':
      'Dorośli, także osoby z otyłością → Mifflin-St Jeor.</b> Równanie to przewidywało PPM z dokładnością do ±10% u większej liczby dorosłych bez otyłości i z otyłością niż równania Harris-Benedicta, Owena i WHO; miało też najwęższy zakres błędu. ',
    'Athletes with measured body composition → Cunningham.</b> In a 2023 meta-analysis (29 studies, 1,430 athletes) Cunningham, Harris-Benedict and ten Haaf were unbiased; Mifflin-St Jeor, Owen and WHO under- or over-predicted. ':
      'Sportowcy ze zmierzonym składem ciała → Cunningham.</b> Metaanaliza z 2023 r. (29 badań, 1430 sportowców) wykazała, że równania Cunningham, Harris-Benedict i ten Haaf nie miały istotnego obciążenia, a Mifflin-St Jeor, Owen i WHO zaniżały lub zawyżały wynik. ',
    'Athletes without body-fat data → Harris-Benedict (1919).</b> Same meta-analysis. ':
      'Sportowcy bez danych o zawartości tkanki tłuszczowej → Harris-Benedict (1919).</b> Te same wnioski co w powyższej metaanalizie. ',
    "Asian adults</b>: most equations were fitted in white populations and over-predict; Henry's Oxford equations use a larger, more diverse dataset and give lower values. ":
      'Dorośli pochodzenia azjatyckiego</b>: większość równań opracowano na podstawie populacji białych, dlatego zawyżają wynik. Równania oksfordzkie Henry’ego wykorzystują większy i bardziej zróżnicowany zbiór danych, a ich wyniki są niższe. ',
    'Obesity</b>: use actual weight, not an "adjusted" weight, in these equations. ':
      'Otyłość</b>: w tych równaniach używaj rzeczywistej masy ciała, a nie „masy skorygowanej”. ',
    'FFM-based equations are only as good as the body-fat number feeding them.':
      'Równania oparte na FFM są tak wiarygodne, jak podany wynik tkanki tłuszczowej.',
    'Children → Schofield weight + height</b> (ESPGHAN/ESPEN, grade B). Harris-Benedict is unsuitable under 10 years. ':
      'Dzieci → Schofield (masa ciała + wzrost)</b> (ESPGHAN/ESPEN, poziom B). Harris-Benedict nie nadaje się do stosowania u dzieci poniżej 10. roku życia. ',
    "Every equation is shown side by side, and you choose which one leads. By default, Auto picks the equation the evidence supports for your profile and prints the reason next to it. Expect ±10% individual error from any of them.":
      'Wszystkie równania pokazujemy obok siebie, a Ty wybierasz, które ma być główne. Domyślnie tryb Automatycznie wybiera równanie najlepiej uzasadnione badaniami dla Twojego profilu i wyświetla obok powód tego wyboru. Każde z nich może dawać indywidualny błąd rzędu ±10%.',

    'Total daily energy expenditure (TDEE)': 'Całkowity dzienny wydatek energetyczny (TDEE)',
    'Primary estimate: the <b>National Academies 2023</b> equations, fitted directly to doubly-labeled-water measurements of free-living energy expenditure. ':
      'Główny wynik: równania <b>National Academies 2023</b>, dopasowane bezpośrednio do pomiarów wydatku energetycznego metodą podwójnie znakowanej wody u osób żyjących w warunkach codziennych. ',
    'Individual prediction error (RMSE): men ±339, women ±246, boys ±259, girls ±237 kcal/day, shown as a range, not hidden. ':
      'Indywidualny błąd predykcji (RMSE): mężczyźni ±339, kobiety ±246, chłopcy ±259, dziewczynki ±237 kcal/dzień. Pokazujemy go jako zakres, a nie ukrywamy. ',
    'The popular multipliers 1.2 / 1.375 / 1.55 / 1.725 / 1.9 have no clear primary source, and 1.2 "sedentary" is below virtually all free-living measurements (PAL ≈ 1.4 or more). ':
      'Popularne mnożniki 1,2 / 1,375 / 1,55 / 1,725 / 1,9 nie mają jasno wskazanego źródła pierwotnego, a wartość 1,2 dla „siedzącego trybu życia” jest niższa niż niemal wszystkie pomiary w warunkach codziennych (PAL ≈ 1,4 lub więcej). ',
    'Energy expenditure adjusted for body size is stable from 20 to 60 years and declines after ~60. ':
      'Wydatek energetyczny skorygowany względem wielkości ciała pozostaje stabilny od 20 do 60 lat i spada po około 60. roku życia. ',
    'Newer: a 2025 equation from 6,497 IAEA measurements predicts TEE without an activity category, but it needs ethnicity and altitude coding and was corrected after publication. Noted here, not yet implemented. ':
      'Nowsze rozwiązanie: równanie z 2025 r. oparte na 6497 pomiarach IAEA przewiduje całkowity wydatek energetyczny bez kategorii aktywności, ale wymaga podania pochodzenia etnicznego i wysokości nad poziomem morza. Po publikacji je skorygowano. Wspominamy o nim tutaj, ale nie zostało jeszcze wdrożone. ',

    'Weight change over time: the dynamic model': 'Zmiana masy ciała w czasie: model dynamiczny',
    "The projection uses the NIH body-weight model of Hall et al. (Lancet 2011), the model behind the NIH Body Weight Planner, implemented from the paper's web appendix. ":
      'Prognoza korzysta z modelu masy ciała NIH autorstwa Halla i wsp. (Lancet 2011), który stoi za narzędziem NIH Body Weight Planner. Model zaimplementowano na podstawie internetowego dodatku do publikacji. ',
    "Starting fat mass: measured if given, else the circumference estimate, else Jackson 2002 (the model's own default). ":
      'Początkowa masa tłuszczu: z pomiaru, jeśli go podano; w przeciwnym razie z obwodów; ostatecznie Jackson 2002, czyli domyślna wartość modelu. ',
    '"3,500 kcal = 1 lb" rule (7,700 kcal/kg) ignores falling expenditure and water shifts: it under-predicts week one and increasingly over-promises after. ':
      'reguła „3500 kcal = 1 funt” (7700 kcal/kg) ignoruje spadek wydatku energetycznego i zmiany poziomu wody: zaniża przewidywaną utratę w pierwszym tygodniu, a później coraz bardziej ją zawyża. ',
    'Rule of thumb from the model: every 10 kJ (2.4 kcal) per day of sustained intake change moves eventual weight by ~0.1 kg; half the change takes about a year. ':
      'Przybliżenie z modelu: każda trwała zmiana spożycia o 10 kJ (2,4 kcal) dziennie przesuwa docelową masę ciała o około 0,1 kg; połowa tej zmiany następuje w ciągu mniej więcej roku. ',
    'Not in the model: appetite. Intake tends to drift up ~100 kcal/day per kg lost, which is why plans must survive the maintenance phase. ':
      'Poza modelem pozostaje apetyt. Spożycie kalorii zwykle rośnie o około 100 kcal dziennie na każdy utracony kilogram, dlatego plan musi uwzględniać również fazę utrzymania. ',
    'Adults only. Growth makes the adult model invalid for children, so none is projected for them.':
      'Tylko dla dorosłych. Wzrost sprawia, że model dla dorosłych nie działa u dzieci, dlatego nie tworzymy dla nich prognozy.',

    'Body fat: which estimate when': 'Tkanka tłuszczowa: które oszacowanie wybrać',
    'Circumference-based methods (a tape measure) beat formulas that use only BMI, because two people with the same BMI can carry very different amounts of fat.':
      'Metody oparte na obwodach (miarka krawiecka) są dokładniejsze niż formuły korzystające wyłącznie z BMI, ponieważ dwie osoby o tym samym BMI mogą mieć zupełnie inną ilość tłuszczu.',
    'Measured values (DXA, air displacement, 4-compartment) always win. ':
      'Jeśli masz zmierzony wynik (DXA, pletyzmografia powietrzna, model czterokomponentowy), użyj go w pierwszej kolejności. ',
    'With a tape measure, circumference methods (RFM validated against DXA in NHANES; US Navy) beat BMI-only formulas; their median is used. ':
      'Jeśli masz tylko miarkę, metody oparte na obwodach (RFM sprawdzone względem DXA w NHANES i US Navy) są dokładniejsze niż formuły oparte wyłącznie na BMI; aplikacja używa ich mediany. ',
    'BMI-only formulas (CUN-BAE, Gallagher, Deurenberg) are a fallback; they cannot tell a muscular person from a fat one. ':
      'Formuły oparte wyłącznie na BMI (CUN-BAE, Gallagher, Deurenberg) są rozwiązaniem zapasowym; nie odróżniają większej masy mięśniowej od nadmiaru tłuszczu. ',
    'Healthy ranges come from Gallagher 2000: the body fat matching BMI 18.5 / 25 / 30 by age, sex and ethnicity (e.g. women 20–39: 21–33%, men 20–39: 8–20%). ':
      'Prawidłowe zakresy pochodzą z Gallagher 2000: odpowiadają zawartości tkanki tłuszczowej przy BMI 18,5 / 25 / 30, zależnie od wieku, płci i pochodzenia (np. kobiety w wieku 20–39 lat: 21–33%, mężczyźni: 8–20%). ',
    'Fat mass index classes (kg/m²) from NHANES DXA; fat-free mass index normalized to 1.8 m. ':
      'Klasy wskaźnika masy tłuszczowej (kg/m²) na podstawie DXA z NHANES; wskaźnik masy beztłuszczowej przeliczony na wzrost 1,8 m. ',

    'Central fat': 'Tłuszcz brzuszny',
    'Two people can share a BMI and carry very different amounts of fat around the waist – central ("visceral") fat carries extra cardiometabolic risk that BMI alone misses.':
      'Dwie osoby mogą mieć takie samo BMI, ale zupełnie inną ilość tłuszczu wokół pasa. Tłuszcz brzuszny (trzewny) wiąże się z dodatkowym ryzykiem sercowo-metabolicznym, którego samo BMI nie wykrywa.',
    'Waist circumference': 'Obwód pasa',
    'Substantially increased': 'Znacznie zwiększone',
    'Ratio': 'Stosunek',
    'Threshold': 'Próg',
    // 'Men'/'Women' (and lower-case) are too short/common to be safe substring keys (they'd
    // match inside "measurement", "movement", "supplement"...) - EXACT_ONLY below, looked up
    // via FH.i18n.t() at the Central Fat table call sites in methods.js instead.
    'Men': 'Mężczyźni',
    'Women': 'Kobiety',
    'men': 'mężczyźni',
    'women': 'kobiety',
    "Waist-to-height ratio predicted cardiometabolic risk better than waist or BMI in a meta-analysis and is NICE's recommended adult measure alongside BMI. ":
      'W metaanalizie stosunek obwodu pasa do wzrostu lepiej przewidywał ryzyko sercowo-metaboliczne niż sam obwód pasa lub BMI. NICE zaleca go dorosłym jako miarę uzupełniającą BMI. ',
    "Thresholds: WHO 2008 and the IDF's ethnic-specific cut-offs. ":
      'Progi: WHO 2008 oraz zależne od pochodzenia etnicznego wartości graniczne IDF. ',
    '"Keep your waist to less than half your height" also works for children, less so in adolescence. ':
      'Zasada „obwód pasa mniejszy niż połowa wzrostu” sprawdza się także u dzieci, ale jest mniej miarodajna w okresie dojrzewania. ',

    'A safe pace': 'Bezpieczne tempo',
    'Guideline diets: a deficit of ≥ 500 kcal/day, typically 1,200–1,500 kcal/day for women and 1,500–1,800 for men; 5–10% loss already brings meaningful health benefits. ':
      'Zalecane diety zakładają deficyt co najmniej 500 kcal dziennie, zwykle 1200–1500 kcal dziennie u kobiet i 1500–1800 u mężczyzn. Już utrata 5–10% masy ciała przynosi istotne korzyści zdrowotne. ',
    'Usual pace 0.5–1 kg (≈ 0.5–1% of body weight) per week; faster loss costs more lean mass. ':
      'Typowe tempo to 0,5–1 kg (około 0,5–1% masy ciała) tygodniowo; szybsze tempo oznacza większą utratę masy beztłuszczowej. ',
    'Below 800 kcal/day is a very-low-calorie diet: only with clinical supervision. ':
      'Dieta poniżej 800 kcal dziennie jest dietą bardzo niskokaloryczną i wymaga nadzoru klinicznego. ',
    'Rapid loss raises gallstone risk; the app flags more than 1.5 kg (3.3 lb) per week and never plans a faster pace on its own. ':
      'Szybka utrata masy ciała zwiększa ryzyko kamicy żółciowej; aplikacja sygnalizuje tempo przekraczające 1,5 kg (3,3 funta) tygodniowo i sama nigdy nie planuje szybszego. ',
    'Theoretical ceiling on energy released from fat: ~290 kJ (69 kcal) per kg of fat per day. Larger deficits draw more on lean tissue. ':
      'Teoretyczna granica energii uwalnianej z tłuszczu wynosi około 290 kJ (69 kcal) na kilogram tłuszczu dziennie. Większy deficyt w większym stopniu czerpie energię z masy beztłuszczowej. ',
    'Milestones: 5% (metabolic benefits), 10% (e.g. fatty-liver resolution), ≥ 15 kg (type 2 diabetes remission in 86% in DiRECT). ':
      'Cele pośrednie: 5% (korzyści metaboliczne), 10% (np. ustąpienie stłuszczenia wątroby), ≥ 15 kg (remisja cukrzycy typu 2 u 86% uczestników badania DiRECT). ',

    'Daily targets': 'Dzienne cele',
    'Protein while losing weight: 1.2–1.6 g/kg/day helps preserve lean mass and satiety. With BMI ≥ 30 the app uses goal weight, since protein needs follow lean mass. ':
      'Białko podczas redukcji: 1,2–1,6 g/kg/dzień pomaga zachować masę beztłuszczową i sytość. Przy BMI ≥ 30 aplikacja używa masy docelowej, ponieważ zapotrzebowanie na białko zależy od masy beztłuszczowej. ',
    'Older adults: at least 1.0–1.2 g/kg. ': 'Osoby starsze: co najmniej 1,0–1,2 g/kg. ',
    'Lean, resistance-trained athletes in a deficit: 2.3–3.1 g/kg fat-free mass. ':
      'Szczupli, wytrenowani sportowcy w deficycie: 2,3–3,1 g/kg masy beztłuszczowej. ',
    'Macronutrient ranges (AMDR): carbohydrate 45–65%, fat 20–35% (children 25–35%), protein 10–35%; fiber 14 g per 1,000 kcal and age/sex Adequate Intakes. ':
      'Zakresy makroskładników (AMDR): węglowodany 45–65%, tłuszcz 20–35% (dzieci 25–35%), białko 10–35%; błonnik 14 g na 1000 kcal oraz normy wystarczającego spożycia zależne od wieku i płci. ',
    'Total water: 2.0 L/day women, 2.5 L/day men, from drinks and food. ':
      'Całkowita podaż wody: 2,0 l dziennie u kobiet i 2,5 l u mężczyzn, z napojów i jedzenia. ',
    'Activity: 150–300 min/week moderate for adults; 60 min/day for children. 200–300 min/week helps prevent regain. ':
      'Aktywność: dorośli 150–300 min umiarkowanej aktywności tygodniowo, dzieci 60 min dziennie. 200–300 min tygodniowo pomaga zapobiegać ponownemu przybieraniu na wadze. ',

    'Children: guidance, not diets': 'Dzieci: wskazówki, nie diety',
    'AAP 2023: children with overweight or obesity should be offered family-based intensive health-behavior and lifestyle treatment (≥ 26 contact hours over 3–12 months). ':
      'AAP 2023: dzieciom z nadwagą lub otyłością należy zaproponować intensywną, rodzinną terapię zachowań zdrowotnych i stylu życia (co najmniej 26 godzin kontaktu w ciągu 3–12 miesięcy). ',
    'Weight goals by age and BMI percentile (Expert Committee 2007): maintenance while growing for most; if loss is appropriate, no more than ~0.5 kg per month (younger children) or ~0.9 kg per week (severe obesity, older children and teens). ':
      'Cele zależą od wieku i percentyla BMI (Komitet Ekspertów 2007). U większości dzieci zaleca się utrzymanie masy ciała podczas wzrostu. Jeśli redukcja jest wskazana, nie powinna przekraczać około 0,5 kg miesięcznie u młodszych dzieci ani około 0,9 kg tygodniowo u starszych dzieci i nastolatków z ciężką otyłością. ',
    'Energy shown is the National Academies requirement for healthy growth at the chosen activity level, not a deficit target. ':
      'Pokazana energia to zapotrzebowanie według National Academies na zdrowy wzrost przy wybranym poziomie aktywności, a nie cel kalorii na redukcję. ',

    'Deliberately left out': 'Celowo pominięte',
    '"Ideal body weight" formulas</b> (Devine, Robinson, Miller, Hamwi) come from drug dosing and insurance tables, not health outcomes. The healthy BMI range is shown instead.':
      'Formuły „idealnej masy ciała”</b> (Devine, Robinson, Miller, Hamwi) pochodzą z tabel dawkowania leków i ubezpieczeń, a nie z wyników zdrowotnych. Zamiast nich pokazujemy prawidłowy zakres BMI.',
    '"New BMI" (weight × 1.3 ÷ height^2.5)</b> has not been validated against health outcomes.':
      '„Nowe BMI” (masa ciała × 1,3 ÷ wzrost^2,5)</b> nie zostało sprawdzone względem wyników zdrowotnych.',
    'Fixed activity multipliers</b> and the <b>3,500 kcal rule</b> for anything beyond a few weeks (see above).':
      'Stałe mnożniki aktywności</b> oraz <b>reguła 3500 kcal</b> stosowane w planach dłuższych niż kilka tygodni (patrz wyżej).',
    'Bathroom-scale body fat</b> as an override: consumer bioimpedance varies by several percentage points with hydration.':
      'Wynik tkanki tłuszczowej z wagi łazienkowej</b> jako zastępstwo dla oszacowania: bioimpedancja w wagach konsumenckich zmienia się o kilka punktów procentowych wraz z nawodnieniem.',
  });

  /* ---- Mechanics --------------------------------------------------------------------- */
  // Dictionary keys short/common enough to turn up as a substring of unrelated English text
  // (e.g. 'mo' inside "months"/"model"/"thermogenesis") - safe for t()'s exact per-element
  // data-i18n lookup, excluded from apply()'s substring-matching bigRegex.
  const EXACT_ONLY = new Set(['yr', 'mo', 'weeks', 'Edit', 'Men', 'Women', 'men', 'women']);
  let bigRegex = null;
  function buildRegex() {
    const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const keys = Object.keys(PL).filter((k) => !EXACT_ONLY.has(k)).sort((a, b) => b.length - a.length);
    bigRegex = new RegExp(keys.map(esc).join('|'), 'g');
  }

  function setLocale(l) { locale = l; }
  function getLocale() { return locale; }

  /** Single short string: exact match against the dictionary. */
  function t(s) { return (locale === 'pl' && Object.prototype.hasOwnProperty.call(PL, s)) ? PL[s] : s; }

  /** A whole rendered HTML/text blob: ordered longest-first phrase substitution.
   *  <div class="formula"> blocks and data-tip="..." attributes are protected first (swapped
   *  for placeholders, restored after). Formula blocks are numbered/technical notation, not
   *  prose, so a dictionary word like "Age" or "South Asian" turning up inside one (e.g. in a
   *  threshold table's fine print) must not get mid-string substituted the way it would in
   *  ordinary text. data-tip holds a "?" hint's raw English sentence, re-translated on its own
   *  via i18n.t() by app.js's bindHints() at hover time (see .hint there) - a mid-string
   *  substitution here would leave it a mixed EN/PL string that no longer exact-matches the
   *  dictionary, so it must reach the DOM untouched. */
  function apply(html) {
    if (locale !== 'pl' || !html) return html;
    if (!bigRegex) buildRegex();
    const protectedBlocks = [];
    const protect = (m) => { protectedBlocks.push(m); return `\x00PROTECTED${protectedBlocks.length - 1}\x00`; };
    const shielded = html
      .replace(/<div class="formula">[\s\S]*?<\/div>/g, protect)
      .replace(/data-tip="[^"]*"/g, protect);
    const translated = shielded.replace(bigRegex, (m) => PL[m]);
    return translated.replace(/\x00PROTECTED(\d+)\x00/g, (_, i) => protectedBlocks[+i]);
  }

  FH.i18n = { setLocale, getLocale, t, apply, PL, HERO_PL };
})(typeof self !== 'undefined' ? self : this);
