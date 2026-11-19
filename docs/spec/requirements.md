# Requirements

Spec version: 0.9.0

Each row has one requirement. The ID never changes. The text of a row changes only with a version increase.

Status values: `implemented`, `planned`, `deprecated`.
Verify values: `auto` (automatic test), `manual` (see MANUAL-CHECKS.md), `auto+manual`.
Each automatic test carries its requirement ID in its title, for example `[REQ-COL-001]`.

## Game

| ID | Requirement | Status | Since | Verify |
|---|---|---|---|---|
| REQ-GAME-001 | The player must fly a helicopter from a start point to a destination. | implemented | 0.1.0 | auto |
| REQ-GAME-002 | The mission has three checkpoints and one destination. The player must reach them in order. | implemented | 0.1.0 | auto |
| REQ-GAME-003 | After a crash, the helicopter must restart at the last reached checkpoint. The crash counter must increase by one. | implemented | 0.1.0 | auto |
| REQ-GAME-004 | When the player reaches the destination, the game must show the time and the number of crashes. | implemented | 0.1.0 | auto |
| REQ-GAME-005 | The HUD must show time, altitude, speed, crashes, distance to target, altitude difference, and a direction arrow. | implemented | 0.1.0 | auto |
| REQ-GAME-010 | Each stage must use one real city. Manhattan is the first stage. | implemented | 0.1.0 | manual |
| REQ-GAME-011 | Each checkpoint must be at a named landmark or a real intersection. | planned | 0.3.0 | manual |
| REQ-GAME-012 | A stage may have a fuel limit or a time limit. | planned | 0.3.0 | manual |
| REQ-GAME-013 | The game must have four stages in this order: Midtown Manhattan, Lower Manhattan, Paris, and Tokyo. Each stage has a start, three checkpoints, and one destination. | implemented | 0.7.0 | auto |
| REQ-GAME-014 | The title screen must show the stage name and the stage list. Keys 1 to 4 and the up and down arrow keys must select a stage. The URL parameter `stage` must also select a stage. | implemented | 0.7.0 | auto |
| REQ-GAME-016 | When the player selects a stage, the title screen must stay and mark the selected row at once. The map must load behind the title screen. ENTER must start the selected stage. If the map is not ready, the stage must start when it is ready. | implemented | 0.9.0 | auto |
| REQ-GAME-015 | The stage list must be easy to read. Each row must show its key and the stage name in text of 15 px or more. The selected row must have a different color. A dark area must be behind the title text. | implemented | 0.8.0 | auto |

## Controls

| ID | Requirement | Status | Since | Verify |
|---|---|---|---|---|
| REQ-CTL-001 | Keys W and S must move the helicopter forward and back. Keys A and D must turn it left and right. | implemented | 0.1.0 | auto |
| REQ-CTL-002 | Key SPACE must climb. Key SHIFT must descend. | implemented | 0.1.0 | auto |
| REQ-CTL-003 | Key R must restart the mission. Key L must show or hide building names. | implemented | 0.2.0 | auto |
| REQ-CTL-004 | The camera must follow the helicopter from behind and above. | implemented | 0.1.0 | auto |
| REQ-CTL-005 | Key ESC must stop the mission and show the title screen. | implemented | 0.7.0 | auto |

## Map data

| ID | Requirement | Status | Since | Verify |
|---|---|---|---|---|
| REQ-MAP-001 | The city must come from OpenStreetMap building outlines with heights. | implemented | 0.1.0 | auto |
| REQ-MAP-002 | The map must show roads, parks, and water as lines on the ground. | implemented | 0.2.0 | auto |
| REQ-MAP-003 | A building with no height data must use a default of 18 m. The data must mark it as unknown. | implemented | 0.2.0 | auto |
| REQ-MAP-004 | A script must make the map data offline. The game must read one static JSON file. | implemented | 0.1.0 | auto |
| REQ-MAP-005 | The game must show the OpenStreetMap credit on every screen. The credit must link to the license page. | implemented | 0.3.0 | auto |
| REQ-MAP-006 | Each stage must have one data file. One script must make all stage files from the stage list. | implemented | 0.7.0 | auto |
| REQ-MAP-007 | The script must make a tower with a known height into four stacked prisms. Each prism must be narrower than the prism below it. | implemented | 0.7.0 | auto |

## Visual style

| ID | Requirement | Status | Since | Verify |
|---|---|---|---|---|
| REQ-VIS-001 | Each building must have a solid fill in the background color and a line for each edge. The fill hides lines behind it. | implemented | 0.1.0 | auto |
| REQ-VIS-002 | The game must draw all building edges: top, vertical, and base. No edge may have an invalid color. | implemented | 0.2.0 | auto |
| REQ-VIS-003 | Near lines must be brighter than far lines. Far lines must fade into the background. | implemented | 0.2.0 | auto+manual |
| REQ-VIS-004 | Lines of tall buildings must be brighter than lines of low buildings. | implemented | 0.1.0 | auto |
| REQ-VIS-005 | The helicopter must use orange lines. The rotors must turn. | implemented | 0.1.0 | auto |

## Building names

| ID | Requirement | Status | Since | Verify |
|---|---|---|---|---|
| REQ-LBL-001 | The screen must show at most one focus label and four landmark labels at the same time. | implemented | 0.2.0 | auto |
| REQ-LBL-002 | The focus label must show the name and the height. If the height is unknown, it must show HEIGHT UNKNOWN. | implemented | 0.2.0 | auto |
| REQ-LBL-003 | A landmark label must show a building with a known height of 110 m or more. | implemented | 0.2.0 | auto |
| REQ-LBL-004 | The game must hide all building names on the title screen. | implemented | 0.2.0 | auto |
| REQ-LBL-005 | A label must use only ASCII characters. The game must remove accents from a name. If a name has other non-ASCII characters, the game must not show a label for that building. | implemented | 0.8.0 | auto |

## Collision and limits

| ID | Requirement | Status | Since | Verify |
|---|---|---|---|---|
| REQ-COL-001 | A crash occurs when the 4 m helicopter sphere touches a building outline inside the building height range. | implemented | 0.1.0 | auto |
| REQ-COL-002 | Contact with the ground must cause a crash. | implemented | 0.1.0 | auto |
| REQ-COL-003 | The helicopter must stay inside the map limit plus 60 m. The altitude limit is 450 m. | implemented | 0.1.0 | auto |

## Deployment

| ID | Requirement | Status | Since | Verify |
|---|---|---|---|---|
| REQ-DEP-001 | The production build must run from a subpath of a static host. It must need only static files. | implemented | 0.5.0 | auto |
| REQ-DEP-002 | The pipeline must run all verification before each deploy. A failed check must stop the deploy. | implemented | 0.5.0 | auto |
| REQ-DEP-003 | The pipeline must also deploy the site to Vercel from the root path. This deploy must run only after verification passes. | implemented | 0.6.0 | auto |

## Publication

| ID | Requirement | Status | Since | Verify |
|---|---|---|---|---|
| REQ-PUB-001 | The repository must contain a LICENSE file, a README, and a NOTICE with the map data license. | implemented | 0.4.0 | auto |

## Platform, performance, text

| ID | Requirement | Status | Since | Verify |
|---|---|---|---|---|
| REQ-PLAT-001 | The game must run in a desktop web browser with WebGL. It must need only static files. | implemented | 0.1.0 | auto |
| REQ-PERF-001 | The game must use at most 100 draw calls for each frame. | implemented | 0.3.0 | auto |
| REQ-TXT-001 | All player text and all spec text must follow the rules in TEXT-RULES.md. A lint script checks them. | implemented | 0.3.0 | auto |
