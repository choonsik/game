# Manhattan Heli: Specification

Spec version: 0.4.0

The requirement list is in [requirements.md](requirements.md). This file gives the context for those requirements.

## 1. Purpose

The game is a helicopter flight game. The player flies over a real city and avoids buildings. The player must reach a destination.

The picture uses clean line art. It does not try to look real.

## 2. Scope

Included in this version:

- One stage: Midtown Manhattan, an area of 1.8 km by 1.8 km around Times Square.
- One aircraft: a helicopter with a chase camera.
- Four goals in order: three checkpoints and one destination.

Not included in this version:

- More cities.
- Fuel, time limits, and score.
- Terrain height.
- Sound.
- Touch controls.

## 3. Architecture

| Part | File | Task |
|---|---|---|
| Map data | `public/data/manhattan.json` | Buildings, roads, parks, and water in local meters. |
| Data script | `scripts/fetch-osm.mjs` | Gets OpenStreetMap data and writes the JSON file. |
| City | `src/city.ts` | Loads data, builds line art, checks collisions. |
| Helicopter | `src/heli.ts` | Model, flight rules, pose. |
| Game | `src/main.ts` | Rules, camera, HUD, labels, test hook. |
| Text | `src/strings.ts` | All player text. |

Technology: TypeScript, Vite, and Three.js. The output is static files.

Coordinates: x is east, z is south, y is up. Unit is the meter. The yaw angle 0 faces north (negative z).

## 4. Design decisions

| Decision | Reason |
|---|---|
| Use OpenStreetMap outlines and a script. Do not use Cesium ion 3D Tiles. | Tile meshes merge many buildings. This makes clean edge lines and exact collisions hard. |
| Cesium ion stays open for terrain height in a later version. | The project owner has an account. Terrain is not in scope now. |
| One stage for each city. A stage has a goal. | A goal gives the player a reason to fly. Free flight has no goal. |
| Start with Manhattan. | OpenStreetMap height data is good there. The tall buildings make the game hard. |
| Fill each building with the background color. | The fill hides lines behind it. This gives the clean line-art look. |
| Show few building names. | At 14 names the screen was not readable. One focus name and four landmark names are enough. |
| Make near lines brighter. | The player sees depth. A WebGL line is always 1 pixel wide, so color and fade give the effect. |

## 5. Known limits

- OpenStreetMap has no height for about 10 percent of the buildings. The game uses 18 m for them.
- Name labels do not hide behind buildings.
- Checkpoint positions are not final. They are not yet at landmarks (REQ-GAME-011).

## 6. Change control

One version number covers the spec, the tests, and the code. It is in `package.json`. These files must show the same number:

- `package.json`
- `docs/spec/requirements.md` (line `Spec version`)
- `docs/spec/CHANGELOG.md` (newest heading)
- `tests/suite.json`
- `docs/spec/verification.lock.json`

`npm run req:check` fails if the numbers differ.

Version rules:

- MAJOR: a change removes an implemented requirement or changes its meaning.
- MINOR: a change adds a requirement.
- PATCH: a fix or a wording change.

### Regression rules

Each new feature must not break an old feature. These rules enforce this:

1. `npm run verify` runs all tests for all requirements. It does not run only the new tests.
2. Each implemented requirement needs one automatic test or one manual check.
3. `verification.lock.json` lists the tests of each requirement. If a locked test disappears, the check fails.
4. To remove a test, first set its requirement to `deprecated`. Then bump the version.
5. If the text of a requirement changes and the version does not change, the check fails.

### Procedure for a new feature

1. Add the requirement with status `planned`. Write the test.
2. Write the code until the test passes.
3. Set the status to `implemented`.
4. Increase the version in all five files.
5. Add an entry to CHANGELOG.md.
6. Run `npm run req:lock`. Then run `npm run verify`.

## 7. Verification

| Command | Task |
|---|---|
| `npm run req:check` | Checks versions, requirement coverage, and the lock file. |
| `npm run text:check` | Checks the text rules. |
| `npm test` | Unit tests for data, collision, flight, and rendering geometry. |
| `npm run e2e` | Starts the game in a headless browser. Plays the mission. Checks the screen. |
| `npm run verify` | Runs all of the above. |

The e2e run saves a screenshot in `artifacts/`. Manual checks are in [MANUAL-CHECKS.md](MANUAL-CHECKS.md).

## 8. Text rules

All player text and all spec text follow [TEXT-RULES.md](TEXT-RULES.md).

