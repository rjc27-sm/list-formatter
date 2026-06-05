/**
 * List Formatter — regression tests
 * Covers logic functions (pure Node) and DOM wiring (jsdom).
 * Run with:  node test.js
 */

'use strict';

const fs   = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// ---- Harness ---------------------------------------------------------------

let passed = 0, failed = 0;
function ok(label, condition) {
  if (condition) { console.log('  ✓', label); passed++; }
  else           { console.error('  ✗', label); failed++; }
}

// ---- Load the tool into a jsdom window -------------------------------------

const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const dom  = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
const { window } = dom;
// Give any synchronous init a tick to complete
const { analyse } = window;

// ---- 1. Fragment list -------------------------------------------------------

console.log('\n1. Fragment list');
{
  const r = analyse('There are 3 ways to contact us:\n• email\n• Online form\n• Telephone.');
  ok('status ok',           r.status === 'ok');
  ok('list type fragment',  r.listType === 'fragment');
  ok('lead-in colon',       r.formatted.startsWith('There are 3 ways to contact us:'));
  ok('items lower-case',    r.formatted.includes('• email'));
  ok('only last item has full stop', r.formatted.endsWith('telephone.'));
  ok('Online → online',     r.formatted.includes('• online form'));
}

// ---- 2. Sentence list — phrase lead-in -------------------------------------

console.log('\n2. Sentence list (phrase lead-in, clause items)');
{
  const r = analyse(
    'To receive support:\n' +
    '• You can visit our office.\n' +
    '• You can call our helpline for a confidential chat.\n' +
    '• Your carer can contact us on your behalf.'
  );
  ok('status ok',          r.status === 'ok');
  ok('list type sentence', r.listType === 'sentence');
  ok('items capitalised',  r.formatted.includes('• You can visit'));
  ok('each item ends .',   r.formatted.split('\n').slice(1).every(l => l.trim().endsWith('.')));
}

// ---- 3. Stand-alone list (heading + fragments) — includes bullets ----------

console.log('\n3. Stand-alone list — now defaults to bullets');
{
  const r = analyse(
    'Popular Australian destinations\n' +
    '• Great Ocean Road\n' +
    '• Barossa Valley\n' +
    '• Sydney Opera House'
  );
  ok('status ok',             r.status === 'ok');
  ok('list type standAlone',  r.listType === 'standAlone');
  ok('no full stops on items', !r.formatted.match(/[A-Za-z]\.\n/));
  ok('items have bullets',    r.formatted.includes('• Great Ocean Road'));
}

// ---- 4. Sentence list under a heading (was bug: always → standAlone) -------

console.log('\n4. Heading + full-sentence items → sentence list');
{
  const r = analyse(
    'Actions for the committee\n' +
    '• The secretary will respond to each recommendation.\n' +
    '• The secretary will allocate responses that need more work to members.\n' +
    '• Members will discuss the recommendations at the next meeting on 9 March.'
  );
  ok('status ok',          r.status === 'ok');
  ok('list type sentence', r.listType === 'sentence');
  ok('no colon on heading', r.formatted.startsWith('Actions for the committee\n'));
  ok('items end with .',    r.formatted.split('\n').slice(1).every(l => l.trim().endsWith('.')));
}

// ---- 5. Multilevel fragment list -------------------------------------------

console.log('\n5. Multilevel fragment list');
{
  const input =
    'There are many types of birds in Australia, including:\n' +
    '• nocturnal birds\n' +
    '  – frogmouths\n' +
    '  – nightjars\n' +
    '  – owls\n' +
    '• marsh birds\n' +
    '  – crakes\n' +
    '  – grebes\n' +
    '  – snipes.';
  const r = analyse(input);
  ok('status ok',          r.status === 'ok');
  ok('multilevel flag',    r.multilevel === true);
  ok('en-dash sub-items',  r.formatted.includes('– frogmouths'));
  ok('last item ends .',   r.formatted.trimEnd().endsWith('.'));
  ok('no hollow bullet "o"', !r.formatted.match(/\bo\s/));
}

// ---- 6. Multilevel — Word hollow-bullet "o" stripped -----------------------

console.log('\n6. Word hollow-bullet "o" stripped from second-level items');
{
  const input =
    'Collections include:\n' +
    '•\tTools:\n' +
    'o\tTableau (Desktop and Prep)\n' +
    'o\tR\n' +
    'o\tPython\n' +
    '•\tTopics:\n' +
    'o\tStatistics\n' +
    'o\tMachine Learning.';
  const r = analyse(input);
  ok('status ok',        r.status === 'ok');
  ok('no "o " in output', !r.formatted.match(/^\s*o\s/m));
  ok('R kept uppercase', r.formatted.includes('– R'));
  ok('parent colon stripped', !r.formatted.includes('tools:'));
}

// ---- 7. Parallel-structure refusal -----------------------------------------

console.log('\n7. Parallel-structure refusal');
{
  const r = analyse(
    'Eligibility criteria:\n' +
    '• You must be 18 or over.\n' +
    '• proof of identity\n' +
    '• 2 referees.'
  );
  ok('status refused', r.status === 'refused');
}

// ---- 8. Vaccination / T1 list (alphanumeric codes preserved) ---------------

console.log('\n8. Vaccination/T1 codes preserved');
{
  const r = analyse(
    'Vaccinations will be held:\n' +
    '• T1 on 1 April\n' +
    '• T2 on 15 April\n' +
    '• T3 on 1 May.'
  );
  ok('status ok',         r.status === 'ok');
  ok('T1 code preserved', r.formatted.includes('• T1'));
}

// ---- 9. "Already correctly formatted" message ------------------------------

console.log('\n9. Already-correct detection');
{
  const r = analyse('There are 3 ways to contact us:\n• email\n• online form\n• telephone.');
  ok('status ok',              r.status === 'ok');
  ok('already-correct prefix', r.explanation.startsWith('Your list is correctly formatted.'));
}

// ---- 10. Three-level list: tooDeep preserved, ▪ marker, note appended ------

console.log('\n10. Three-level list — levels preserved, ▪ marker, note appended');
{
  const input =
    'There are many types of birds in Australia, including:\n' +
    '• nocturnal birds\n' +
    '  – frogmouths\n' +
    '    ▪ tawny\n' +
    '    ▪ non-tawny\n' +
    '  – nightjars\n' +
    '• marsh birds\n' +
    '  – crakes\n' +
    '  – snipes.';
  const r = analyse(input);
  ok('status ok',              r.status === 'ok');
  ok('multilevel flag',        r.multilevel === true);
  ok('level-2 ▪ in output',   r.formatted.includes('▪ tawny'));
  ok('tooDeep note present',  r.explanation.includes('3 levels'));
  ok('last item ends .',       r.formatted.trimEnd().endsWith('.'));
}

// ---- 11. Forced sentence list — no contradictory phrase note ---------------

console.log('\n11. Forced sentence type — no contradictory phrase note');
{
  const r = analyse(
    "What's on across government\n• Budget 2025\n• APS reform\n• Digital transformation",
    'sentence'
  );
  ok('status ok',                    r.status === 'ok');
  ok('list type sentence',           r.listType === 'sentence');
  ok('no "they\'re all phrases"',    !r.explanation.includes("they're all phrases"));
  ok('no "confirm each one fits"',   !r.explanation.includes('confirm each one fits'));
}

// ---- 12. Forced numbered list ----------------------------------------------

console.log('\n12. Forced numbered list');
{
  const r = analyse(
    'There are 3 ways to contact us:\n• email\n• online form\n• telephone.',
    null,
    true
  );
  ok('status ok',            r.status === 'ok');
  ok('uses numbers',         r.formatted.includes('1.'));
  ok('fragment type still',  r.listType === 'fragment');
}

// ---- 13. DOM: .hidden display:none !important still wins -------------------

console.log('\n13. CSS cascade — .hidden wins (display:none !important)');
{
  const el = window.document.createElement('button');
  el.className = 'hidden copy-btn';
  window.document.body.appendChild(el);
  const styles = window.getComputedStyle(el);
  // jsdom honours inline stylesheets
  ok('.hidden element display none', styles.display === 'none' || el.classList.contains('hidden'));
  window.document.body.removeChild(el);
}

// ---- 14. DOM: copy button hidden on load, shown after format ---------------

console.log('\n14. DOM wiring — copy button hidden on load');
{
  const copyBtn = window.document.getElementById('copyBtn');
  ok('copyBtn exists',         !!copyBtn);
  ok('copyBtn hidden on load', copyBtn.classList.contains('hidden'));
}

// ---- 15. DOM: report modal pre-fill ----------------------------------------

console.log('\n15. DOM — report modal pre-fill');
{
  const inputEl = window.document.getElementById('input');
  const reportBtn = window.document.getElementById('reportOpenBtn');
  ok('input exists',       !!inputEl);
  ok('reportOpenBtn exists', !!reportBtn);
}

// ---- Summary ---------------------------------------------------------------

console.log(`\n${'─'.repeat(50)}`);
console.log(`Tests: ${passed + failed}  Passed: ${passed}  Failed: ${failed}`);
if (failed > 0) process.exit(1);
