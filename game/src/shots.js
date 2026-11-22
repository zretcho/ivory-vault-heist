// The screenshot scenes behind ?shot=cover|stealth|alarm|escape. Each one
// poses the world at fixed positions — the same seed always gives the same
// frame — then runs the real rules forward a fixed number of steps, so the
// frame is what a short game really looks like: the thief mid-crossing,
// the cones sweeping, the loot in its case and the alarm meter live.
// Guards are posed in 'scan' so their cones hold still for the shot.

import { STEP } from './config.js';
import { SCREEN_PLAY } from './render.js';
import { createStillInput } from './input.js';

const SETTLE_TICKS = 30;

/** Pose one guard: stand at (x, y), face `angle`, hold the scan. */
function poseGuard(guard, x, y, angle) {
  guard.x = x;
  guard.y = y;
  guard.angle = angle;
  guard.mode = 'scan';
  guard.pause = 999;
  guard.seenSeconds = 0;
  guard.lastSeen = null;
  guard.investigate = null;
  guard.distract = null;
  guard.alerted = false;
}

/** Pose one camera: freeze its sweep at a fixed angle. */
function poseCamera(camera, angle, disabled = 0) {
  camera.angle = angle;
  camera.base = angle;
  camera.sweep = 0;
  camera.disabled = disabled;
  camera.spotted = false;
}

/** Run the world forward a fixed number of steps with no input. */
function settle(world, ticks) {
  const input = createStillInput();
  const events = [];
  for (let i = 0; i < ticks; i += 1) world.step(input, STEP, events);
}

/**
 * Set `world` to the named scene (cover, stealth, alarm or escape; any
 * other name is cover) and return the screen to draw over it.
 */
export function stageShot(name, world) {
  const state = world.state;
  world.reset();
  const guards = state.level.guards;
  const cameras = state.level.cameras;
  const thief = state.thief;

  if (name === 'stealth') {
    // Wren crouched in the centre-bottom shadow patch while Marco's cone
    // sweeps past the pillar: low alarm, everything still calm.
    thief.x = 600;
    thief.y = 530;
    thief.angle = -Math.PI / 2;
    thief.sneaking = true;
    poseGuard(guards[0], 220, 380, -Math.PI / 2);
    poseGuard(guards[1], 640, 200, 0);
    poseGuard(guards[2], 1000, 500, Math.PI / 2);
    poseCamera(cameras[0], 1.05);
    poseCamera(cameras[1], Math.PI);
    state.alarm = 8;
    state.time = 18;
  } else if (name === 'alarm') {
    // Caught in the open: Sable has Wren in her cone and is closing in,
    // the alarm is nearly full and the hall is Alerted.
    thief.x = 640;
    thief.y = 430;
    thief.angle = -Math.PI / 2;
    poseGuard(guards[0], 260, 480, 0.5);
    poseGuard(guards[1], 640, 330, Math.PI / 2);
    guards[1].mode = 'investigate';
    guards[1].investigate = { x: 640, y: 430 };
    guards[1].alerted = true;
    poseGuard(guards[2], 1080, 240, Math.PI);
    poseCamera(cameras[0], 1.2);
    poseCamera(cameras[1], Math.PI - 0.4);
    state.alarm = 82;
    state.time = 67;
  } else if (name === 'escape') {
    // The Star is taken, the exit is open, and Wren is running for the door
    // while Rook's cone sweeps the corridor behind her.
    thief.x = 1000;
    thief.y = 130;
    thief.angle = 0;
    thief.hasStar = true;
    state.level.star.taken = true;
    state.exitOpen = true;
    thief.gold = 1;
    poseGuard(guards[0], 300, 300, Math.PI / 2);
    poseGuard(guards[1], 560, 420, -Math.PI / 2);
    poseGuard(guards[2], 1080, 320, Math.PI / 2);
    poseCamera(cameras[0], 0.9);
    poseCamera(cameras[1], Math.PI + 0.3);
    state.alarm = 55;
    state.time = 95;
  } else {
    // Cover: the whole heist in one frame. Wren crosses the centre toward
    // the Star's case, Sable's cone sweeps the middle of the hall, a camera
    // watches from the right wall, and the alarm is already climbing.
    thief.x = 640;
    thief.y = 560;
    thief.angle = -Math.PI / 2;
    poseGuard(guards[0], 260, 300, 0.4);
    poseGuard(guards[1], 700, 420, Math.PI * 0.75);
    poseGuard(guards[2], 1000, 200, Math.PI / 2);
    poseCamera(cameras[0], 1.05);
    poseCamera(cameras[1], Math.PI - 0.5);
    state.alarm = 34;
    state.time = 42;
  }

  state.peakAlarm = state.alarm;
  settle(world, SETTLE_TICKS);
  // Posing again after the settle keeps the cones exactly where the shot
  // wants them (the settle only moves the alarm and the clock).
  state.alarm = Math.max(state.alarm, 1);
  return { screen: SCREEN_PLAY };
}
