// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between five screens:
// title, play, paused, win and caught.
//
// ?seed=N fixes the world's rolls. ?shot=cover|stealth|alarm|escape (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createWorld } from './world.js';
import {
  ACTION_CONFIRM,
  ACTION_COIN,
  ACTION_MUTE,
  ACTION_PAUSE,
  ACTION_RETRY,
  createInput,
} from './input.js';
import { createAudio } from './audio.js';
import {
  createRenderer,
  SCREEN_CAUGHT,
  SCREEN_PAUSED,
  SCREEN_PLAY,
  SCREEN_TITLE,
  SCREEN_WIN,
} from './render.js';
import { drawCaught, drawHud, drawPaused, drawTitle, drawWin } from './hud.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed);
const renderer = createRenderer(canvas);
const audio = createAudio();

/** The test and screenshot hook: the live world, for the play-test driver. */
window.__vault = { world, state: world.state };

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best time then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen);
    drawHud(canvas.getContext('2d'), world.state);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  // The test driver reads which screen the game is on.
  window.__vault.getScreen = () => screen;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Playing. Take the Ivory Star, then reach the exit.');
  }

  function endGame(outcome) {
    if (outcome === 'win') {
      screen = SCREEN_WIN;
      const seconds = Math.floor(world.state.time);
      if (best === 0 || seconds < best) {
        best = seconds;
        saveBest(best);
      }
      announce(`Clean getaway. Rank ${world.state.rank}. Score ${world.state.score}.`);
    } else {
      screen = SCREEN_CAUGHT;
      announce(`Caught. ${world.state.cause ?? ''}`);
    }
  }

  /** Handle the frame's menu actions; returns the actions still live for the world step. */
  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM) {
      if (screen === SCREEN_TITLE || screen === SCREEN_WIN || screen === SCREEN_CAUGHT) startGame();
      else if (screen === SCREEN_PAUSED) screen = SCREEN_PLAY;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    }
    if (actions & ACTION_RETRY && (screen === SCREEN_WIN || screen === SCREEN_CAUGHT)) startGame();
    // A click that starts the game is a confirmation, not a coin throw.
    if (actions & ACTION_COIN && screen === SCREEN_TITLE) {
      startGame();
      actions &= ~ACTION_COIN;
    }
    return actions;
  }

  function step(actions) {
    const events = [];
    const outcome = world.step(input, STEP, events, actions);
    for (const event of events) audio.play(event);
    audio.siren(world.state.status === 'alerted' && screen === SCREEN_PLAY);
    if (outcome) endGame(outcome);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // Actions are read once per frame and handed to the first world step,
    // so a coin throw or smoke pellet is never eaten by the menu handler.
    const actions = handleActions(input.takeActions());
    if (screen === SCREEN_PLAY) {
      let first = true;
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step(first ? actions : 0);
        first = false;
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(world.state, screen);
    if (screen === SCREEN_PLAY) drawHud(canvas.getContext('2d'), world.state);
    else if (screen === SCREEN_TITLE) drawTitle(canvas.getContext('2d'), world.state, best || null);
    else if (screen === SCREEN_WIN) drawWin(canvas.getContext('2d'), world.state, best || null);
    else if (screen === SCREEN_CAUGHT) drawCaught(canvas.getContext('2d'), world.state);
    else if (screen === SCREEN_PAUSED) drawPaused(canvas.getContext('2d'), world.state);
  }

  // Leaving the tab pauses a running game rather than letting the alarm climb unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('The Ivory Vault. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
