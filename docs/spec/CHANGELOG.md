# Changelog

Newest version first. The first heading must show the current version.

## 0.5.0 (2026-11-18)

- Added the deploy pipeline for GitHub Pages (REQ-DEP-002).
- Made the build run from a subpath. The data URL now uses the base URL (REQ-DEP-001).
- The e2e test now builds the site with the /game/ base and plays it.
- The e2e test now stops its servers on Linux as well as on Windows.

## 0.4.0 (2026-11-18)

- Added the OpenStreetMap credit on every screen (REQ-MAP-005).
- Added README, LICENSE (MIT), and NOTICE with the ODbL data license (REQ-PUB-001).
- Added the publication check to the unit tests. The text check now covers README.md and NOTICE.md.

## 0.3.0 (2026-11-18)

- Added this spec, the requirement list, and the change-control rules.
- Added the verification harness: unit tests, e2e test, requirement check, and text check.
- Added REQ-PERF-001, REQ-PLAT-001, REQ-TXT-001.
- Added planned requirements REQ-GAME-011, REQ-GAME-012, REQ-MAP-005.
- Changed all player text to English. It now follows the text rules.

## 0.2.0 (2026-11-18)

- Added roads, parks, and water (REQ-MAP-002).
- Added unknown-height marking (REQ-MAP-003).
- Fixed the black vertical lines (REQ-VIS-002). The cause was a square root of a small negative number.
- Added name labels with a clutter limit (REQ-LBL-001 to REQ-LBL-004).
- Added distance-based line brightness (REQ-VIS-003).
- Added key L (REQ-CTL-003).

## 0.1.0 (2026-11-18)

- First prototype: Manhattan, 2912 buildings, helicopter, four goals, crash and restart.

Note: the design discussion gives versions 0.1.0 and 0.2.0 after the fact. They had no automatic tests. Version 0.3.0 adds the tests.
