import { useEffect, useRef, useState, useCallback } from 'react';

// ─── Sprite sheet layout constants ────────────────────────────────────────────
// Player sheet: 1408×768, 8 cols × 2 rows → each cell = 176×384
const PFW = 176;
const PFH = 384;

// [x, y] on player sheet per animation
const ANIMS: Record<string, Array<[number, number]>> = {
  idle:   [[0,0],[PFW,0]],
  run:    [[PFW*2,0],[PFW*3,0],[PFW*4,0],[PFW*5,0],[PFW*6,0]],
  jump:   [[PFW*2,PFH],[PFW*3,PFH]],
  duck:   [[0,PFH],[PFW,PFH]],
  dive:   [[PFW*4,PFH],[PFW*5,PFH]],
  attack: [[PFW*6,PFH],[PFW*7,PFH]],
};

// Obstacle sheet: 1408×768
// TUNE: adjust these row breakpoints if sprites look mis-cropped
const OB_R1H = 284;  // burger row height
const OB_R2Y = 284;  // obstacle row top
const OB_R2H = 242;  // obstacle row height
const OB_R3Y = 526;  // collectible row top
const OB_R3H = 242;  // collectible row height

type SFrame = { x: number; y: number; w: number; h: number };

const BURGER_FRAMES: SFrame[] = [
  { x: 0,    y: 0, w: 352, h: OB_R1H }, // normal
  { x: 352,  y: 0, w: 352, h: OB_R1H }, // breathing
  { x: 704,  y: 0, w: 352, h: OB_R1H }, // tilted
  { x: 1056, y: 0, w: 352, h: OB_R1H }, // fury
];

const OBF: Record<string, SFrame> = {
  pickle:  { x: 0,    y: OB_R2Y, w: 176, h: OB_R2H },
  onion:   { x: 352,  y: OB_R2Y, w: 176, h: OB_R2H },
  spatula: { x: 880,  y: OB_R2Y, w: 176, h: OB_R2H }, // gold spatula collectible
  hat:     { x: 0,    y: OB_R3Y, w: 176, h: OB_R3H },
  sauce:   { x: 352,  y: OB_R3Y, w: 176, h: OB_R3H },
  lettuce: { x: 704,  y: OB_R3Y, w: 176, h: OB_R3H },
  bun:     { x: 880,  y: OB_R3Y, w: 176, h: OB_R3H },
  ketchup: { x: 1056, y: OB_R3Y, w: 176, h: OB_R3H },
  mustard: { x: 1232, y: OB_R3Y, w: 176, h: OB_R3H }, // drawn flipped
};

// ─── Physics & config ─────────────────────────────────────────────────────────
const GRAVITY        = 2400;
const JUMP_VEL       = -950;
const BASE_SPEED     = 280;
const MAX_SPEED      = 700;
const SPEED_STEP     = 40;
const SPEED_EVERY_MS = 30000;
const GROUND_RATIO   = 0.78;
const PLAYER_X_RATIO = 0.20;
const DISP_H         = 130; // player display height on canvas
const DISP_W         = Math.round(PFW * (DISP_H / PFH));

// ─── Types ────────────────────────────────────────────────────────────────────
type Phase    = 'COUNTDOWN' | 'PLAYING' | 'PAUSED' | 'GAME_OVER';
type ObstType = 'pickle' | 'bun' | 'onion' | 'lettuce' | 'ketchup' | 'mustard';
type CollType = 'spatula' | 'hat' | 'sauce';

interface Obst {
  id: number; type: ObstType;
  x: number; y: number; w: number; h: number;
  rotation: number; rotSpeed: number; flipped: boolean;
}
interface Coll {
  id: number; type: CollType; x: number; y: number;
}
interface GS {
  phase: Phase;
  playerName: string;
  score: number; highScore: number; elapsedMs: number; speed: number;
  playerY: number; playerVY: number;
  isGrounded: boolean; isDucking: boolean;
  isAttacking: boolean; attackTimer: number;
  animName: string; animIdx: number; animTimer: number;
  burgerDist: number; burgerFury: boolean; burgerFuryTimer: number;
  scrollX: number;
  obstacles: Obst[]; collectibles: Coll[];
  spawnTimer: number; collectTimer: number;
  shieldHits: number; multiplier: number; multiplierTimer: number;
  cleanTimer: number;
  countdown: number; countTimer: number;
  milestoneText: string | null; milestoneTimer: number;
  muted: boolean; idCounter: number; submitted: boolean;
}
interface LeaderboardEntry {
  id: number; playerName: string | null;
  score: number; durationSeconds: number; createdAt: string;
}

// ─── Chroma key loader ────────────────────────────────────────────────────────
function loadSprite(src: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const oc = document.createElement('canvas');
      oc.width = img.naturalWidth; oc.height = img.naturalHeight;
      const ctx = oc.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const id = ctx.getImageData(0, 0, oc.width, oc.height);
      const d = id.data;
      for (let i = 0; i < d.length; i += 4) {
        // Remove magenta (#FF00FF) chroma key with tolerance
        if (d[i] > 160 && d[i + 1] < 100 && d[i + 2] > 160) d[i + 3] = 0;
      }
      ctx.putImageData(id, 0, 0);
      resolve(oc);
    };
    img.onerror = reject;
    img.src = src;
  });
}

// ─── Sprite draw helper ───────────────────────────────────────────────────────
function spr(
  ctx: CanvasRenderingContext2D,
  sheet: HTMLCanvasElement,
  f: SFrame,
  dx: number, dy: number, dw: number, dh: number,
  flipX = false,
) {
  ctx.save();
  ctx.translate(dx + dw / 2, dy + dh / 2);
  if (flipX) ctx.scale(-1, 1);
  ctx.drawImage(sheet, f.x, f.y, f.w, f.h, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

// ─── Background (canvas-drawn, 3-layer parallax) ──────────────────────────────
function drawBg(ctx: CanvasRenderingContext2D, scrollX: number, w: number, h: number, groundY: number) {
  const farOff  = (scrollX * 0.15) % (w + 120);
  const midOff  = (scrollX * 0.50) % (w + 160);
  const floorOff = scrollX % 112; // 2 × tile size

  // Wall: cream tiles
  ctx.fillStyle = '#f0ece6';
  ctx.fillRect(0, 0, w, groundY);
  ctx.strokeStyle = '#d8d0c4';
  ctx.lineWidth = 1;
  for (let y = 30; y < groundY - 10; y += 42) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }
  for (let row = 0; row < Math.ceil(groundY / 42); row++) {
    const yy = row * 42;
    const off = row % 2 === 0 ? 0 : 64;
    for (let x = (-farOff % 128) + off; x < w + 128; x += 128) {
      ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x, yy + 42); ctx.stroke();
    }
  }

  // Far: pantry shelf with cans
  const shelfY = h * 0.07;
  ctx.fillStyle = '#c4bab0';
  ctx.fillRect(0, shelfY, w, 12);
  ctx.fillRect(0, shelfY + 62, w, 12);
  const canColors = ['#c0392b','#d4943e','#2980b9','#4caf50','#8e44ad'];
  for (let i = 0; i < 10; i++) {
    const cx = ((i * 96) - farOff % (w + 960) + w * 2) % (w + 960) - 80;
    ctx.fillStyle = canColors[i % canColors.length];
    ctx.fillRect(cx, shelfY - 46, 34, 46);
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(cx + 6, shelfY - 38, 8, 30);
    ctx.fillStyle = '#f0ece6';
    ctx.fillRect(cx + 3, shelfY - 26, 28, 12);
  }

  // Mid: counter + cabinets
  const counterY = groundY - 76;
  ctx.fillStyle = '#888';
  ctx.fillRect(0, counterY, w, 16);
  ctx.fillStyle = '#9a9a9a';
  ctx.fillRect(0, counterY + 16, w, groundY - counterY - 16);
  ctx.strokeStyle = '#6a6a6a'; ctx.lineWidth = 1.5;
  for (let cx = (-midOff % 118); cx < w + 118; cx += 118) {
    ctx.strokeRect(cx + 6, counterY + 24, 106, groundY - counterY - 30);
  }

  // Hanging utensils
  const railY = groundY * 0.42;
  ctx.strokeStyle = '#555'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, railY); ctx.lineTo(w, railY); ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const ux = ((i * 130 + 50) - midOff * 0.6 + w * 2) % (w + 130) - 65;
    ctx.strokeStyle = i % 2 === 0 ? '#b07030' : '#808080'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ux, railY); ctx.lineTo(ux, railY + 22); ctx.stroke();
    if (i % 3 !== 2) {
      ctx.beginPath(); ctx.arc(ux, railY + 42, 16, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.strokeRect(ux - 5, railY + 22, 10, 30);
    }
  }

  // Floor: checkered tiles
  const ts = 56;
  for (let ty = groundY; ty < h + ts; ty += ts) {
    for (let tx = -(floorOff % (ts * 2)); tx < w + ts * 2; tx += ts) {
      const dark = (Math.floor(tx / ts) + Math.floor(ty / ts)) % 2 === 0;
      ctx.fillStyle = dark ? '#282828' : '#e6e2da';
      ctx.fillRect(tx, ty, ts + 1, ts + 1);
    }
  }

  // Floor/wall seam shadow
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(0, groundY - 5, w, 9);
}

// ─── Pursuer burger ───────────────────────────────────────────────────────────
function drawPursuer(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, gs: GS, w: number, groundY: number) {
  const minSz = w * 0.20;
  const maxSz = w * 0.80;
  const sz = minSz + (1 - gs.burgerDist) * (maxSz - minSz);

  const fi = gs.burgerFury ? 3 : (Math.floor(Date.now() / 900) % 2 === 0 ? 0 : 2);
  const bf = BURGER_FRAMES[fi];

  const cx = -sz * 0.18 + (1 - gs.burgerDist) * sz * 0.22;
  const cy = groundY - sz * 0.65;
  const dh = sz * (bf.h / bf.w);

  if (gs.burgerFury) {
    ctx.save();
    ctx.globalAlpha = 0.22 + Math.sin(Date.now() / 80) * 0.12;
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.arc(cx + sz / 2, cy + dh / 2, sz * 0.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  spr(ctx, sheet, bf, cx, cy, sz, dh);
}

// ─── Player ───────────────────────────────────────────────────────────────────
function drawPlayer(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, gs: GS, playerX: number, groundY: number) {
  const frames = ANIMS[gs.animName] ?? ANIMS.run;
  const [fx, fy] = frames[gs.animIdx % frames.length];
  const f: SFrame = { x: fx, y: fy, w: PFW, h: PFH };

  const dh = gs.isDucking ? Math.round(DISP_H * 0.65) : DISP_H;
  const dw = DISP_W;
  const dx = playerX - dw / 2;
  const dy = gs.playerY - dh;

  if (gs.shieldHits > 0) {
    ctx.save();
    ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 140) * 0.15;
    ctx.fillStyle = '#2980b9';
    ctx.beginPath();
    ctx.ellipse(playerX, gs.playerY - dh * 0.5, dw * 0.72, dh * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  spr(ctx, sheet, f, dx, dy, dw, dh);

  if (gs.isAttacking) {
    ctx.save();
    ctx.globalAlpha = 0.55 + Math.sin(Date.now() / 60) * 0.25;
    ctx.fillStyle = '#F5C200';
    ctx.beginPath();
    ctx.arc(playerX + dw * 0.65, gs.playerY - dh * 0.42, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// ─── Obstacles ────────────────────────────────────────────────────────────────
function drawObst(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, obs: Obst) {
  const f = OBF[obs.type];
  if (!f) return;
  ctx.save();
  ctx.translate(obs.x + obs.w / 2, obs.y + obs.h / 2);
  if (obs.rotation !== 0) ctx.rotate(obs.rotation);
  if (obs.flipped) ctx.scale(-1, 1);
  ctx.drawImage(sheet, f.x, f.y, f.w, f.h, -obs.w / 2, -obs.h / 2, obs.w, obs.h);
  ctx.restore();
}

// ─── Collectibles ─────────────────────────────────────────────────────────────
function drawColl(ctx: CanvasRenderingContext2D, sheet: HTMLCanvasElement, col: Coll, time: number) {
  const fMap: Record<CollType, string> = { spatula: 'spatula', hat: 'hat', sauce: 'sauce' };
  const f = OBF[fMap[col.type]];
  if (!f) return;
  const sz = 40;
  const bob = Math.sin(time / 380) * 4;
  if (col.type === 'spatula') {
    ctx.save();
    ctx.globalAlpha = 0.35 + Math.sin(time / 190) * 0.3;
    ctx.strokeStyle = '#F5C200'; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(col.x + sz / 2, col.y + sz / 2 + bob, sz * 0.72, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  spr(ctx, sheet, f, col.x, col.y + bob, sz, sz);
}

// ─── HUD ──────────────────────────────────────────────────────────────────────
function drawHUD(ctx: CanvasRenderingContext2D, gs: GS, w: number, h: number) {
  // Score box
  ctx.fillStyle = 'rgba(26,26,26,0.78)';
  ctx.beginPath();
  (ctx as any).roundRect(w - 114, 8, 108, 38, 8);
  ctx.fill();
  ctx.fillStyle = '#F5C200';
  ctx.font = `bold ${Math.max(14, w * 0.053)}px "Bricolage Grotesque",sans-serif`;
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  ctx.fillText(String(Math.floor(gs.score)), w - 12, 27);

  if (gs.multiplier > 1) {
    ctx.fillStyle = '#DA291C';
    ctx.font = `bold ${Math.max(11, w * 0.036)}px sans-serif`;
    ctx.fillText(`×${gs.multiplier}`, w - 12, 54);
  }
  if (gs.shieldHits > 0) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#2980b9';
    ctx.font = `bold ${Math.max(11, w * 0.036)}px sans-serif`;
    ctx.fillText(`🛡 ${gs.shieldHits}`, 46, 28);
  }

  ctx.font = `${Math.max(14, w * 0.044)}px sans-serif`;
  ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText(gs.muted ? '🔇' : '🔊', 8, 10);
  ctx.fillText('⏸', 8, 36);

  if (gs.milestoneText && gs.milestoneTimer > 0) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, gs.milestoneTimer / 600);
    ctx.fillStyle = '#DA291C';
    ctx.font = `bold ${Math.max(18, w * 0.062)}px "Bricolage Grotesque",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(gs.milestoneText, w / 2, h * 0.18);
    ctx.restore();
  }
}

// ─── Screen overlays ──────────────────────────────────────────────────────────
function drawCountdown(ctx: CanvasRenderingContext2D, gs: GS, w: number, h: number) {
  ctx.fillStyle = 'rgba(247,244,240,0.65)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#DA291C';
  ctx.font = `bold ${w * 0.28}px "Bricolage Grotesque",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(gs.countdown > 0 ? String(gs.countdown) : 'RUN!', w / 2, h * 0.42);
}

function drawPaused(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = 'rgba(26,26,26,0.76)';
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#f7f4f0';
  ctx.font = `bold ${w * 0.11}px "Bricolage Grotesque",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('PAUSED', w / 2, h * 0.42);
  ctx.fillStyle = 'rgba(247,244,240,0.55)';
  ctx.font = `${w * 0.037}px "DM Sans",sans-serif`;
  ctx.fillText('tap or press any key to resume', w / 2, h * 0.52);
}

function drawGameOver(ctx: CanvasRenderingContext2D, gs: GS, w: number, h: number) {
  ctx.fillStyle = 'rgba(26,26,26,0.92)';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = '#f7f4f0';
  ctx.font = `bold ${w * 0.13}px "Bricolage Grotesque",sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('GOTCHA.', w / 2, h * 0.25);

  const lines = ['He seasoned with courage.','He is now a condiment.','The spatula could not save him.','He ran well. He salted bravely.'];
  ctx.fillStyle = 'rgba(247,244,240,0.55)';
  ctx.font = `italic ${w * 0.04}px "DM Sans",sans-serif`;
  ctx.fillText(lines[Math.floor(gs.score / 10) % lines.length], w / 2, h * 0.34);

  ctx.fillStyle = '#F5C200';
  ctx.font = `bold ${w * 0.10}px "Bricolage Grotesque",sans-serif`;
  ctx.fillText(String(Math.floor(gs.score)), w / 2, h * 0.46);

  ctx.fillStyle = 'rgba(247,244,240,0.42)';
  ctx.font = `${w * 0.035}px "DM Sans",sans-serif`;
  ctx.fillText(`Best: ${Math.floor(gs.highScore)}`, w / 2, h * 0.55);

  const bw = w * 0.58, bh = h * 0.07, bx = w / 2 - bw / 2, by = h * 0.64;
  ctx.fillStyle = '#DA291C';
  ctx.beginPath();
  (ctx as any).roundRect(bx, by, bw, bh, bh / 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${w * 0.05}px "Bricolage Grotesque",sans-serif`;
  ctx.textBaseline = 'middle';
  ctx.fillText('PLAY AGAIN', w / 2, by + bh / 2);
}

// ─── Game state factory ───────────────────────────────────────────────────────
function makeGS(playerName: string, highScore: number, groundY: number): GS {
  return {
    phase: 'COUNTDOWN', playerName, score: 0, highScore,
    elapsedMs: 0, speed: BASE_SPEED,
    playerY: groundY, playerVY: 0, isGrounded: true,
    isDucking: false, isAttacking: false, attackTimer: 0,
    animName: 'idle', animIdx: 0, animTimer: 0,
    burgerDist: 1.0, burgerFury: false, burgerFuryTimer: 0,
    scrollX: 0, obstacles: [], collectibles: [],
    spawnTimer: 1400, collectTimer: 4000,
    shieldHits: 0, multiplier: 1, multiplierTimer: 0, cleanTimer: 0,
    countdown: 3, countTimer: 900,
    milestoneText: null, milestoneTimer: 0,
    muted: false, idCounter: 0, submitted: false,
  };
}

// ─── Obstacle/collectible spawners ────────────────────────────────────────────
type ObstDef = { type: ObstType; yOff: number; w: number; h: number; rot: number; flip?: boolean; minMs?: number };

const OBST_DEFS: ObstDef[] = [
  { type: 'bun',     yOff: 0,   w: 48, h: 38, rot: 0 },
  { type: 'onion',   yOff: 0,   w: 46, h: 38, rot: 0.05 },
  { type: 'ketchup', yOff: 0,   w: 46, h: 30, rot: 0 },
  { type: 'pickle',  yOff: 90,  w: 42, h: 28, rot: 0.07 },
  { type: 'mustard', yOff: 80,  w: 40, h: 30, rot: 0,   flip: true },
  { type: 'lettuce', yOff: 0,   w: 62, h: 52, rot: 0,   minMs: 18000 },
];

function spawnObst(gs: GS, w: number, groundY: number): Obst {
  gs.idCounter++;
  const avail = OBST_DEFS.filter(d => !d.minMs || gs.elapsedMs > d.minMs);
  const def = avail[Math.floor(Math.random() * avail.length)];
  return {
    id: gs.idCounter, type: def.type,
    x: w + 40, y: groundY - def.h - def.yOff,
    w: def.w, h: def.h, rotation: 0, rotSpeed: def.rot, flipped: !!def.flip,
  };
}

function spawnColl(gs: GS, w: number, groundY: number): Coll {
  gs.idCounter++;
  const r = Math.random();
  const type: CollType = r < 0.5 ? 'spatula' : r < 0.75 ? 'hat' : 'sauce';
  return { id: gs.idCounter, type, x: w + 40, y: groundY - 85 };
}

// ─── Update ───────────────────────────────────────────────────────────────────
function update(gs: GS, dt: number, w: number, groundY: number): 'GAME_OVER' | null {
  if (gs.phase === 'COUNTDOWN') {
    gs.countTimer -= dt;
    if (gs.countTimer <= 0) {
      gs.countdown--;
      gs.countTimer = gs.countdown > 0 ? 900 : 700;
      if (gs.countdown < 0) gs.phase = 'PLAYING';
    }
    return null;
  }
  if (gs.phase !== 'PLAYING') return null;

  gs.elapsedMs += dt;
  gs.scrollX += (gs.speed * dt) / 1000;
  gs.score += (dt / 100) * gs.multiplier;

  // Speed ramp
  const tier = Math.floor(gs.elapsedMs / SPEED_EVERY_MS);
  const targetSpeed = Math.min(BASE_SPEED + tier * SPEED_STEP, MAX_SPEED);
  if (targetSpeed > gs.speed) {
    gs.speed = targetSpeed;
    gs.milestoneText = 'FASTER!';
    gs.milestoneTimer = 1200;
  }
  if (gs.milestoneTimer > 0) gs.milestoneTimer -= dt;
  if (gs.multiplierTimer > 0) { gs.multiplierTimer -= dt; if (gs.multiplierTimer <= 0) gs.multiplier = 1; }
  if (gs.isAttacking) { gs.attackTimer -= dt; if (gs.attackTimer <= 0) gs.isAttacking = false; }
  if (gs.burgerFury) { gs.burgerFuryTimer -= dt; if (gs.burgerFuryTimer <= 0) gs.burgerFury = false; }

  // Physics
  if (!gs.isGrounded) {
    gs.playerVY += GRAVITY * (dt / 1000);
    gs.playerY = Math.min(groundY, gs.playerY + gs.playerVY * (dt / 1000));
    if (gs.playerY >= groundY) { gs.playerY = groundY; gs.playerVY = 0; gs.isGrounded = true; }
  }

  // Animation
  const fps = !gs.isGrounded ? 6 : gs.isDucking ? 5 : 10;
  gs.animTimer += dt;
  if (gs.animTimer >= 1000 / fps) {
    gs.animTimer = 0;
    const frames = ANIMS[gs.animName] ?? ANIMS.run;
    gs.animIdx = (gs.animIdx + 1) % frames.length;
  }
  gs.animName = gs.isAttacking ? 'attack' : !gs.isGrounded ? 'jump' : gs.isDucking ? 'duck' : 'run';

  // Spawn
  gs.spawnTimer -= dt;
  if (gs.spawnTimer <= 0) {
    gs.obstacles.push(spawnObst(gs, w, groundY));
    gs.spawnTimer = Math.max(650, 1800 - gs.elapsedMs / 100) + Math.random() * 500;
  }
  gs.collectTimer -= dt;
  if (gs.collectTimer <= 0) {
    gs.collectibles.push(spawnColl(gs, w, groundY));
    gs.collectTimer = 4500 + Math.random() * 3000;
  }

  // Player hitbox
  const phH = gs.isDucking ? 40 : 70;
  const phW = 26;
  const playerX = w * PLAYER_X_RATIO;
  const phX1 = playerX - phW / 2, phY1 = gs.playerY - phH;
  const phX2 = phX1 + phW,        phY2 = phY1 + phH;

  // Collide obstacles
  let gotHit = false;
  gs.obstacles = gs.obstacles.filter(obs => {
    obs.x -= (gs.speed * dt) / 1000;
    obs.rotation += obs.rotSpeed;
    if (obs.x + obs.w < 0) return false;
    const ox1 = obs.x + obs.w * 0.12, oy1 = obs.y + obs.h * 0.12;
    const ox2 = ox1 + obs.w * 0.76,   oy2 = oy1 + obs.h * 0.76;
    if (phX1 < ox2 && phX2 > ox1 && phY1 < oy2 && phY2 > oy1) {
      if (gs.isAttacking) return false;
      if (gs.shieldHits > 0) { gs.shieldHits--; return false; }
      gotHit = true; return false;
    }
    return true;
  });

  // Collect collectibles
  gs.collectibles = gs.collectibles.filter(col => {
    col.x -= (gs.speed * dt) / 1000;
    if (col.x + 40 < 0) return false;
    if (phX1 < col.x + 40 && phX2 > col.x && phY1 < col.y + 40 && phY2 > col.y) {
      applyCol(gs, col.type); return false;
    }
    return true;
  });

  // Hit consequences
  if (gotHit) {
    gs.burgerDist = Math.max(0, gs.burgerDist - 0.22);
    gs.burgerFury = true; gs.burgerFuryTimer = 1200; gs.cleanTimer = 0;
    if (gs.burgerDist <= 0) {
      gs.phase = 'GAME_OVER';
      gs.highScore = Math.max(gs.score, gs.highScore);
      return 'GAME_OVER';
    }
  } else {
    gs.cleanTimer += dt;
    if (gs.cleanTimer > 5000) gs.burgerDist = Math.min(1, gs.burgerDist + 0.0003 * dt);
  }
  if (gs.cleanTimer >= 30000) {
    gs.score += 100 * gs.multiplier;
    gs.burgerDist = Math.min(1, gs.burgerDist + 0.12);
    gs.cleanTimer = 0; gs.milestoneText = 'CLEAN RUN! +100'; gs.milestoneTimer = 1400;
  }

  return null;
}

function applyCol(gs: GS, type: CollType) {
  if (type === 'spatula') {
    gs.score += 50 * gs.multiplier; gs.milestoneText = '+50'; gs.milestoneTimer = 800;
  } else if (type === 'hat') {
    gs.shieldHits = Math.min(3, gs.shieldHits + 1); gs.milestoneText = 'SHIELD!'; gs.milestoneTimer = 900;
  } else {
    gs.multiplier = 2; gs.multiplierTimer = 8000; gs.milestoneText = '×2 SCORE!'; gs.milestoneTimer = 900;
  }
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderFrame(
  ctx: CanvasRenderingContext2D, gs: GS,
  pSheet: HTMLCanvasElement, oSheet: HTMLCanvasElement,
  w: number, h: number, groundY: number, time: number,
) {
  ctx.clearRect(0, 0, w, h);
  drawBg(ctx, gs.scrollX, w, h, groundY);
  drawPursuer(ctx, oSheet, gs, w, groundY);
  for (const col of gs.collectibles) drawColl(ctx, oSheet, col, time);
  for (const obs of gs.obstacles) drawObst(ctx, oSheet, obs);
  if (gs.phase !== 'GAME_OVER') drawPlayer(ctx, pSheet, gs, w * PLAYER_X_RATIO, groundY);
  if (gs.phase === 'PLAYING') drawHUD(ctx, gs, w, h);
  if (gs.phase === 'COUNTDOWN') drawCountdown(ctx, gs, w, h);
  if (gs.phase === 'PAUSED') drawPaused(ctx, w, h);
  if (gs.phase === 'GAME_OVER') drawGameOver(ctx, gs, w, h);
}

// ─── React component ──────────────────────────────────────────────────────────
export default function BeefburgerGame() {
  const canvasRef    = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gsRef        = useRef<GS | null>(null);
  const rafRef       = useRef<number>(0);
  const lastTRef     = useRef<number>(0);
  const pSheetRef    = useRef<HTMLCanvasElement | null>(null);
  const oSheetRef    = useRef<HTMLCanvasElement | null>(null);

  const [uiPhase, setUiPhase]       = useState<'LOADING' | 'TITLE' | 'ACTIVE'>('LOADING');
  const [playerName, setPlayerName] = useState('');
  const [loadError, setLoadError]   = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loadingBoard, setLoadingBoard] = useState(true);
  const [submitting, setSubmitting]   = useState(false);

  const highRef = useRef(
    typeof window !== 'undefined' ? parseInt(localStorage.getItem('mrbeefburger_highscore') || '0', 10) : 0,
  );

  const fetchBoard = useCallback(async () => {
    try {
      setLoadingBoard(true);
      const r = await fetch('/api/game-scores');
      setLeaderboard(await r.json());
    } catch { /* silent */ } finally { setLoadingBoard(false); }
  }, []);

  // Load sprites once
  useEffect(() => {
    fetchBoard();
    Promise.all([
      loadSprite('/sprites/game-sprite-mrbeefburger.png'),
      loadSprite('/sprites/game-sprite-burger-obstacles.png'),
    ]).then(([p, o]) => {
      pSheetRef.current = p; oSheetRef.current = o;
      setUiPhase('TITLE');
    }).catch(() => setLoadError('Could not load sprites. Refresh to retry.'));
  }, [fetchBoard]);

  // Canvas sizing
  useEffect(() => {
    const resize = () => {
      const c = canvasRef.current, div = containerRef.current;
      if (!c || !div) return;
      const cw = Math.min(div.clientWidth, 480);
      c.width = cw; c.height = Math.round(cw * 1.5);
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const stopLoop = () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };

  const startGame = useCallback((name: string) => {
    const canvas = canvasRef.current, p = pSheetRef.current, o = oSheetRef.current;
    if (!canvas || !p || !o) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gY = Math.round(canvas.height * GROUND_RATIO);
    const gs = makeGS(name.trim() || 'Anonymous', highRef.current, gY);
    gsRef.current = gs;
    setUiPhase('ACTIVE');

    const loop = (ts: number) => {
      if (!gsRef.current) return;
      const dt = Math.min(ts - (lastTRef.current || ts), 50);
      lastTRef.current = ts;
      const gYnow = Math.round(canvas.height * GROUND_RATIO);
      const result = update(gsRef.current, dt, canvas.width, gYnow);
      renderFrame(ctx, gsRef.current, p, o, canvas.width, canvas.height, gYnow, ts);
      if (result === 'GAME_OVER') {
        const score = Math.floor(gsRef.current.score);
        const dur   = Math.floor(gsRef.current.elapsedMs / 1000);
        if (score > highRef.current) {
          highRef.current = score;
          localStorage.setItem('mrbeefburger_highscore', String(score));
        }
        setSubmitting(true);
        fetch('/api/game-scores', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerName: name.trim() || 'Anonymous', score, durationSeconds: dur }),
        }).then(() => fetchBoard()).catch(() => {}).finally(() => setSubmitting(false));
        return;
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    stopLoop(); lastTRef.current = 0;
    rafRef.current = requestAnimationFrame(loop);
  }, [fetchBoard]);

  // Canvas click: pause toggle, mute, play-again button
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current, gs = gsRef.current;
    if (!canvas || !gs) return;
    const rect = canvas.getBoundingClientRect();
    const cx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const cy = (e.clientY - rect.top)  * (canvas.height / rect.height);
    const w = canvas.width, h = canvas.height;

    if (gs.phase === 'GAME_OVER') {
      const bw = w * 0.58, bh = h * 0.07, bx = w / 2 - bw / 2, by = h * 0.64;
      if (cx >= bx && cx <= bx + bw && cy >= by && cy <= by + bh) {
        stopLoop(); gsRef.current = null; setUiPhase('TITLE');
      }
      return;
    }
    if (gs.phase === 'PLAYING') {
      if (cx < 42 && cy < 34) { gs.muted = !gs.muted; return; }
      if (cx < 42 && cy >= 34 && cy < 64) { gs.phase = 'PAUSED'; return; }
    }
    if (gs.phase === 'PAUSED') gs.phase = 'PLAYING';
  }, []);

  // Keyboard
  useEffect(() => {
    const dn = (e: KeyboardEvent) => {
      const gs = gsRef.current; if (!gs) return;
      if (gs.phase === 'PAUSED') { gs.phase = 'PLAYING'; return; }
      if (gs.phase !== 'PLAYING') return;
      if ([' ', 'ArrowUp', 'w', 'W'].includes(e.key)) {
        e.preventDefault();
        if (gs.isGrounded) { gs.playerVY = JUMP_VEL; gs.isGrounded = false; gs.isDucking = false; gs.animIdx = 0; }
      }
      if (['ArrowDown', 's', 'S'].includes(e.key)) {
        e.preventDefault();
        if (gs.isGrounded) { gs.isDucking = true; gs.animIdx = 0; }
      }
      if (['z', 'Z', 'x', 'X'].includes(e.key) && !gs.isAttacking) {
        gs.isAttacking = true; gs.attackTimer = 400; gs.animIdx = 0;
      }
      if (['Escape', 'p', 'P'].includes(e.key)) gs.phase = 'PAUSED';
    };
    const up = (e: KeyboardEvent) => {
      const gs = gsRef.current; if (!gs) return;
      if (['ArrowDown', 's', 'S'].includes(e.key)) gs.isDucking = false;
    };
    window.addEventListener('keydown', dn);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', dn); window.removeEventListener('keyup', up); };
  }, []);

  // Touch: tap = jump, swipe down = duck, swipe up = jump
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    let tx = 0, ty = 0, tt = 0;
    const ts = (e: TouchEvent) => { e.preventDefault(); tx = e.touches[0].clientX; ty = e.touches[0].clientY; tt = Date.now(); };
    const te = (e: TouchEvent) => {
      e.preventDefault();
      const gs = gsRef.current; if (!gs || gs.phase !== 'PLAYING') return;
      const dx = e.changedTouches[0].clientX - tx;
      const dy = e.changedTouches[0].clientY - ty;
      const elapsed = Date.now() - tt;
      if (Math.abs(dx) < 18 && Math.abs(dy) < 18 && elapsed < 260) {
        if (gs.isGrounded) { gs.playerVY = JUMP_VEL; gs.isGrounded = false; gs.isDucking = false; }
      } else if (dy > 38 && Math.abs(dy) > Math.abs(dx)) {
        if (gs.isGrounded) { gs.isDucking = true; setTimeout(() => { if (gsRef.current) gsRef.current.isDucking = false; }, 650); }
      } else if (dy < -38 && Math.abs(dy) > Math.abs(dx)) {
        if (gs.isGrounded) { gs.playerVY = JUMP_VEL; gs.isGrounded = false; }
      }
    };
    canvas.addEventListener('touchstart', ts, { passive: false });
    canvas.addEventListener('touchend', te, { passive: false });
    return () => { canvas.removeEventListener('touchstart', ts); canvas.removeEventListener('touchend', te); };
  }, []);

  useEffect(() => () => stopLoop(), []);

  return (
    <div className="gw">
      <div className="gc" ref={containerRef}>
        {(uiPhase === 'LOADING' || uiPhase === 'TITLE') && (
          <div className="title-ov">
            <div className="title-box">
              {uiPhase === 'LOADING' ? (
                <p className="tagline">{loadError || 'Loading...'}</p>
              ) : (
                <>
                  <p className="tagline">
                    {['He made it too well.', 'Some burgers were not meant to be.', 'Run, chef. Run.'][Math.floor(Date.now() / 4000) % 3]}
                  </p>
                  {highRef.current > 0 && <p className="best">Best: {highRef.current}</p>}
                  <input
                    className="name-in" type="text" placeholder="Your name or initials"
                    maxLength={20} value={playerName} autoFocus
                    onInput={e => setPlayerName((e.target as HTMLInputElement).value)}
                    onKeyDown={e => { if (e.key === 'Enter') startGame(playerName); }}
                  />
                  <button className="start-btn" onClick={() => startGame(playerName)}>START RUNNING</button>
                  <p className="hint">↑ / Space = jump · ↓ = duck · Z/X = spatula attack · swipe on mobile</p>
                </>
              )}
            </div>
          </div>
        )}
        {uiPhase === 'ACTIVE' && submitting && <p className="sub-txt">Saving score...</p>}
        <canvas
          ref={canvasRef} className="gc-canvas" onClick={handleClick}
          style={{ display: uiPhase === 'ACTIVE' ? 'block' : 'none' }}
        />
      </div>

      <div className="lb-col">
        <h2 className="lb-h">Leaderboard</h2>
        {loadingBoard ? <p className="lb-dim">Loading...</p>
          : leaderboard.length === 0 ? <p className="lb-dim">No scores yet. Be the first.</p>
          : (
            <ol className="lb-list">
              {leaderboard.map((e, i) => (
                <li key={e.id} className={`lb-row${i === 0 ? ' lb-top' : ''}`}>
                  <span className="lb-rank">{i + 1}</span>
                  <span className="lb-name">{e.playerName || 'Anonymous'}</span>
                  <span className="lb-score">{e.score.toLocaleString()}</span>
                  <span className="lb-dur">{e.durationSeconds}s</span>
                </li>
              ))}
            </ol>
          )}
        <button className="lb-refresh" onClick={fetchBoard}>↻ Refresh</button>
      </div>

      <style>{`
        .gw{display:flex;gap:2.5rem;align-items:flex-start;flex-wrap:wrap}
        .gc{position:relative;flex:0 0 auto;width:100%;max-width:480px}
        .gc-canvas{display:block;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,0.14);touch-action:none;width:100%;height:auto}
        .title-ov{background:#f7f4f0;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,0.12);padding:2.5rem 2rem;display:flex;flex-direction:column;align-items:center;min-height:340px;justify-content:center}
        .title-box{display:flex;flex-direction:column;align-items:center;gap:1rem;width:100%}
        .tagline{font-family:var(--font-body);font-style:italic;color:var(--color-muted);font-size:1rem;margin:0;text-align:center}
        .best{font-family:var(--font-display);font-weight:700;color:var(--color-red);font-size:1.1rem;margin:0}
        .name-in{font-family:var(--font-body);font-size:1.05rem;padding:.65rem 1rem;border:2px solid rgba(0,0,0,.15);border-radius:8px;width:100%;max-width:300px;outline:none;background:#fff;color:var(--color-text);text-align:center;transition:border-color .2s}
        .name-in:focus{border-color:var(--color-red)}
        .start-btn{font-family:var(--font-body);font-size:.9rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;background:var(--color-red);color:#fff;border:none;border-radius:999px;padding:.8rem 2rem;cursor:pointer;transition:opacity .2s}
        .start-btn:hover{opacity:.88}
        .hint{font-size:.73rem;color:var(--color-muted);margin:0;text-align:center}
        .sub-txt{font-size:.85rem;color:var(--color-muted);font-style:italic;text-align:center;padding:.4rem 0}
        .lb-col{flex:1 1 220px;min-width:200px}
        .lb-h{font-family:var(--font-display);font-size:1.4rem;font-weight:800;color:var(--color-red);margin:0 0 1rem}
        .lb-dim{font-size:.9rem;color:var(--color-muted);font-style:italic}
        .lb-list{list-style:none;padding:0;margin:0 0 1rem;display:flex;flex-direction:column;gap:.5rem}
        .lb-row{display:flex;align-items:center;gap:.6rem;font-family:var(--font-body);font-size:.9rem;padding:.5rem .75rem;background:var(--color-surface);border-radius:8px}
        .lb-top{background:rgba(218,41,28,.08);border:1px solid rgba(218,41,28,.2)}
        .lb-rank{font-weight:700;color:var(--color-muted);width:1.2rem;flex-shrink:0}
        .lb-top .lb-rank{color:var(--color-red)}
        .lb-name{flex:1;font-weight:600;color:var(--color-text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .lb-score{font-weight:700;color:var(--color-red);font-size:.95rem}
        .lb-dur{font-size:.75rem;color:var(--color-muted);flex-shrink:0}
        .lb-refresh{font-family:var(--font-body);font-size:.8rem;font-weight:600;background:none;border:1.5px solid rgba(0,0,0,.15);border-radius:999px;padding:.35rem .9rem;cursor:pointer;color:var(--color-text);transition:border-color .2s}
        .lb-refresh:hover{border-color:var(--color-red);color:var(--color-red)}
      `}</style>
    </div>
  );
}
