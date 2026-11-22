// Wren, the thief: walks or sneaks across the hall, slides along marble
// and glass instead of sticking to it, lifts the Ivory Star and the gold
// bars, and spends the two tools — coins to pull a guard away, smoke to
// kill the cameras. The thief never teleports and never passes through a
// wall: movement is axis-separated, so a diagonal push slides along the
// obstacle instead of stopping dead.

import { FIELD, THIEF, TOOLS, WALL } from './config.js';
import { circleHitsRect, pushCircleOutOfRect } from './level.js';

/** The thief's fresh state at the entrance. */
export function createThief(spawn) {
  return {
    x: spawn.x,
    y: spawn.y,
    angle: -Math.PI / 2,
    moving: false,
    sneaking: false,
    coins: TOOLS.coins,
    smoke: TOOLS.smoke,
    coinCooldown: 0,
    hasStar: false,
    gold: 0,
    stepSound: 0,
  };
}

/**
 * Move the thief one step. Returns 'star' when the Star is lifted, 'gold'
 * when a bar is pocketed, 'exit' when the thief slips out with the Star, and
 * null otherwise. `events` collects sound cues for the audio module.
 */
export function updateThief(state, input, dt, events) {
  const thief = state.thief;
  const level = state.level;
  thief.coinCooldown = Math.max(0, thief.coinCooldown - dt);

  const dir = input.direction();
  thief.sneaking = input.sneaking();
  thief.moving = dir.x !== 0 || dir.y !== 0;
  const speed = thief.sneaking ? THIEF.sneakSpeed : THIEF.walkSpeed;
  if (thief.moving) {
    thief.angle = Math.atan2(dir.y, dir.x);
    moveThief(state, dir.x * speed * dt, 0);
    moveThief(state, 0, dir.y * speed * dt);
    thief.stepSound -= dt;
    if (thief.stepSound <= 0) {
      thief.stepSound = thief.sneaking ? 0.55 : 0.34;
      events.push(thief.sneaking ? 'step-quiet' : 'step');
    }
  }

  // Lift the Ivory Star from its case.
  if (!level.star.taken) {
    const d = Math.hypot(thief.x - level.star.x, thief.y - level.star.y);
    if (d <= THIEF.starReach) {
      level.star.taken = true;
      thief.hasStar = true;
      state.exitOpen = true;
      events.push('star');
      return 'star';
    }
  }

  // Pocket a gold bar from a side safe.
  for (const safe of level.safes) {
    if (safe.taken) continue;
    const cx = safe.x + safe.w / 2;
    const cy = safe.y + safe.h / 2;
    if (Math.hypot(thief.x - cx, thief.y - cy) <= THIEF.goldReach) {
      safe.taken = true;
      thief.gold += 1;
      events.push('gold');
      return 'gold';
    }
  }

  // Slip out through the exit door — only once the Star is taken.
  if (thief.hasStar) {
    const e = level.exit;
    if (
      thief.x > e.x - 6 && thief.x < e.x + e.w + 6 &&
      thief.y > e.y - 6 && thief.y < e.y + e.h + 26
    ) {
      events.push('escape');
      return 'exit';
    }
  }
  return null;
}

/** Move the thief by (dx, dy) one axis at a time, sliding along solids. */
function moveThief(state, dx, dy) {
  const thief = state.thief;
  const nx = Math.max(WALL + THIEF.radius, Math.min(FIELD.width - WALL - THIEF.radius, thief.x + dx));
  const ny = Math.max(WALL + THIEF.radius, Math.min(FIELD.height - WALL - THIEF.radius, thief.y + dy));
  let x = nx;
  let y = ny;
  // The entrance gap and the exit door are openings in the wall band: the
  // thief may step into them, but never through a solid wall.
  for (const solid of state.level.solids) {
    if (circleHitsRect(x, y, THIEF.radius, solid)) {
      const fixed = pushCircleOutOfRect(x, y, THIEF.radius, solid);
      x = fixed.x;
      y = fixed.y;
    }
  }
  thief.x = x;
  thief.y = y;
}

/**
 * Throw a coin toward the mouse (or the thief's facing when the mouse never
 * moved). Returns true when a coin left the thief's hand.
 */
export function throwCoin(state, input, events) {
  const thief = state.thief;
  if (thief.coins <= 0 || thief.coinCooldown > 0) return false;
  const mouse = input.mouse();
  let tx = mouse.x;
  let ty = mouse.y;
  if (!mouse.seen) {
    tx = thief.x + Math.cos(thief.angle) * 220;
    ty = thief.y + Math.sin(thief.angle) * 220;
  }
  const dx = tx - thief.x;
  const dy = ty - thief.y;
  const d = Math.hypot(dx, dy) || 1;
  const range = Math.min(d, TOOLS.coinRange);
  thief.coins -= 1;
  thief.coinCooldown = TOOLS.coinCooldown;
  state.coins.push({
    sx: thief.x,
    sy: thief.y,
    x: thief.x,
    y: thief.y,
    tx: thief.x + (dx / d) * range,
    ty: thief.y + (dy / d) * range,
    t: 0,
    flight: TOOLS.coinFlight,
    landed: false,
    ring: 0,
  });
  events.push('coin-throw');
  return true;
}

/** Drop a smoke pellet: the cameras die and a cloud hides the thief. */
export function dropSmoke(state, events) {
  const thief = state.thief;
  if (thief.smoke <= 0) return false;
  thief.smoke -= 1;
  for (const camera of state.level.cameras) camera.disabled = TOOLS.smokeSeconds;
  state.clouds.push({ x: thief.x, y: thief.y, r: TOOLS.smokeRadius, t: TOOLS.smokeCloud });
  events.push('smoke');
  return true;
}
