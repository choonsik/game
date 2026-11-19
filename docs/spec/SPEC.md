# Manhattan Heli: Specification

Spec version: 0.9.0

The requirement list is in [requirements.md](requirements.md). This file gives the context for those requirements.

## 1. Purpose

The game is a helicopter flight game. The player flies over a real city and avoids buildings. The player must reach a destination.

The picture uses clean line art. It does not try to look real.

## 2. Scope

Included in this version:

- Four stages. Each stage is a square area of a real city.
- One aircraft: a helicopter with a chase camera.
- Four goals in order in each stage: three checkpoints and one destination.

| Stage | Area | Route |
|---|---|---|
| 1 Midtown Manhattan | 1.8 km square around Times Square | Midtown streets to the southeast |
| 2 Lower Manhattan | 1.8 km square around Wall Street | Battery Park, Wall Street, One World Trade Center, Woolworth Building, City Hall |
| 3 Paris | 2.0 km square between the Arc de Triomphe and the Eiffel Tower | Arc de Triomphe, Trocadero, Eiffel Tower, Pont de l'Alma, Champs-Elysees |
| 4 Tokyo | 1.8 km square in West Shinjuku | Shinjuku Station, Cocoon Tower, Tokyo Metropolitan Government Building, Shinjuku Park Tower, Tokyo Opera City |

Not included in this version:

- Fuel, time limits, and score.
- Terrain height.
- Sound.
- Touch controls.

## 3. Architecture

| Part | File | Task |
|---|---|---|
| Stage list | `src/stages.json` | Stage name, data file, map center, size, start, and goals. |
| Map data | `public/data/*.json` | One file for each stage. Buildings, roads, parks, and water in local meters. |
| Data script | `scripts/fetch-osm.mjs` | Gets OpenStreetMap data for each stage and writes the JSON files. |
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
| Load one stage at a time. | Each stage file is 0.4 MB to 1.1 MB. The game loads a stage only when the player selects it. |
| Load the map behind the title screen. | The player sees the selection at once. A load screen between the key and the title screen was confusing. |
| Make a tower into four stacked prisms. | The outline of a tower is its base. A solid prism of 330 m over the Eiffel Tower base looks wrong. |
| Use the English name of a building if OpenStreetMap has one. | The labels in Paris and Tokyo are then easier to read. |
| Hide a label that is not in Latin letters. | All player text must be ASCII. A name with only accents, for example in Paris, stays as a label without the accents. |

## 5. Known limits

- OpenStreetMap has no height for some buildings. The game uses 18 m for them. The part is about 10 percent in Midtown and 20 percent in Lower Manhattan. It is 40 percent in Paris and 68 percent in Tokyo.
- In Tokyo, some low buildings near tall towers can show 18 m. Some tower outlines show only the podium height.
- In Tokyo, many buildings have no English name in the map data. These buildings have no label (REQ-LBL-005).
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

## 8. Deployment

The host is GitHub Pages. The site address is https://choonsik.github.io/game/.

The game also runs on Vercel. Vercel serves the site from the root path, so `BASE_PATH` stays unset there.

The pipeline is in `.github/workflows/deploy.yml`. It has three jobs:

1. `verify` runs `npm run verify` on each push and each pull request.
2. `deploy` builds the site and publishes it. It runs only after `verify` passes, and only for the main branch.
3. `deploy-vercel` deploys the site to Vercel. It has the same conditions as `deploy`. It skips itself if the Vercel secrets are not set.

The build reads `BASE_PATH` from the environment. The pipeline sets it to the repository name. Code must read data through `import.meta.env.BASE_URL`. Code must not use a path that starts with a slash.

Vercel needs three repository secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID`. Do not use the Vercel Git integration. It deploys without verification.

One GitHub setting is manual. In the repository settings, open Pages and set Source to GitHub Actions.

## 9. Text rules

All player text and all spec text follow [TEXT-RULES.md](TEXT-RULES.md).

