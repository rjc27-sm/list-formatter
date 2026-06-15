# Changelog

All notable changes to the Style Manual list formatter are recorded here. Dates use the day–month–year format.

## 15 June 2026

### Fixed

- A flat list bulleted with '-' is now detected as a single-level fragment list. It was wrongly labelled a multilevel list, because the dash is a child-level marker. `parseHierarchy()` now recomputes the multilevel flag from the levels that survive normalisation, so an all-dash list with no parent collapses to a single level. Dashes still mark a child level when a higher-level parent (for example a bullet item) is present, so genuine two-level lists are unaffected. This corrected the 'Grant eligibility' example, which now formats as a fragment list.

### Changed

- The introduction now explains that the tool only formats lists that have a heading or lead-in and whose items are parallel, fixes punctuation, capitals and bullet markers, and does not rewrite items.
- The tool now opens with an empty input, ready for content. The 'Grant eligibility' example is no longer pre-filled on load; use the 'Try an example' chips to load one.
- The stand-alone clause warning now points writers to the 'Sentence' option.

### Removed

- The manual list type override was removed. It was trialled during the day (a numbered 'Format as' step, then a 'Wrong list type?' correction panel below the explanation), but list type buttons imply the tool can reword items to fit a different type, which it cannot. The tool now relies on automatic list type detection; use 'Report an issue' if the detected type looks wrong. The underlying `analyse(forcedType)` logic and its limitation notes remain in the code for the test suite.

### Notes

- The 'Copy for Word' output was not changed. Its explicit level markers (bullet, en dash and filled square) and bold stand-alone heading were confirmed intact. A manual paste test in desktop Word and Word for the web is still required before relying on it after deploy.
