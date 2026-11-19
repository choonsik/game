# Manual checks

Do these checks by eye before each release. Each item names its requirement.

## REQ-VIS-003: depth cue

1. Start the game with `npm run dev`.
2. Fly between two tall buildings.
3. Make sure that the near edges look white and bright.
4. Make sure that the far edges look dim and blue.
5. Make sure that the farthest buildings fade into the background.

## REQ-GAME-010: stage

1. Make sure that the title screen names the city.
2. Select each stage with keys 1 to 4. Make sure that the map looks like the named city.
3. Look at the screenshots `artifacts/screenshot-title.png` and `artifacts/screenshot-stage1.png` to `artifacts/screenshot-stage4.png` after `npm run e2e`.

## REQ-GAME-011: checkpoint places

1. Fly to each checkpoint.
2. Make sure that each checkpoint is at a named landmark or an intersection.

## REQ-GAME-012: limits

1. Make sure that fuel or time limits show on the HUD when a stage has them.

