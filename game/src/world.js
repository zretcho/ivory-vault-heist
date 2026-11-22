// The world: one state object and the one step that advances it. A step
// moves the thief, flies and rings the coins, updates the guards and the
// cameras, then the alarm — in that order, so a frame's sightings decide
// the same frame's alarm. The world also owns the run's clock, the score,
// and the win/lose verdicts.

import { SCORE, TOOLS } from './config.js';
import { createRandom } from './rng.js';
import { buildLevel } from './level.js';
import { createThief, updateThief, throwCoin, dropSmoke } from './thief.js';
import { updateGuards } from './guards.js';
import { updateCameras } from './cameras.js';
import { updateAlarm } from './alarm.js';

/** Build a world from a seed; call reset() before the first step. */
export function createWorld(seed) {
  const random = createRandom(seed);
  const state = {
    random,
    level: null,
    thief: null,
    coins: [],
    clouds: [],
    time: 0,
    alarm: 0,
    peakAlarm: 0,
    status: 'calm',
    exposed: false,
    inSmokeCloud: false,
    exitOpen: false,
    outcome: null,
    cause: null,
    score: 0,
    rank: null,
  };

  function reset() {
    state.level = buildLevel(random);
    state.thief = createThief(state.level.spawn);
    state.coins = [];
    state.clouds = [];
    state.time = 0;
    state.alarm = 0;
    state.peakAlarm = 0;
    state.status = 'calm';
    state.exposed = false;
    state.inSmokeCloud = false;
    state.exitOpen = false;
    state.outcome = null;
    state.cause = null;
    state.score = 0;
    state.rank = null;
  }

  reset();

  return {
    state,
    reset,
    /**
     * Advance the world one fixed step. `input` is the frame's input and
     * `events` collects sound cues. `actions` is the frame's action
     * bitmask (a coin throw or smoke pellet); when null the world reads
     * the input's queue itself. Returns 'win', 'caught' or null.
     */
    step(input, dt, events, actions = null) {
      if (state.outcome) return state.outcome;
      state.time += dt;

      // Coins fly in a straight line from where they were thrown, land,
      // and ring; a landed coin's ring is what a guard hears.
      for (const coin of state.coins) {
        if (!coin.landed) {
          coin.t += dt;
          const k = Math.min(1, coin.t / coin.flight);
          coin.x = coin.sx + (coin.tx - coin.sx) * k;
          coin.y = coin.sy + (coin.ty - coin.sy) * k;
          if (k >= 1) {
            coin.landed = true;
            coin.ring = TOOLS.coinRing;
            events.push('coin-land');
          }
        } else if (coin.ring > 0) {
          coin.ring -= dt;
        }
      }
      state.coins = state.coins.filter((c) => !c.landed || c.ring > 0);

      // Smoke clouds linger, then clear.
      for (const cloud of state.clouds) cloud.t -= dt;
      state.clouds = state.clouds.filter((c) => c.t > 0);
      state.inSmokeCloud = state.clouds.some(
        (c) => Math.hypot(state.thief.x - c.x, state.thief.y - c.y) <= c.r,
      );

      const acts = actions ?? input.takeActions();
      if (acts & 4) throwCoin(state, input, events);
      if (acts & 8) dropSmoke(state, events);

      const thiefEvent = updateThief(state, input, dt, events);
      if (thiefEvent === 'exit') {
        finishRun(state, 'win', 'escaped');
        return 'win';
      }

      const guardEvent = updateGuards(state, dt, events);
      if (guardEvent === 'caught') {
        finishRun(state, 'caught', 'A guard laid a hand on Wren.');
        return 'caught';
      }
      updateCameras(state, dt, events);

      const alarmEvent = updateAlarm(state, dt);
      if (alarmEvent === 'caught') {
        finishRun(state, 'caught', 'The alarm hit 100 — the hall locked down.');
        return 'caught';
      }
      return null;
    },
  };
}

/** Score the run and stamp its verdict. */
function finishRun(state, outcome, cause) {
  state.outcome = outcome;
  state.cause = cause;
  if (outcome !== 'win') {
    state.score = state.thief.gold * SCORE.gold;
    return;
  }
  const seconds = state.time;
  const timeBonus = Math.max(0, Math.round((SCORE.parSeconds - seconds) * SCORE.timeBonus));
  const ghostBonus = state.peakAlarm < 25 ? SCORE.ghostBonus : 0;
  state.score = state.thief.gold * SCORE.gold + timeBonus + ghostBonus;
  state.rank =
    state.peakAlarm < 25 ? 'GHOST' :
    state.peakAlarm < 60 ? 'SHADOW' : 'PROFESSIONAL';
}
