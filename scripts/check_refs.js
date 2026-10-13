/* Verifies every citation in public/js/core/refs.js:
 *  - DOI links: resolved via the Crossref API; prints the registered title so it can be compared.
 *  - PubMed links: title fetched from NCBI E-utilities.
 *  - Other links: HTTP status of the page.
 * Run:  node scripts/check_refs.js      (needs network access; Node 18+) */
const path = require('path');
const refs = require(path.join(__dirname, '..', 'public', 'js', 'core', 'refs.js')).all;
const UA = 'WeightFrame-refcheck/1.0 (reference verification)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function check(r) {
  if (r.url.startsWith('https://doi.org/')) {
    const doi = r.url.slice('https://doi.org/'.length);
    const res = await fetch('https://api.crossref.org/works/' + encodeURIComponent(doi), { headers: { 'User-Agent': UA } });
    if (!res.ok) return ['BAD', res.status, 'Crossref has no record'];
    const m = (await res.json()).message;
    return ['OK', 200, `${(m.title || [''])[0]} | ${(m['container-title'] || [''])[0]} ${((m.issued || {})['date-parts'] || [[''] ])[0][0]}`];
  }
  const pm = r.url.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/);
  if (pm) {
    await sleep(400); // NCBI allows ~3 requests/second without a key
    const res = await fetch(`https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=${pm[1]}&retmode=json`, { headers: { 'User-Agent': UA } });
    const j = (await res.json()).result[pm[1]];
    return j && j.title ? ['OK', 200, `${j.title} | ${j.source} ${j.pubdate}`] : ['BAD', res.status, 'PMID not found'];
  }
  const res = await fetch(r.url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow' });
  // Some government sites refuse scripted requests; that is not a broken link.
  if ([401, 403, 429, 503].includes(res.status)) return ['WARN', res.status, 'site blocks automated checks - open manually'];
  return [res.ok ? 'OK' : 'BAD', res.status, 'page'];
}

(async () => {
  let bad = 0;
  for (const r of Object.values(refs)) {
    let out;
    try { out = await check(r); } catch (e) { out = ['ERR', 0, e.message]; }
    if (out[0] === 'BAD' || out[0] === 'ERR') bad++;
    console.log(`${out[0].padEnd(4)} ${r.id.padEnd(18)} ${String(out[2]).replace(/\s+/g, ' ').slice(0, 110)}`);
  }
  console.log(`\n${Object.keys(refs).length} references, ${bad} problem(s).`);
  process.exitCode = bad ? 1 : 0;
})();
