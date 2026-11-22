// Keyboard and mouse: the held keys each frame, the mouse in game
// coordinates, and one-shot actions (a key press or a click fires once,
// even when the frame rate stutters). WASD or arrows move, Shift sneaks,
// C or a click throws a coin toward the cursor, X drops smoke, P pauses,
// M mutes, R retries after being caught, Enter or Space confirms.

import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_COIN = 4;
export const ACTION_SMOKE = 8;
export const ACTION_MUTE = 16;
export const ACTION_RETRY = 32;

/** Build the input state for a canvas; call `update()` once per frame. */
export function createInput(canvas) {
  const held = new Set();
  let queued = 0;
  let mouseX = FIELD.width / 2;
  let mouseY = FIELD.height - 120;
  let mouseSeen = false;

  function toGame(clientX, clientY) {
    const box = canvas.getBoundingClientRect();
    const scale = Math.max(box.width / FIELD.width, box.height / FIELD.height);
    const shownW = FIELD.width * scale;
    const shownH = FIELD.height * scale;
    const ox = (box.width - shownW) / 2;
    const oy = (box.height - shownH) / 2;
    mouseX = (clientX - box.left - ox) / scale;
    mouseY = (clientY - box.top - oy) / scale;
    mouseSeen = true;
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') queued |= ACTION_CONFIRM;
    else if (event.code === 'KeyP' || event.code === 'Escape') queued |= ACTION_PAUSE;
    else if (event.code === 'KeyC') queued |= ACTION_COIN;
    else if (event.code === 'KeyX') queued |= ACTION_SMOKE;
    else if (event.code === 'KeyM') queued |= ACTION_MUTE;
    else if (event.code === 'KeyR') queued |= ACTION_RETRY;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
  });
  canvas.addEventListener('mousemove', (event) => toGame(event.clientX, event.clientY));
  canvas.addEventListener('mousedown', (event) => {
    toGame(event.clientX, event.clientY);
    // A click is a coin throw while playing; on a menu screen it confirms.
    queued |= ACTION_COIN;
  });

  return {
    /** The move direction this frame, as a unit vector (0, 0 when idle). */
    direction() {
      let x = 0;
      let y = 0;
      if (held.has('ArrowLeft') || held.has('KeyA')) x -= 1;
      if (held.has('ArrowRight') || held.has('KeyD')) x += 1;
      if (held.has('ArrowUp') || held.has('KeyW')) y -= 1;
      if (held.has('ArrowDown') || held.has('KeyS')) y += 1;
      if (x !== 0 && y !== 0) {
        const d = Math.hypot(x, y);
        x /= d;
        y /= d;
      }
      return { x, y };
    },
    /** Whether Shift is held: sneak, slower and harder to spot. */
    sneaking() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    /** The mouse position in game coordinates (the coin's target). */
    mouse() {
      return { x: mouseX, y: mouseY, seen: mouseSeen };
    },
    /** Take and clear the actions queued since the last call. */
    takeActions() {
      const actions = queued;
      queued = 0;
      return actions;
    },
  };
}

/** A still input (no keys, no mouse) for scripted scenes and tests. */
export function createStillInput() {
  return {
    direction: () => ({ x: 0, y: 0 }),
    sneaking: () => false,
    mouse: () => ({ x: FIELD.width / 2, y: FIELD.height - 120, seen: false }),
    takeActions: () => 0,
  };
}
