// The renderer: everything the player sees, painted on one canvas in a
// fixed order — floor and shadows, the vault's furniture, the loot and the
// doors, then the vision cones, and the people on top of them. Safe cover
// is pale marble, danger is red cone, loot is gold: the hall reads at a
// glance. Nothing here changes the state; it only paints it.

import { FIELD, PALETTE, WALL, FONT, CAMERA, GUARD } from './config.js';

/** Screen names, shared with main.js and shots.js. */
export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_CAUGHT = 'caught';

/** Build a renderer for a canvas; call draw() every frame. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    canvas.width = Math.round(FIELD.width * scale);
    canvas.height = Math.round(FIELD.height * scale);
    canvas.style.width = `${canvas.width}px`;
    canvas.style.height = `${canvas.height}px`;
  }

  function draw(state, screen) {
    fit();
    const scale = canvas.width / FIELD.width;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    drawFloor(ctx, state);
    drawDoors(ctx, state);
    drawFurniture(ctx, state);
    drawLoot(ctx, state);
    drawCones(ctx, state);
    drawCoins(ctx, state);
    drawPeople(ctx, state);
    drawClouds(ctx, state);
  }

  return { draw };
}

/** The marble floor: a checker of dark slabs with a gold-trimmed border. */
function drawFloor(ctx, state) {
  ctx.fillStyle = PALETTE.backdrop;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  const slab = 80;
  for (let y = WALL; y < FIELD.height - WALL; y += slab) {
    for (let x = WALL; x < FIELD.width - WALL; x += slab) {
      const even = ((x - WALL) / slab + (y - WALL) / slab) % 2 === 0;
      ctx.fillStyle = even ? PALETTE.floorA : PALETTE.floorB;
      ctx.fillRect(x, y, slab, slab);
    }
  }
  ctx.strokeStyle = PALETTE.floorLine;
  ctx.lineWidth = 1;
  for (let x = WALL; x <= FIELD.width - WALL; x += slab) {
    ctx.beginPath();
    ctx.moveTo(x, WALL);
    ctx.lineTo(x, FIELD.height - WALL);
    ctx.stroke();
  }
  for (let y = WALL; y <= FIELD.height - WALL; y += slab) {
    ctx.beginPath();
    ctx.moveTo(WALL, y);
    ctx.lineTo(FIELD.width - WALL, y);
    ctx.stroke();
  }
  // The shadow patches: dark floor where the thief is harder to spot.
  ctx.fillStyle = PALETTE.shadow;
  for (const s of state.level.shadows) ctx.fillRect(s.x, s.y, s.w, s.h);
  // A thin gold inlay around the hall's edge.
  ctx.strokeStyle = PALETTE.goldDim;
  ctx.lineWidth = 2;
  ctx.strokeRect(WALL + 4, WALL + 4, FIELD.width - 2 * WALL - 8, FIELD.height - 2 * WALL - 8);
}

/** The entrance mat and the exit door (locked red, open green). */
function drawDoors(ctx, state) {
  const e = state.level.exit;
  // Entrance: a dark mat at the bottom gap.
  ctx.fillStyle = '#1d2338';
  ctx.fillRect(state.level.entrance.x, state.level.entrance.y - 6, state.level.entrance.w, 12);
  ctx.fillStyle = PALETTE.goldDim;
  ctx.font = `11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('ENTRANCE', 640, FIELD.height - 34);
  // Exit door on the top wall.
  ctx.fillStyle = state.exitOpen ? '#1d4d33' : '#3a2027';
  ctx.fillRect(e.x, e.y, e.w, e.h);
  ctx.strokeStyle = state.exitOpen ? PALETTE.ok : PALETTE.danger;
  ctx.lineWidth = 2;
  ctx.strokeRect(e.x, e.y, e.w, e.h);
  ctx.fillStyle = state.exitOpen ? PALETTE.ok : PALETTE.danger;
  ctx.font = `bold 13px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(state.exitOpen ? 'EXIT  →' : 'LOCKED', e.x + e.w / 2, e.y + e.h + 16);
}

/** Pillars, glass cases, safes and velvet ropes. */
function drawFurniture(ctx, state) {
  // Marble pillars with a gold band.
  for (const p of state.level.pillars) {
    ctx.fillStyle = PALETTE.marble;
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.fillStyle = PALETTE.marbleDark;
    ctx.fillRect(p.x + 6, p.y + 6, p.w - 12, p.h - 12);
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(p.x, p.y + p.h / 2 - 3, p.w, 6);
    ctx.strokeStyle = '#6d7285';
    ctx.lineWidth = 1;
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  }
  // Glass display cases: pale glass over a dark plinth, gold frame.
  for (const c of state.level.cases) {
    ctx.fillStyle = '#232a42';
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = 'rgba(150, 190, 230, 0.22)';
    ctx.fillRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.strokeRect(c.x, c.y, c.w, c.h);
    // A small exhibit inside each case.
    ctx.fillStyle = PALETTE.goldDim;
    ctx.beginPath();
    ctx.arc(c.x + c.w / 2, c.y + c.h / 2, 9, 0, Math.PI * 2);
    ctx.fill();
  }
  // The Star's case, grander: a tall glass dome on a gold plinth.
  const sc = state.level.starCase;
  ctx.fillStyle = '#2a2f4a';
  ctx.fillRect(sc.x - 6, sc.y + sc.h - 10, sc.w + 12, 10);
  ctx.fillStyle = 'rgba(160, 200, 240, 0.28)';
  ctx.fillRect(sc.x, sc.y, sc.w, sc.h);
  ctx.strokeStyle = PALETTE.gold;
  ctx.lineWidth = 3;
  ctx.strokeRect(sc.x, sc.y, sc.w, sc.h);
  // Side safes: dark steel doors with a gold dial.
  for (const s of state.level.safes) {
    ctx.fillStyle = '#2e3448';
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = '#565e78';
    ctx.lineWidth = 2;
    ctx.strokeRect(s.x, s.y, s.w, s.h);
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(s.x + s.w / 2, s.y + s.h / 2, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1e2e';
    ctx.beginPath();
    ctx.arc(s.x + s.w / 2, s.y + s.h / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    if (!s.taken) {
      ctx.fillStyle = PALETTE.gold;
      ctx.font = `bold 10px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('GOLD', s.x + s.w / 2, s.y + s.h + 13);
    }
  }
  // Velvet ropes: red cords sagging between brass posts.
  for (const r of state.level.ropes) {
    ctx.strokeStyle = PALETTE.velvet;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(r.x1, r.y1);
    ctx.quadraticCurveTo((r.x1 + r.x2) / 2, r.y1 + 12, r.x2, r.y2);
    ctx.stroke();
    for (const px of [r.x1, r.x2]) {
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.arc(px, r.y1, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** The Ivory Star and the gold bars still in their safes. */
function drawLoot(ctx, state) {
  if (!state.level.star.taken) {
    const { x, y } = state.level.star;
    const pulse = 0.75 + 0.25 * Math.sin(state.time * 3);
    ctx.save();
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PALETTE.star;
    ctx.shadowColor = PALETTE.gold;
    ctx.shadowBlur = 22;
    drawStar(ctx, x, y, 20, 9);
    ctx.restore();
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('IVORY STAR', x, y - 32);
  }
  for (const s of state.level.safes) {
    if (s.taken) continue;
    const cx = s.x + s.w / 2;
    const cy = s.y + s.h / 2;
    ctx.fillStyle = PALETTE.gold;
    ctx.fillRect(cx - 14, cy - 6, 28, 12);
    ctx.fillStyle = '#f7d774';
    ctx.fillRect(cx - 14, cy - 6, 28, 4);
  }
}

/** Guard and camera vision cones, then the camera bodies. */
function drawCones(ctx, state) {
  for (const camera of state.level.cameras) {
    const disabled = camera.disabled > 0;
    ctx.fillStyle = disabled
      ? 'rgba(120, 120, 120, 0.07)'
      : camera.spotted
        ? PALETTE.cameraConeHot
        : PALETTE.cameraCone;
    drawCone(ctx, camera.x, camera.y, camera.angle, CAMERA.range, CAMERA.half);
    // The camera body on its wall mount.
    ctx.fillStyle = disabled ? '#5a5f70' : '#c8ccd8';
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = disabled ? '#3a3e4c' : PALETTE.danger;
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 4, 0, Math.PI * 2);
    ctx.fill();
    if (disabled) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `bold 10px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('OFF', camera.x, camera.y + 24);
    }
  }
  for (const guard of state.level.guards) {
    const hot = guard.mode === 'investigate';
    ctx.fillStyle = hot ? PALETTE.coneHot : PALETTE.coneCalm;
    drawCone(ctx, guard.x, guard.y, guard.angle, GUARD.visionRange, GUARD.visionHalf);
  }
}

/** A filled sector from (x, y) along `angle`, `range` far, `half` wide. */
function drawCone(ctx, x, y, angle, range, half) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - half, angle + half);
  ctx.closePath();
  ctx.fill();
}

/** Thrown coins in flight and ringing on the floor. */
function drawCoins(ctx, state) {
  for (const coin of state.coins) {
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f7d774';
    ctx.lineWidth = 1;
    ctx.stroke();
    if (coin.landed && coin.ring > 0) {
      const k = 1 - coin.ring / 2.6;
      ctx.strokeStyle = `rgba(232, 182, 76, ${0.8 * (1 - k)})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(coin.x, coin.y, 8 + k * 34, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

/** The thief and the guards. */
function drawPeople(ctx, state) {
  const thief = state.thief;
  // The thief: an amber hooded figure with a facing tick and a sneak crouch.
  ctx.save();
  ctx.translate(thief.x, thief.y);
  if (thief.sneaking) ctx.scale(1, 0.85);
  ctx.fillStyle = PALETTE.thiefDark;
  ctx.beginPath();
  ctx.arc(0, 2, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.thief;
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a4d12';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(thief.angle) * 17, Math.sin(thief.angle) * 17);
  ctx.stroke();
  ctx.fillStyle = '#fff3d6';
  ctx.beginPath();
  ctx.arc(Math.cos(thief.angle) * 5, Math.sin(thief.angle) * 5, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (thief.hasStar) {
    ctx.fillStyle = PALETTE.star;
    drawStar(ctx, thief.x, thief.y - 24, 7, 3);
  }
  for (const guard of state.level.guards) {
    ctx.save();
    ctx.translate(guard.x, guard.y);
    ctx.fillStyle = PALETTE.guardDark;
    ctx.beginPath();
    ctx.arc(0, 2, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, 14, -0.6, 0.6);
    ctx.stroke();
    ctx.strokeStyle = '#dfe4f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(guard.angle) * 18, Math.sin(guard.angle) * 18);
    ctx.stroke();
    ctx.restore();
    if (guard.mode === 'investigate') {
      ctx.fillStyle = PALETTE.danger;
      ctx.font = `bold 18px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('!', guard.x, guard.y - 22);
    }
  }
}

/** Smoke clouds: soft grey puffs that hide the thief. */
function drawClouds(ctx, state) {
  for (const cloud of state.clouds) {
    ctx.fillStyle = 'rgba(190, 196, 210, 0.30)';
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2 + cloud.t;
      ctx.beginPath();
      ctx.arc(cloud.x + Math.cos(a) * cloud.r * 0.45, cloud.y + Math.sin(a) * cloud.r * 0.45, cloud.r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** A five-pointed star centred at (x, y). */
function drawStar(ctx, x, y, outer, inner) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}
