// The alarm meter: 0 to 100, rising while any guard or camera watches the
// thief and falling while the thief stays hidden. Sneaking, standing in
// shadow and hiding in smoke all slow the rise. The hall's mood follows
// the meter — Calm, Suspicious, Alerted — and at 100 the run is over.

import { ALARM, EXPOSURE } from './config.js';
import { inShadow } from './level.js';
import { guardSeesThief } from './guards.js';
import { anyCameraSeesThief } from './cameras.js';

/** Whether any guard sees the thief right now. */
export function anyGuardSeesThief(state) {
  for (const guard of state.level.guards) {
    if (guardSeesThief(state, guard)) return true;
  }
  return false;
}

/** Whether any guard is currently investigating a sighting or a sound. */
export function anyGuardInvestigating(state) {
  for (const guard of state.level.guards) {
    if (guard.mode === 'investigate' && !guard.distract) return true;
  }
  return false;
}

/**
 * Advance the alarm one step. Returns 'caught' when the meter hits 100.
 * The thief's exposure (sneak, shadow, smoke) scales how fast it rises.
 */
export function updateAlarm(state, dt) {
  const seenByGuard = anyGuardSeesThief(state);
  const seenByCamera = anyCameraSeesThief(state);
  let rate = 0;
  if (seenByGuard) rate += ALARM.guardRate;
  if (seenByCamera) rate += ALARM.cameraRate;

  if (rate > 0) {
    let factor = 1;
    if (state.thief.sneaking) factor *= EXPOSURE.sneak;
    if (inShadow(state.thief.x, state.thief.y, state.level.shadows)) factor *= EXPOSURE.shadow;
    if (state.inSmokeCloud) factor *= EXPOSURE.smokeCloud;
    state.alarm = Math.min(ALARM.max, state.alarm + rate * factor * dt);
    state.exposed = true;
  } else {
    state.alarm = Math.max(0, state.alarm - ALARM.decay * dt);
    state.exposed = false;
  }
  state.peakAlarm = Math.max(state.peakAlarm, state.alarm);

  const before = state.status;
  state.status =
    state.alarm >= ALARM.alertedAt ? 'alerted' :
    state.alarm >= ALARM.calmBelow || anyGuardInvestigating(state) ? 'suspicious' : 'calm';
  if (state.status !== before && state.status === 'alerted') {
    return 'alerted';
  }
  return state.alarm >= ALARM.max ? 'caught' : null;
}
