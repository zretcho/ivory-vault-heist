// The Ivory Vault — every tuning number, colour and the vault hall's fixed
// layout in one place. The playfield is a fixed 1280x720 logical area; the
// renderer scales it to the window, so no rule below depends on the screen.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** The marble wall band around the hall. */
export const WALL = 28;

export const THIEF = {
  radius: 14,
  walkSpeed: 172,
  sneakSpeed: 96,
  /** How far from the Ivory Star the thief must stand to lift it. */
  starReach: 52,
  /** How far from a safe's centre the thief must stand to pocket a gold bar. */
  goldReach: 48,
  /** How close a guard must get to catch the thief on contact. */
  caughtByTouch: 30,
};

export const GUARD = {
  radius: 15,
  /** Vision cone: how far a guard can see, and its half-angle in radians. */
  visionRange: 212,
  visionHalf: 0.62,
  /** Seconds of being watched before a guard leaves patrol to investigate. */
  investigateAfter: 0.55,
  /** A guard walks faster once the alarm is high. */
  alertSpeed: 1.35,
  /** A guard that hears a coin walks to it instead of patrolling. */
  hearRadius: 290,
};

export const CAMERA = {
  range: 282,
  half: 0.45,
};

export const ALARM = {
  /** Alarm points per second while a guard watches the thief. */
  guardRate: 22,
  /** Alarm points per second while a camera watches the thief. */
  cameraRate: 38,
  /** Alarm points per second the meter falls while nobody sees the thief. */
  decay: 11,
  /** Below this the hall is Calm; at or above ALERTED_AT it is Alerted. */
  calmBelow: 25,
  alertedAt: 60,
  max: 100,
};

/** Multipliers on how fast the alarm rises while the thief is seen. */
export const EXPOSURE = {
  sneak: 0.55,
  shadow: 0.7,
  smokeCloud: 0.15,
};

export const TOOLS = {
  coins: 3,
  smoke: 1,
  /** A thrown coin may land this far from the thief. */
  coinRange: 330,
  /** Seconds a coin spends in the air. */
  coinFlight: 0.45,
  /** Seconds a landed coin rings and holds a guard's attention. */
  coinRing: 2.6,
  /** Seconds cameras stay dead after a smoke pellet. */
  smokeSeconds: 6,
  /** Seconds the smoke cloud itself lingers and hides the thief. */
  smokeCloud: 4,
  smokeRadius: 96,
  /** Seconds between coin throws. */
  coinCooldown: 0.8,
};

/** Ranks for a clean getaway, by the highest alarm the run ever reached. */
export const RANKS = [
  { below: 25, name: 'GHOST', blurb: 'Nobody ever knew you were there.' },
  { below: 60, name: 'SHADOW', blurb: 'A whisper in the dark, nothing more.' },
  { below: 101, name: 'PROFESSIONAL', blurb: 'Loud, fast — and gone before the sirens.' },
];

/** Points: each gold bar, each second left under the par time, a ghost bonus. */
export const SCORE = { gold: 500, parSeconds: 150, timeBonus: 12, ghostBonus: 1000 };

export const PALETTE = {
  backdrop: '#0b0e1a',
  floorA: '#171b2e',
  floorB: '#131728',
  floorLine: '#232842',
  wall: '#3a3f5c',
  wallTop: '#4a5070',
  gold: '#e8b64c',
  goldDim: '#8a6d2f',
  marble: '#c9cdd6',
  marbleDark: '#9aa0b0',
  velvet: '#8e2f3c',
  shadow: 'rgba(2, 4, 12, 0.42)',
  thief: '#f0a13c',
  thiefDark: '#a86a1e',
  guard: '#5d6b8c',
  guardDark: '#39415e',
  coneCalm: 'rgba(250, 200, 70, 0.16)',
  coneHot: 'rgba(255, 64, 48, 0.30)',
  cameraCone: 'rgba(255, 70, 60, 0.15)',
  cameraConeHot: 'rgba(255, 70, 60, 0.34)',
  star: '#ffe9a8',
  text: '#eef1f5',
  muted: '#9aa1b5',
  danger: '#ff5148',
  ok: '#58d68d',
  panel: 'rgba(10, 13, 26, 0.82)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best escape time is kept between visits (this browser only). */
export const BEST_KEY = 'ivory-vault.best-seconds';

/**
 * The vault hall, fixed: the thief enters from the bottom, the Ivory Star
 * sits in its glass case at the centre, and the exit door (top right) only
 * opens once the Star is taken. Three routes cross the hall — the left
 * gallery (pillars, one guard), the centre (cases, one camera) and the right
 * corridor (fast, two cameras and one guard) — and three side safes hold
 * optional gold bars for a thief willing to risk the extra seconds.
 */
export const LEVEL = {
  spawn: { x: 640, y: 648 },
  star: { x: 640, y: 336 },
  starCase: { x: 596, y: 300, w: 88, h: 60 },
  exit: { x: 1150, y: 28, w: 84, h: 40 },
  entrance: { x: 596, y: 692, w: 88, h: 28 },
  pillars: [
    { x: 277, y: 177, w: 46, h: 46 },
    { x: 277, y: 457, w: 46, h: 46 },
    { x: 957, y: 177, w: 46, h: 46 },
    { x: 957, y: 457, w: 46, h: 46 },
    { x: 447, y: 117, w: 46, h: 46 },
    { x: 787, y: 117, w: 46, h: 46 },
    { x: 447, y: 537, w: 46, h: 46 },
    { x: 787, y: 537, w: 46, h: 46 },
  ],
  cases: [
    { x: 420, y: 312, w: 100, h: 56 },
    { x: 760, y: 312, w: 100, h: 56 },
  ],
  safes: [
    { x: 64, y: 150, w: 64, h: 64 },
    { x: 1152, y: 420, w: 64, h: 64 },
    { x: 180, y: 64, w: 64, h: 64 },
  ],
  /** Dark floor patches where the thief is harder to spot. */
  shadows: [
    { x: 230, y: 140, w: 190, h: 130 },
    { x: 860, y: 440, w: 190, h: 130 },
    { x: 540, y: 480, w: 200, h: 110 },
  ],
  /** Velvet ropes in front of the cases: decoration, not cover. */
  ropes: [
    { x1: 556, y1: 404, x2: 724, y2: 404 },
    { x1: 400, y1: 404, x2: 540, y2: 404 },
    { x1: 740, y1: 404, x2: 880, y2: 404 },
  ],
  guards: [
    {
      name: 'Marco',
      waypoints: [[200, 180], [200, 540], [400, 540], [400, 180]],
      speed: 55,
      scan: 1.7,
    },
    {
      name: 'Sable',
      waypoints: [[540, 180], [740, 180], [740, 500], [540, 500]],
      speed: 62,
      scan: 1.4,
    },
    {
      name: 'Rook',
      waypoints: [[1080, 120], [1080, 600], [920, 600], [920, 120]],
      speed: 58,
      scan: 1.5,
    },
  ],
  cameras: [
    { x: 96, y: 30, base: 1.05, sweep: 0.62, period: 4.2, phase: 0 },
    { x: 1250, y: 300, base: Math.PI, sweep: 0.52, period: 5.1, phase: 1.3 },
  ],
};
