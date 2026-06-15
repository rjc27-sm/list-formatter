# Changelog

All notable changes to the Style Manual list formatter are recorded here. Dates use the day–month–year format.

## 15 June 2026

### Fixed

- A flat list bulleted with '-' is now detected as a single-level fragment list. It was wrongly labelled a multilevel list, because the dash is a child-level marker. `parseHierarchy()` now recomputes the multilevel flag from the levels that survive normalisation, so an all-dash list with no parent collapses to a single level. Dashes still mark a child level when a higher-level parent (for example a bullet item) is present, so genuine two-level lists are unaffected. This corrected the 'Grant eligibility' example, which now formats as a fragment list.

### Added

- A scope statement in the header. It tells writers the tool formats lists to Style Manual rules, works out the list type, only handles parallel lists, and does not rewrite their items.
- Forced-type limitation notes. When a writer forces a type the items do not suit, the tool still formats mechanically but adds an honest note. Forcing a sentence list onto phrases explains the tool cannot add the missing subject and verb. Forcing a fragment list onto full sentences explains the tool cannot shorten the wording.
- Regression tests for the dash-only fix and the forced-type notes. The suite is now 97 assertions.

### Changed

- The list type selector heading is now 'Format as' (was 'List type'). A helper line under the heading states the tool formats items but cannot reword them to fit a type.
- The stand-alone clause warning now points writers to the 'Sentence' option, matching the wording of the new forced-type notes.

### Notes

- The 'Copy for Word' output was not changed. Its explicit level markers (bullet, en dash and filled square) and bold stand-alone heading were confirmed intact. A manual paste test in desktop Word and Word for the web is still required before relying on it after deploy.
