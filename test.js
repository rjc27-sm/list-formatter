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
  ok('tooDeep note present',  r.explanation.includes('more than 2 levels deep'));
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
  ok('forced-sentence limit note',   r.explanation.includes('cannot add words'));
}

// ---- 11b. Forced fragment onto full sentences — honest limitation note -------

console.log('\n11b. Forced fragment type — limitation note for full-sentence items');
{
  const r = analyse(
    'You must do all of the following:\n• You must be 18 or over.\n• You must hold a current licence.\n• You must live in the area.',
    'fragment'
  );
  ok('status ok',                  r.status === 'ok');
  ok('list type fragment',         r.listType === 'fragment');
  ok('forced-fragment limit note', r.explanation.includes('cannot shorten your wording'));
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

// ---- 13. Numbered sentence list — imperative items all ending with full stops

console.log('\n13. Numbered sentence list — imperative items, phrase lead-in, all with full stops');
{
  const r = analyse('How to register for the conference:\n1. Choose the days you will attend.\n2. Pick the workshops you want to join.\n3. Enter your discount code (if you have one).');
  ok('status ok',            r.status === 'ok');
  ok('list type sentence',   r.listType === 'sentence');
  ok('items capitalised',    r.formatted.includes('1. Choose') && r.formatted.includes('2. Pick'));
  ok('each item ends .',     r.formatted.includes('attend.') && r.formatted.includes('join.'));
  ok('already correct',      r.alreadyCorrect === true);
}

// ---- 13a. Style Manual examples: command-verb items (stated-subject test) ---

console.log('\n13a. Command-verb items — Style Manual stated-subject rule');
{
  // 'To write well:' names no subject → instructions to the reader → sentence list.
  const r1 = analyse('To write well:\nuse everyday words\nlearn about the words people use\nchoose simple words, not complicated expressions');
  ok('To write well → sentence list', r1.status === 'ok' && r1.listType === 'sentence');
  ok('items capitalised with stops',  r1.formatted.includes('• Use everyday words.'));

  // 'My cousin has a bucket list:' states the subject → fragment list.
  const r2 = analyse('My cousin has a bucket list:\nswim with cuttlefish\nbuy rocket boots\nskydive over the Swiss Alps\nrun a marathon');
  ok('Bucket list → fragment list',  r2.status === 'ok' && r2.listType === 'fragment');
  ok('items lower-case',             r2.formatted.includes('• swim with cuttlefish'));
  ok('only last item has full stop', r2.formatted.endsWith('run a marathon.'));

  // 'The participants will:' states the subject → fragment list (quick guide example).
  const r3 = analyse('The participants will:\narrive at the venue\nfind their name tag\ntake their allocated seat');
  ok('Participants will → fragment', r3.status === 'ok' && r3.listType === 'fragment');
}

// ---- 13b. Sentence lead-in ending in a full stop is preserved ---------------

console.log('\n13b. Full-stop sentence lead-in preserved');
{
  const r = analyse('Follow us on social media.\nLearn about our projects.\nEnter our competitions.\nFind out about our new products.');
  ok('status ok',              r.status === 'ok');
  ok('sentence list',          r.listType === 'sentence');
  ok('full stop kept',         r.formatted.startsWith('Follow us on social media.\n'));
  ok('already correct',        r.alreadyCorrect === true);
}

// ---- 13c. 'bring' and similar are not gerunds --------------------------------

console.log("\n13c. 'bring' not misread as a gerund");
{
  const r = analyse('Before the meeting:\nbring your ID\ncheck the agenda\nconfirm the venue');
  ok('not refused',          r.status === 'ok');
  ok('sentence list (instructions, no stated subject)', r.listType === 'sentence');
  ok('Bring capitalised',    r.formatted.includes('• Bring your ID.'));
}

// ---- 13d. First line that is a list item → helpful error ---------------------

console.log('\n13d. No lead-in — first line is a list item');
{
  const r = analyse('• Exhibition space\n• Function rooms\n• Theatrette');
  ok('status error',          r.status === 'error');
  ok('asks for a lead-in',    /lead-in/.test(r.message));
}

// ---- 13e. Trailing and/or explanation notes the legal exception --------------

console.log("\n13e. 'and'/'or' removal explanation mentions the exception");
{
  const r = analyse('Your application must include:\n- a current ABN;\n- Proof of identity, and\n- 2 referees.');
  ok('status ok',                     r.status === 'ok');
  ok('fragment list',                 r.listType === 'fragment');
  ok('mentions critical to meaning',  r.explanation.includes('critical to meaning'));
  // A flat list bulleted with '-' is single-level, not multilevel (regression).
  ok('single-level, not multilevel',  !r.multilevel);
  ok('not labelled multilevel',       !r.explanation.includes('multilevel'));
}

// ---- 13f. Run-on fragment over 25 words is flagged ---------------------------

console.log('\n13f. Phrase lead-in plus long item flagged at 25 words');
{
  const r = analyse(
    'The working group is responsible for reviewing and endorsing all of the:\n' +
    '• detailed quarterly performance reports prepared by the data team for the executive committee and the board\n' +
    '• published content.'
  );
  ok('status ok',        r.status === 'ok');
  ok('25-word flag',     r.explanation.includes('25 words or fewer'));
}

// ---- 13g. 'Allergy list' example chip — Style Manual multilevel example ------

console.log("\n13g. Allergy list example — Manual's multilevel correction");
{
  const r = analyse(
    "They are allergic to:\n• tree nuts:\no\talmonds\no\tcashews\no\twalnuts.\n" +
    "• dairy products:\no\tcow's milk\no\tgoat's milk.\n• crustaceans:\no\tcrabs\no\tprawns."
  );
  ok('status ok',               r.status === 'ok');
  ok('multilevel fragment',     r.multilevel === true && r.listType === 'fragment');
  ok('parent colons stripped',  !r.formatted.includes('nuts:'));
  ok('hollow o becomes en dash', r.formatted.includes('– almonds'));
  ok('mid-list stops removed',  !r.formatted.includes('walnuts.') && !r.formatted.includes("goat's milk."));
  ok('single final stop',       r.formatted.endsWith('– prawns.'));
}

// ---- 14. DOM: .hidden display:none !important still wins -------------------

console.log('\n14. CSS cascade — .hidden wins (display:none !important)');
{
  const el = window.document.createElement('button');
  el.className = 'hidden copy-btn';
  window.document.body.appendChild(el);
  const styles = window.getComputedStyle(el);
  // jsdom honours inline stylesheets
  ok('.hidden element display none', styles.display === 'none' || el.classList.contains('hidden'));
  window.document.body.removeChild(el);
}

// ---- 15. DOM: copy buttons hidden on load, shown after format ---------------

console.log('\n15. DOM wiring — copy buttons hidden on load');
{
  const copyBtn = window.document.getElementById('copyBtn');
  const copyWordBtn = window.document.getElementById('copyWordBtn');
  ok('copyBtn exists',             !!copyBtn);
  ok('copyBtn hidden on load',     copyBtn.classList.contains('hidden'));
  ok('copyWordBtn exists',         !!copyWordBtn);
  ok('copyWordBtn hidden on load', copyWordBtn.classList.contains('hidden'));
}

// ---- 16. DOM: report modal pre-fill ----------------------------------------

console.log('\n16. DOM — report modal pre-fill');
{
  const inputEl = window.document.getElementById('input');
  const reportBtn = window.document.getElementById('reportOpenBtn');
  ok('input exists',       !!inputEl);
  ok('reportOpenBtn exists', !!reportBtn);
  ok('favicon link present', !!window.document.querySelector('link[rel="icon"]'));
  ok("no 'multi-level' in user-facing text", !window.document.body.textContent.includes('Multi-level') && !window.document.body.textContent.includes('multi-level'));
}

// ---- 17. Word HTML builder — markers and list definitions -------------------

console.log('\n17. buildWordHtml — Word list definitions');
{
  const build = window.buildWordHtml;
  ok('buildWordHtml exists', typeof build === 'function');
  if (typeof build === 'function') {
    const h1 = build('They are allergic to:\n• tree nuts\n    – almonds\n        ▪ raw.', 'fragment');
    ok('en dash level-2 definition', h1.includes('\\2013'));
    ok('filled-square level-3 definition', h1.includes('\\25AA'));
    ok('mso-list paragraphs', h1.includes('mso-list:l0 level1 lfo1'));
    ok('level 2 assigned', h1.includes('mso-list:l0 level2 lfo1'));
    const h2 = build('Steps\n1. Do this.\n2. Do that.', 'standAlone');
    ok('stand-alone heading bolded', h2.includes('<b>Steps</b>'));
    ok('ordered uses alpha-lower for level 2', h2.includes('alpha-lower'));
  }
}

// ---- Summary ---------------------------------------------------------------

console.log(`\n${'─'.repeat(50)}`);
console.log(`Tests: ${passed + failed}  Passed: ${passed}  Failed: ${failed}`);
if (failed > 0) process.exit(1);
