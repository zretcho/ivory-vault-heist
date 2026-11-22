// The wall cameras: each sweeps its red cone back and forth across the
// hall on a fixed rhythm, and spots the thief faster than any guard —
// being caught in a camera's cone is the quickest way to raise the alarm.
// A smoke pellet kills every camera for a few seconds; while one is dead
// its cone goes dark and it sees nothing.

import { CAMERA } from './config.js';
import { hasLineOfSight, pointInCone } from './level.js';

/** Advance every camera one step: sweep, count down smoke, track spotting. */
export function updateCameras(state, dt, events) {
  for (const camera of state.level.cameras) {
    camera.disabled = Math.max(0, camera.disabled - dt);
    camera.angle = camera.base + camera.sweep * Math.sin((state.time * 2 * Math.PI) / camera.period + camera.phase);
    const wasSpotted = camera.spotted;
    camera.spotted = camera.disabled <= 0 && cameraSeesThief(state, camera);
    if (camera.spotted && !wasSpotted) events.push('camera-spot');
  }
}

/** Whether this camera can see the thief this instant. */
export function cameraSeesThief(state, camera) {
  const thief = state.thief;
  if (state.inSmokeCloud) return false;
  if (!pointInCone(camera.x, camera.y, camera.angle, CAMERA.range, CAMERA.half, thief.x, thief.y)) return false;
  return hasLineOfSight(camera.x, camera.y, thief.x, thief.y, state.level.solids);
}

/** Whether any live camera sees the thief right now. */
export function anyCameraSeesThief(state) {
  for (const camera of state.level.cameras) {
    if (camera.spotted) return true;
  }
  return false;
}
