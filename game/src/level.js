// The vault hall as a live level: the fixed layout from config.js turned
// into obstacles, shadows, safes, guards and cameras, plus the geometry the
// game reasons about — circle-against-rectangle movement and the line of
// sight that decides whether a guard or a camera can actually see the thief
// (a pillar or a glass case between two points is cover).

import { FIELD, LEVEL, WALL } from './config.js';

/** A rectangle: {x, y, w, h}, the top-left corner and its size. */
export function rect(x, y, w, h) {
  return { x, y, w, h };
}

/** Whether point (px, py) lies inside rect r (edges count as inside). */
export function pointInRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

/** Whether a circle at (cx, cy) with radius r touches rect q. */
export function circleHitsRect(cx, cy, radius, q) {
  const nx = Math.max(q.x, Math.min(cx, q.x + q.w));
  const ny = Math.max(q.y, Math.min(cy, q.y + q.h));
  const dx = cx - nx;
  const dy = cy - ny;
  return dx * dx + dy * dy < radius * radius;
}

/**
 * Push a circle out of a rectangle it overlaps, returning the corrected
 * centre. A circle dead-centre inside a rectangle is pushed out the nearest
 * side.
 */
export function pushCircleOutOfRect(cx, cy, radius, q) {
  const nx = Math.max(q.x, Math.min(cx, q.x + q.w));
  const ny = Math.max(q.y, Math.min(cy, q.y + q.h));
  let dx = cx - nx;
  let dy = cy - ny;
  const d2 = dx * dx + dy * dy;
  if (d2 >= radius * radius) return { x: cx, y: cy };
  if (d2 > 0.0001) {
    const d = Math.sqrt(d2);
    const push = (radius - d) / d;
    return { x: cx + dx * push, y: cy + dy * push };
  }
  const left = cx - q.x;
  const right = q.x + q.w - cx;
  const top = cy - q.y;
  const bottom = q.y + q.h - cy;
  const m = Math.min(left, right, top, bottom);
  if (m === left) return { x: q.x - radius, y: cy };
  if (m === right) return { x: q.x + q.w + radius, y: cy };
  if (m === top) return { x: cx, y: q.y - radius };
  return { x: cx, y: q.y + q.h + radius };
}

/** Whether segments (ax,ay)-(bx,by) and (cx,cy)-(dx,dy) cross or touch. */
function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const d1 = (dx - cx) * (ay - cy) - (dy - cy) * (ax - cx);
  const d2 = (dx - cx) * (by - cy) - (dy - cy) * (bx - cx);
  const d3 = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const d4 = (bx - ax) * (dy - ay) - (by - ay) * (dx - ax);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Whether the segment from (x1,y1) to (x2,y2) touches rect r. */
export function segmentHitsRect(x1, y1, x2, y2, r) {
  if (pointInRect(x1, y1, r) || pointInRect(x2, y2, r)) return true;
  return (
    segmentsCross(x1, y1, x2, y2, r.x, r.y, r.x + r.w, r.y) ||
    segmentsCross(x1, y1, x2, y2, r.x + r.w, r.y, r.x + r.w, r.y + r.h) ||
    segmentsCross(x1, y1, x2, y2, r.x + r.w, r.y + r.h, r.x, r.y + r.h) ||
    segmentsCross(x1, y1, x2, y2, r.x, r.y + r.h, r.x, r.y)
  );
}

/**
 * Whether two points can see each other: no solid obstacle (pillar, glass
 * case, safe, the star's case) crosses the line between them. Walls never
 * block sight inside the hall; shadows are floor, not cover.
 */
export function hasLineOfSight(x1, y1, x2, y2, solids) {
  for (let i = 0; i < solids.length; i += 1) {
    if (segmentHitsRect(x1, y1, x2, y2, solids[i])) return false;
  }
  return true;
}

/**
 * Whether point (px, py) lies inside a cone: within `range` of (ox, oy) and
 * within `half` radians of the cone's facing `angle`.
 */
export function pointInCone(ox, oy, angle, range, half, px, py) {
  const dx = px - ox;
  const dy = py - oy;
  const d = Math.hypot(dx, dy);
  if (d > range) return false;
  if (d < 1) return true;
  let a = Math.atan2(dy, dx) - angle;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return Math.abs(a) <= half;
}

/** Build the level's runtime objects from the fixed layout. */
export function buildLevel(random) {
  const solids = [];
  // The hall's walls, with a gap for the entrance at the bottom and the
  // exit door at the top right (both are openings, not obstacles).
  solids.push(rect(0, 0, FIELD.width, WALL));
  solids.push(rect(0, FIELD.height - WALL, FIELD.width, WALL));
  solids.push(rect(0, 0, WALL, FIELD.height));
  solids.push(rect(FIELD.width - WALL, 0, WALL, FIELD.height));
  for (const p of LEVEL.pillars) solids.push(rect(p.x, p.y, p.w, p.h));
  for (const c of LEVEL.cases) solids.push(rect(c.x, c.y, c.w, c.h));
  solids.push(rect(LEVEL.starCase.x, LEVEL.starCase.y, LEVEL.starCase.w, LEVEL.starCase.h));
  for (const s of LEVEL.safes) solids.push(rect(s.x, s.y, s.w, s.h));

  const guards = LEVEL.guards.map((g, index) => {
    const start = g.waypoints[0];
    const next = g.waypoints[1];
    return {
      id: index,
      name: g.name,
      x: start[0],
      y: start[1],
      angle: Math.atan2(next[1] - start[1], next[0] - start[0]),
      waypoints: g.waypoints.map((w) => ({ x: w[0], y: w[1] })),
      waypointIndex: 1,
      speed: g.speed,
      scanSeconds: g.scan,
      mode: 'patrol',
      pause: 0,
      scanTurn: random() < 0.5 ? 1 : -1,
      seenSeconds: 0,
      lastSeen: null,
      investigate: null,
      distract: null,
      alerted: false,
    };
  });

  const cameras = LEVEL.cameras.map((c) => ({
    x: c.x,
    y: c.y,
    base: c.base,
    sweep: c.sweep,
    period: c.period,
    phase: c.phase,
    angle: c.base,
    disabled: 0,
    spotted: false,
  }));

  return {
    solids,
    pillars: LEVEL.pillars.map((p) => rect(p.x, p.y, p.w, p.h)),
    cases: LEVEL.cases.map((c) => rect(c.x, c.y, c.w, c.h)),
    starCase: rect(LEVEL.starCase.x, LEVEL.starCase.y, LEVEL.starCase.w, LEVEL.starCase.h),
    shadows: LEVEL.shadows.map((s) => rect(s.x, s.y, s.w, s.h)),
    ropes: LEVEL.ropes.map((r) => ({ x1: r.x1, y1: r.y1, x2: r.x2, y2: r.y2 })),
    safes: LEVEL.safes.map((s) => ({ ...rect(s.x, s.y, s.w, s.h), taken: false })),
    guards,
    cameras,
    star: { x: LEVEL.star.x, y: LEVEL.star.y, taken: false },
    exit: rect(LEVEL.exit.x, LEVEL.exit.y, LEVEL.exit.w, LEVEL.exit.h),
    entrance: rect(LEVEL.entrance.x, LEVEL.entrance.y, LEVEL.entrance.w, LEVEL.entrance.h),
    spawn: { x: LEVEL.spawn.x, y: LEVEL.spawn.y },
  };
}

/** Whether (x, y) stands in one of the hall's shadow patches. */
export function inShadow(x, y, shadows) {
  for (let i = 0; i < shadows.length; i += 1) {
    if (pointInRect(x, y, shadows[i])) return true;
  }
  return false;
}
