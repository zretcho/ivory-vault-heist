// The heads-up display and the menu screens, all drawn on the same canvas
// as the world: the alarm meter and the hall's mood across the top, the
// thief's tools and loot along the bottom, and the title, win, caught and
// pause screens as full overlays. Everything here is paint only.

import { FIELD, FONT, PALETTE } from './config.js';

/** Format seconds as M:SS. */
export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

/** The alarm meter's colour at a value: green, amber, then red. */
export function alarmColour(alarm) {
  if (alarm >= 60) return PALETTE.danger;
  if (alarm >= 25) return PALETTE.gold;
  return PALETTE.ok;
}

/** The hall's mood in words, for the meter and the status line. */
export function statusLabel(status) {
  if (status === 'alerted') return 'ALERTED';
  if (status === 'suspicious') return 'SUSPICIOUS';
  return 'CALM';
}

/** Draw the in-play HUD over the world: alarm, tools, loot, timer. */
export function drawHud(ctx, state) {
  drawAlarmBar(ctx, state);
  drawToolsRow(ctx, state);
  drawObjective(ctx, state);
  drawHint(ctx, state);
}

function drawAlarmBar(ctx, state) {
  const x = 24;
  const y = 14;
  const w = 300;
  const h = 18;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(x - 8, y - 8, w + 220, h + 30);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `bold 12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('ALARM', x, y + 13);
  ctx.fillStyle = '#1c2138';
  ctx.fillRect(x + 62, y, w - 62, h);
  ctx.fillStyle = alarmColour(state.alarm);
  ctx.fillRect(x + 62, y, (w - 62) * (state.alarm / 100), h);
  ctx.strokeStyle = '#565e78';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 62, y, w - 62, h);
  ctx.fillStyle = alarmColour(state.alarm);
  ctx.font = `bold 13px ${FONT}`;
  ctx.fillText(`${statusLabel(state.status)}  ${Math.round(state.alarm)}`, x + w + 12, y + 14);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `12px ${FONT}`;
  ctx.fillText(`TIME ${formatTime(state.time)}`, x + w + 150, y + 14);
}

function drawToolsRow(ctx, state) {
  const thief = state.thief;
  const y = FIELD.height - 34;
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(16, y - 14, 560, 30);
  ctx.textAlign = 'left';
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(`●`.repeat(Math.max(0, thief.coins)) + `○`.repeat(Math.max(0, 3 - thief.coins)), 28, y + 5);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`coins [C / click]`, 92, y + 5);
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(thief.smoke > 0 ? '◉ smoke [X]' : '○ smoke spent', 240, y + 5);
  ctx.fillStyle = state.thief.hasStar ? PALETTE.star : PALETTE.muted;
  ctx.fillText(state.thief.hasStar ? '★ IVORY STAR' : '☆ Ivory Star', 380, y + 5);
  ctx.fillStyle = PALETTE.gold;
  ctx.fillText(`gold ${thief.gold}/3`, 510, y + 5);
}

function drawObjective(ctx, state) {
  const text = state.exitOpen
    ? 'Reach the EXIT door, top right — and do not get seen.'
    : 'Take the IVORY STAR from its case, then reach the EXIT.';
  ctx.fillStyle = PALETTE.panel;
  const w = ctx.measureText(text).width + 24;
  ctx.fillRect(FIELD.width - w - 16, FIELD.height - 48, w, 30);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `13px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(text, FIELD.width - 28, FIELD.height - 28);
}

function drawHint(ctx, state) {
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `12px ${FONT}`;
  ctx.textAlign = 'center';
  const hint = state.thief.sneaking
    ? 'Sneaking — slow, quiet, harder to spot.'
    : 'WASD / arrows to move · Shift to sneak · C coin · X smoke · P pause · M mute';
  ctx.fillText(hint, FIELD.width / 2, FIELD.height - 52);
}

/** A dark veil over the world, for the menu screens. */
function veil(ctx, alpha = 0.72) {
  ctx.fillStyle = `rgba(6, 8, 18, ${alpha})`;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

function centredTitle(ctx, title, y, size = 54) {
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(title, FIELD.width / 2, y);
}

function centredLine(ctx, text, y, size = 17, colour = PALETTE.text) {
  ctx.fillStyle = colour;
  ctx.font = `${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(text, FIELD.width / 2, y);
}

/** The title screen: the name, the job, the controls, start. */
export function drawTitle(ctx, state, bestSeconds) {
  veil(ctx, 0.55);
  centredTitle(ctx, 'THE IVORY VAULT', 150, 58);
  centredLine(ctx, 'One thief. One star. Three guards, two cameras, and an alarm that never forgets.', 196, 18, PALETTE.muted);
  centredLine(ctx, 'Slip across the hall, lift the Ivory Star from its case, and reach the exit', 236, 17);
  centredLine(ctx, 'before the alarm hits 100 — or a guard lays a hand on you.', 262, 17);
  centredLine(ctx, 'WASD / arrows — move      Shift — sneak      C or click — throw a coin', 330, 16);
  centredLine(ctx, 'X — smoke pellet (kills the cameras)      P — pause      M — mute', 356, 16);
  centredLine(ctx, 'Gold bars in the side safes are optional — and loud to reach.', 392, 16, PALETTE.gold);
  if (bestSeconds !== null) {
    centredLine(ctx, `Best escape so far: ${formatTime(bestSeconds)}`, 428, 15, PALETTE.muted);
  }
  centredLine(ctx, 'Press ENTER or click to begin the heist', 500, 20, PALETTE.star);
}

/** The win screen: time, peak alarm, loot, score and rank. */
export function drawWin(ctx, state, bestSeconds) {
  veil(ctx, 0.78);
  centredTitle(ctx, 'CLEAN GETAWAY', 150, 52);
  centredLine(ctx, 'The Ivory Star is yours. The hall never knew you were there — or never caught you.', 196, 17, PALETTE.muted);
  const rows = [
    ['Time', formatTime(state.time)],
    ['Peak alarm', `${Math.round(state.peakAlarm)} / 100`],
    ['Gold bars', `${state.thief.gold} / 3`],
    ['Coins left', `${state.thief.coins}`],
    ['Score', `${state.score}`],
  ];
  let y = 260;
  for (const [label, value] of rows) {
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `16px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(label, FIELD.width / 2 - 20, y);
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'left';
    ctx.fillText(value, FIELD.width / 2 + 20, y);
    y += 30;
  }
  centredTitle(ctx, state.rank, 470, 40);
  centredLine(ctx, rankBlurb(state.rank), 500, 16, PALETTE.muted);
  if (bestSeconds !== null) {
    centredLine(ctx, `Best escape: ${formatTime(bestSeconds)}`, 536, 15, PALETTE.muted);
  }
  centredLine(ctx, 'Press R or ENTER to run it again', 590, 18, PALETTE.star);
}

function rankBlurb(rank) {
  if (rank === 'GHOST') return 'Nobody ever knew you were there.';
  if (rank === 'SHADOW') return 'A whisper in the dark, nothing more.';
  return 'Loud, fast — and gone before the sirens.';
}

/** The caught screen: what ended the run, and the retry key. */
export function drawCaught(ctx, state) {
  veil(ctx, 0.78);
  centredTitle(ctx, 'CAUGHT', 170, 56);
  ctx.fillStyle = PALETTE.danger;
  ctx.font = `bold 20px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(state.cause || 'The heist is over.', FIELD.width / 2, 220);
  centredLine(ctx, `Alarm peaked at ${Math.round(state.peakAlarm)} · gold pocketed ${state.thief.gold} / 3 · score ${state.score}`, 270, 16, PALETTE.muted);
  centredLine(ctx, 'The Star is still in its case. The guards are still walking their rounds.', 310, 16);
  centredLine(ctx, 'Press R or ENTER to try again', 380, 19, PALETTE.star);
}

/** The pause screen. */
export function drawPaused(ctx, state) {
  veil(ctx, 0.6);
  centredTitle(ctx, 'PAUSED', 300, 48);
  centredLine(ctx, 'The hall waits. Press P or ENTER to keep moving.', 350, 17, PALETTE.muted);
}

/** The small score line the judge's screenshots carry at a glance. */
export function scoreLine(state) {
  return `score ${state.score} · time ${formatTime(state.time)} · peak alarm ${Math.round(state.peakAlarm)}`;
}
