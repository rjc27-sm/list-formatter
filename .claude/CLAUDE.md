# CLAUDE.md — List Formatter tool

Guidance for Claude Code when working on this project. Australian English throughout.

## Purpose

A browser tool that formats lists to the **Australian Government Style Manual**. A writer pastes a rough list; the tool works out the list type, fixes the punctuation, capitalisation and markers, and explains what it did. When the items can't be safely formatted (for example, they aren't parallel) it refuses and tells the writer what to fix, rather than guessing.

It is being tested by professional editors, so correctness and Style Manual compliance matter more than cleverness.

## Architecture and hard constraints

- **One self-contained HTML file.** All HTML, CSS and JavaScript live in a single file (`index.html` in the GitHub Pages repo; the working copy is `list-formatter-tool.html`).
- **No build step, no frameworks, no runtime dependencies, no `node_modules` at runtime.** Keep it a single static file. (`jsdom` is installed as a dev dependency for the test suite only — it never ships to users.)
- **No network calls and no AI at runtime.** The tool is pure rule-based JavaScript. Nothing the user types is sent anywhere. Do not add API calls, model calls, analytics or external scripts.
- **No browser storage.** Do not use `localStorage`/`sessionStorage`; keep state in memory.
- Served over **HTTPS** (GitHub Pages), which the clipboard features rely on.

The inline `<script>` is organised as **pure logic functions first, then DOM wiring**. When changing logic, work on the pure functions and verify them in isolation (see Testing) before touching the DOM glue.

A small second `<script>` block at the very bottom powers the **'Try an example' chips** (`loadExample()`). It only sets the textarea value and calls the existing `analyseList()`. It adds no logic and no dependencies — do not grow it.

## How the tool decides the list type (intent — don't regress this)

Detection is **item-driven**, not lead-in-only. (An earlier "simplified" rule — *phrase lead-in always equals a fragment list* — was deliberately abandoned. Do not reinstate it.)

- **Heading + full-sentence items** (subject + finite verb detected) → sentence list. The Style Manual explicitly allows sentence lists under a heading. Do **not** revert to treating all headings as stand-alone. This rule applies in both single-level (`detect()`) and multilevel (`analyseMultilevel()`) detection — do not reinstate the old `analyseMultilevel` behaviour where a heading always produced a stand-alone list.
- **Heading + fragment/phrase items** → stand-alone list.
- **All items are independent statements** ("You must…") → sentence list, even under a label/phrase lead-in (e.g. "Eligibility criteria:").
- **All items are noun phrases or gerunds** → fragment list, even when the lead-in reads like a full sentence (the items complete it, e.g. "…will be held: T1…").
- **Imperative items** ("use everyday words") can sit in either, so they follow the lead-in: a complete-sentence lead-in → sentence list; a phrase lead-in → fragment list.

Agreed simplification to keep: when a phrase lead-in is **completed by its items** (including imperative items), it is a fragment list. A label-style lead-in followed by standalone statements is the separate sentence-list case.

'Full sentence' is proxied by `classifyItem()` returning `'clause'`: subject pronoun (I/you/we/they/he/she/it) at the start, or a noun + finite auxiliary/linking verb (is/are/will/has/does/was/were etc.) within the first two words. Dependent clauses don't trigger this.

## Parallel-structure gate

The tool refuses (and explains) only for mismatches it can detect **reliably**:

- an independent statement mixed with non-statements, and
- a command mixed with gerund phrases.

It deliberately **does not** refuse on an imperative-vs-noun-phrase mix (too ambiguous to detect, and the Style Manual's own sentence-list example mixes them). Explanations remind the writer to confirm parallelism. For multilevel lists, each level is checked separately.

## Output and formatting rules

- **Fragment list:** items lower-case (unless they start with a proper noun, acronym or alphanumeric code such as `T1`/`AIHW`); only the final item takes a full stop.
- **Sentence list:** each item starts with a capital and ends with a full stop. When the lead-in is a heading, **no colon is added** — headings take no punctuation.
- **Stand-alone list:** each item starts with a capital and takes no end punctuation; items use **bullet markers by default** (same as sentence and fragment lists). The heading is rendered **in bold in the output panel** (CSS/HTML only; copied plain text is unbolded).
- **Punctuation cleanup:** strip trailing semicolons, commas and a trailing 'and'/'or'.
- **Capitalisation pass:** safely lower-case obvious mid-sentence verbs; *flag* (don't change) other mid-sentence capitals because of proper-noun risk; preserve acronyms and codes.
- **Fragment first-character lowercasing:** `lowerFirstUnlessProper()` lowercases the first character of each fragment item by default. It preserves: alphanumeric codes (e.g. `T1`, `M365`), all-caps words including single letters (e.g. `R`, `AIHW`), and words in `PROPER_HINT`. When it lowercases words, the explanation lists them and prompts editors to restore any proper nouns (product names, organisations).
- **Numbered lists:** preserve numbering when the input is numbered. Selecting 'Numbered' in the type selector forces numbered output regardless of input markers; the list sub-type (sentence/fragment/stand-alone) is still auto-detected.
- **Multilevel lists:** the Style Manual recommends a maximum of 2 levels. The tool formats up to 3 levels and flags anything beyond 2. First level uses bullets or numbers; **second level uses `–`** for bullet lists and lower-case letters (a, b, c) for numbered lists; **third level uses `▪` (filled square)** at 8-space indent. Detected via a combination of marker type and indentation. `parseHierarchy()` runs **marker-based detection first** so that `o`-bullet items (Word level-2) are correctly assigned even when they share the same leading indentation as level-1 items. `stripMarker()` and `markerKind()` recognise Word's hollow-bullet letter `o`, Unicode hollow circles, and `▪`/`■` filled-square markers. Trailing colons are stripped from parent-level items (e.g. 'Tools:' → 'tools'). The parallel-structure gate checks each level independently, including level 2.
- **Output uses literal characters by design.** Literal `•`, `–`, `▪`, letters and spaces guarantee the Style-Manual-correct markers regardless of Word's defaults. Do **not** switch the default output to native Word/HTML lists — Word's automatic second-level marker is a hollow circle, which the Style Manual prohibits.
- **'Already correctly formatted' behaviour:** after formatting, the tool compares the normalised raw input against the output. If identical, the output panel shows 'Your list is correctly formatted.' and the Copy button is hidden (nothing to copy — the input is unchanged). The explanation panel still appears and describes the list type.

## Design philosophy (non-negotiable)

- **Never output incorrect formatting.** Better to refuse with clear guidance than to produce a wrong result.
- **Don't rewrite or reword the user's content.** Only adjust formatting, capitalisation and punctuation. Flag problems; never invent a rewrite.
- The logic is **heuristic, not a grammar parser.** It can't catch every parallelism breach; keep explanations honest about that rather than over-claiming.

## User-facing text — must follow the Style Manual

All user-facing copy (UI labels, the 'Explanation' panel text, error messages, guide cards, the report form) **must comply with the Australian Government Style Manual**.

**Before adding or changing any user-facing text, review it with the `aust-style-manual-review` skill.**

Concrete conventions that always apply:

- **Australian English** spelling (organise, recognise, colour, behaviour, lower-case).
- **Single quotes** in user-facing text, not double.
- **En dashes (`–`)**, never em dashes (`—`); spaced en dash when used as punctuation. Use the real character, never the literal escape `\u2013`.
- **Sentence case**, not title case — including headings and the guide cards.
- Plain language and **minimal capitals** (generic role titles such as 'unit head' are lower-case).

Note: the tool's *output* is itself Style Manual list formatting; this section is about the surrounding interface copy, which must also follow the Manual's *writing* rules.

## Testing (do this before shipping any change)

Logic bugs here are subtle, so verify changes rather than eyeballing them.

**Run `node test.js` from the repo root.** This is the canonical regression suite (49 assertions). It covers:
- Pure logic: fragment/sentence/stand-alone/multilevel detection, parallel-gate refusal, capitalisation, `T1`-code preservation, hollow-bullet stripping, already-correct detection.
- Three-level list: `▪` marker in output, `tooDeep` note present.
- Forced type overrides (sentence, numbered).
- DOM wiring: copy button hidden on load, report modal elements present.
- CSS cascade: `.hidden { display: none !important; }` must stay so the utility class always wins — don't remove the `!important`.

Keep the documented Style Manual examples and the real test lists passing (eligibility criteria, the vaccination/`T1` list, the skin-check list, the bird multilevel list, the 'Actions for the committee' heading-sentence list, the tools/topics multilevel list, the three-level birds list, etc.). When adding new behaviour, add a corresponding assertion to `test.js`.

## UI layout and design tokens

The current design uses **Open Sans** (loaded from Google Fonts) and a blue/teal AIHW-adjacent palette — no AIHW brandmark, no Australian Government lockup.

Key design tokens (defined in `:root`):
- Primary: `--blue #2d7e98`, `--b1 #192f38`, `--b2 #295665`, `--b4 #61a9be`, `--b5 #b7d6df`
- Refusal accent: `--orange #f36f21` (panel bg `#fdf3ec`, border `#f4d4bd`, heading `--o2 #863a0d`)
- Copy-success: `--teal #27854e`
- Page bg: `--bg #f6f7f7`; card border: `--line #e3e6e6`

Layout: centred single column, `max-width: 960px`, 4px blue keyline across the top. A `1fr 1fr` grid holds the input and output cards. Below the grid (in order): the **List type** pill-radio row, the refusal/explanation panel, the action buttons, the report link, the guide, and a source credit.

The **List type selector** sits below the output panel, not inside the input panel. The selected pill uses `:has(input:checked)` styling. Options: Auto-detect, Sentence, Fragment, Stand-alone, Multi-level, Numbered. Multi-level and Numbered both map to `null` for the list sub-type (detection is structural/auto); Numbered also forces `numbered = true` in the formatters.

The **'Explanation' panel** (formerly 'Why this works') appears immediately below the two-panel grid after formatting — no scrolling needed.

The **'Copy list' button** lives in the output panel card footer, clearly scoped to the formatted output.

Sentence list `parallelNote` is suppressed when items are classified as phrases — avoids the contradiction 'this is a sentence list … items are all phrases'. The `closingCheck` for sentence lists says 'confirm each item reads as a complete sentence', not 'confirm each one fits' (fragment language).

## Paste handler

The textarea has a `paste` event listener that reads the HTML clipboard data (Word and Google Docs both provide this alongside plain text). It uses `DOMParser.parseFromString(html, 'text/html')` — not `div.innerHTML` — to parse the clipboard HTML as a full document, which avoids Word's `<style>` block being dumped as visible text.

For Word format, it selects list paragraphs with `[style*="mso-list"][style*="level"]`. The two-attribute selector is deliberate: bullet-placeholder spans carry only `mso-list:Ignore` (no `level`), so they are excluded automatically. The `[style*="Ignore"]` clone-removal is a belt-and-braces fallback for any stray glyph that slips through.

For standard HTML lists (`<ul>/<ol>/<li>`), it walks the nesting depth to assign `•` / `–` / `▪` markers.

If the HTML contains no recognisable list structure, the handler returns `null` and the browser's default paste behaviour runs unchanged.

**Do not** replace `DOMParser` with `div.innerHTML` for parsing full Word HTML — it produces broken DOM structure and leaks `<style>` content as visible text.

## Deployment and updates

- Hosted on **GitHub Pages**; the file is `index.html` at the repo root.
- To update: replace `index.html`, commit, and push. The GitHub CDN can cache for a few minutes, so hard-refresh (Ctrl/Cmd+Shift+R) to confirm.

## Feedback mechanism

- A **"Report an issue"** form pre-fills the original list and the tool's output (or its refusal message), the writer adds what they expected plus notes, then **Copy report** (robust clipboard with an `execCommand` fallback, then text selection) or **Email report**.
- Email goes to a **dedicated, disposable address** (`listformatterfeedback@gmail.com`). It is intentionally public — leave it in place.
- A pre-filled Google Form is a possible future upgrade for guaranteed capture (email can be silently lost via spam or an unconfigured mail client).

## Guardrails — please don't

- Add frameworks, build tooling, **runtime** dependencies, network calls or any runtime AI.
- Convert the default output to native Word/HTML lists (reintroduces the non-compliant hollow second-level bullet).
- Reinstate the old "phrase lead-in is always a fragment list" simplification.
- Reinstate the old "heading is always a stand-alone list" rule — heading + full-sentence items is a sentence list (applies to both single-level and multilevel detection).
- Remove the `!important` on `.hidden`, the disposable feedback address, or the clipboard fallbacks.
- Ship user-facing copy without checking it against the Style Manual skill.
- Add 'not a hollow bullet' back to the multilevel explanation text (was removed as ambiguous).
- Move the List type selector back inside the input panel — it lives below the output panel now.
- Reintroduce a phrase-based parallel note for sentence lists — it contradicts the sentence-list classification.
- Replace `DOMParser` with `div.innerHTML` in the paste handler — `div.innerHTML` dumps Word's `<style>` block as visible text and produces an unreliable DOM.
- Collapse three-level list items to two levels — preserve all detected levels and show the Style Manual note instead.
