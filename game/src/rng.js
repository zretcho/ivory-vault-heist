// A tiny seeded random number generator (mulberry32), so a screenshot scene
// staged with ?seed=N always plays out the same way. Nothing in the game
// reads Math.random: every roll goes through the generator the world owns.

/** A generator function: each call returns a float in [0, 1). */
export function createRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An integer in [min, max] from the generator. */
export function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/** One element of `items`, picked by the generator. */
export function randomPick(random, items) {
  return items[Math.floor(random() * items.length)];
}
