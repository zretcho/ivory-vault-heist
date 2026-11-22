// The patrolling guards: each walks a fixed loop of waypoints, pauses at
// each one to scan the hall, and reads what its vision cone shows. A guard
// that keeps seeing the thief leaves patrol to investigate the last place
// it was seen; a coin's ring pulls it to the coin instead. A guard only
// ever sees through its cone and only with a clear line of sight — a pillar
// or a glass case between guard and thief is cover, and a sneaking thief in
// shadow is seen from much closer. Touching a guard ends the run.

import { GUARD, THIEF } from './config.js';
import { hasLineOfSight, pointInCone } from './level.js';

/** A guard's effective vision range against this thief, right now. */
export function guardVisionRange(state, guard) {
  let range = GUARD.visionRange;
  const thief = state.thief;
  if (thief.sneaking) range *= 0.62;
  if (state.inSmoke) range *= 0.5;
  return range;
}

/** Whether this guard can see the thief this instant. */
export function guardSeesThief(state, guard) {
  const thief = state.thief;
  if (state.inSmokeCloud) return false;
  const range = guardVisionRange(state, guard);
  if (!pointInCone(guard.x, guard.y, guard.angle, range, GUARD.visionHalf, thief.x, thief.y)) return false;
  return hasLineOfSight(guard.x, guard.y, thief.x, thief.y, state.level.solids);
}

/**
 * Advance every guard one step. Returns 'caught' when a guard touches the
 * thief, and pushes sound cues ('suspicious', 'coin-heard') into `events`.
 */
export function updateGuards(state, dt, events) {
  const thief = state.thief;
  for (const guard of state.level.guards) {
    const speed = guard.speed * (state.alarm >= 60 ? GUARD.alertSpeed : 1);
    const sees = guardSeesThief(state, guard);
    if (sees) {
      guard.seenSeconds += dt;
      guard.lastSeen = { x: thief.x, y: thief.y };
      if (guard.seenSeconds >= GUARD.investigateAfter && guard.mode !== 'investigate') {
        guard.mode = 'investigate';
        guard.investigate = { x: thief.x, y: thief.y };
        guard.distract = null;
        guard.alerted = true;
        events.push('suspicious');
      }
    } else {
      guard.seenSeconds = Math.max(0, guard.seenSeconds - dt * 2);
    }

    // A ringing coin pulls a nearby guard off its route.
    for (const coin of state.coins) {
      if (!coin.landed || coin.ring <= 0) continue;
      if (Math.hypot(guard.x - coin.x, guard.y - coin.y) <= GUARD.hearRadius) {
        if (guard.mode !== 'investigate' || !guard.distract) {
          guard.mode = 'investigate';
          guard.investigate = { x: coin.x, y: coin.y };
          guard.distract = { x: coin.x, y: coin.y };
          guard.alerted = false;
          events.push('coin-heard');
        }
      }
    }

    if (guard.mode === 'patrol') {
      const target = guard.waypoints[guard.waypointIndex];
      if (walkToward(guard, target.x, target.y, speed, dt)) {
        guard.mode = 'scan';
        guard.pause = guard.scanSeconds;
        guard.scanTurn = -guard.scanTurn;
      }
    } else if (guard.mode === 'scan') {
      guard.pause -= dt;
      guard.angle += guard.scanTurn * 0.55 * dt;
      if (guard.pause <= 0) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.mode = 'patrol';
      }
    } else if (guard.mode === 'investigate') {
      const target = guard.investigate;
      if (target && walkToward(guard, target.x, target.y, speed * 1.15, dt)) {
        guard.mode = 'scan';
        guard.pause = 1.1;
        guard.investigate = null;
        guard.distract = null;
      }
    }

    // A guard that reaches the thief ends the heist on the spot.
    if (Math.hypot(guard.x - thief.x, guard.y - thief.y) <= THIEF.caughtByTouch) {
      return 'caught';
    }
  }
  return null;
}

/**
 * Walk a guard toward (tx, ty) at `speed`; returns true on arrival. The
 * guard faces where it walks and stops a short step short of its target.
 */
function walkToward(guard, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const d = Math.hypot(dx, dy);
  if (d <= 3) return true;
  const step = Math.min(d, speed * dt);
  guard.x += (dx / d) * step;
  guard.y += (dy / d) * step;
  guard.angle = Math.atan2(dy, dx);
  return d - step <= 3;
}
