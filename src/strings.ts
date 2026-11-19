// All player-facing text. Style: ASD-STE100 (short sentences, active voice, ASCII only).
// scripts/check-text.mjs lints this file. Do not put UI text anywhere else.
export const STR = {
  stageSelect: 'Press 1 to 4 to select a stage.',
  loading: 'Loading the map.',
  titleBody: 'Fly the helicopter to the destination.\nDo not hit a building.',
  startHint: 'Press ENTER or SPACE to start.',
  crash: 'CRASH',
  crashBody: 'Restart at the last checkpoint.',
  win: 'DESTINATION REACHED',
  winBody: (time: string, crashes: number) => `TIME ${time} s. CRASHES ${crashes}.\n\nPress ENTER to fly again.`,
  checkpoint: (n: number) => `CHECKPOINT ${n}`,
  destination: 'DESTINATION',
  heightUnknown: 'HEIGHT UNKNOWN',
  hud: {
    time: 'TIME', alt: 'ALT', speed: 'SPD', crashes: 'CRASHES', dist: 'DIST', altDiff: 'ALT DIFF',
  },
  credit: 'Map data: OpenStreetMap contributors (ODbL)',
  help: 'W/S: FORWARD/BACK   A/D: TURN   SPACE/SHIFT: CLIMB/DESCEND   R: RESTART   L: NAMES   ESC: STAGES',
} as const;
