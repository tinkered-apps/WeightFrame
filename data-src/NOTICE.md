# Growth reference data

The files in this folder are unchanged downloads from the World Health
Organization and the US Centers for Disease Control and Prevention, fetched on
10 September 2026. `scripts/build_growth_data.py` copies their L, M and S values,
without altering them, into `public/js/data/growth-refs.js`, which the app loads.

Neither WHO nor CDC endorses WeightFrame or the way it uses these data, and
their names and logos are not used to suggest that they do. The data are free
on the agencies' own websites, linked below.

## WHO

| File | Dataset |
|---|---|
| `who2006_boys.xlsx`, `who2006_girls.xlsx` | WHO Child Growth Standards (2006), BMI-for-age, expanded tables, birth to 5 years. [Source page](https://www.who.int/toolkits/child-growth-standards/standards/body-mass-index-for-age-bmi-for-age) |
| `who2007_boys.xlsx`, `who2007_girls.xlsx` | WHO Growth Reference (2007), BMI-for-age, expanded tables, 5 to 19 years. [Source page](https://www.who.int/tools/growth-reference-data-for-5to19-years/indicators/bmi-for-age) |

Source: World Health Organization. Accessed 10 September 2026. © WHO.

WHO lets its datasets be reproduced and distributed in products for public
health purposes, with attribution, and not for or in conjunction with the
promotion of a commercial enterprise. See its
[terms for the use of datasets](https://www.who.int/about/policies/publishing/data-policy/terms-and-conditions)
and its [copyright and licensing page](https://www.who.int/about/policies/publishing/copyright).
WeightFrame is a non-commercial project. Using these files in anything
commercial needs WHO's permission first.

## CDC

| File | Dataset |
|---|---|
| `cdc_bmiagerev.csv` | CDC 2000 growth charts, BMI-for-age, 2 to 20 years. [Source file](https://www.cdc.gov/growthcharts/data/zscore/bmiagerev.csv) |

Source: CDC, National Center for Health Statistics. Most CDC material is in the
public domain and may be reproduced without permission, with credit to the
agency and no implied endorsement
([CDC's policy](https://www.cdc.gov/other/agencymaterials.html)).
