# Requirements

Spec version: 0.4.0

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
| REQ-GAME-010 | Each stage must use one real city. Manhattan is the first stage. | planned | 0.1.0 | manual |
| REQ-GAME-011 | Each checkpoint must be at a named landmark or a real intersection. | planned | 0.3.0 | manual |
| REQ-GAME-012 | A stage may have a fuel limit or a time limit. | planned | 0.3.0 | manual |

## Controls

| ID | Requirement | Status | Since | Verify |
|---|---|---|---|---|
| REQ-CTL-001 | Keys W and S must move the helicopter forward and back. Keys A and D must turn it left and right. | implemented | 0.1.0 | auto |
| REQ-CTL-002 | Key SPACE must climb. Key SHIFT must descend. | implemented | 0.1.0 | auto |
| REQ-CTL-003 | Key R must restart the mission. Key L must show or hide building names. | implemented | 0.2.0 | auto |
| REQ-CTL-004 | The camera must follow the helicopter from behind and above. | implemented | 0.1.0 | auto |

## Map data

| ID | Requirement | Status | Since | Verify |
|---|---|---|---|---|
| REQ-MAP-001 | The city must come from OpenStreetMap building outlines with heights. | implemented | 0.1.0 | auto |
| REQ-MAP-002 | The map must show roads, parks, and water as lines on the ground. | implemented | 0.2.0 | auto |
| REQ-MAP-003 | A building with no height data must use a default of 18 m. The data must mark it as unknown. | implemented | 0.2.0 | auto |
| REQ-MAP-004 | A script must make the map data offline. The game must read one static JSON file. | implemented | 0.1.0 | auto |
| REQ-MAP-005 | The game must show the OpenStreetMap credit on every screen. The credit must link to the license page. | implemented | 0.3.0 | auto |

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

## Collision and limits

| ID | Requirement | Status | Since | Verify |
|---|---|---|---|---|
| REQ-COL-001 | A crash occurs when the 4 m helicopter sphere touches a building outline inside the building height range. | implemented | 0.1.0 | auto |
| REQ-COL-002 | Contact with the ground must cause a crash. | implemented | 0.1.0 | auto |
| REQ-COL-003 | The helicopter must stay inside the map limit plus 60 m. The altitude limit is 450 m. | implemented | 0.1.0 | auto |

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
