import {
  PLAYER_SPEED, PLAYER_RUN_SPEED, PLAYER_MAX_HP,
  PLAYER_MAX_HUNGER, PLAYER_MAX_WATER, PLAYER_MAX_STAMINA,
  HUNGER_DECAY_RATE, WATER_DECAY_RATE, STAMINA_RUN_DECAY,
  STAMINA_REGEN, ATTACK_RANGE, ATTACK_DAMAGE, ATTACK_COOLDOWN,
  TILE_W, TILE_H, MAP_COLS, MAP_ROWS, TILE_SPEED
} from './constants.js';
import { isWalkable } from './map.js';

export function createPlayer() {
  const startCol = Math.floor(MAP_COLS / 2);
  const startRow = Math.floor(MAP_ROWS / 2);
  return {
    // world position (pixel space, not tile space)
    x: startCol * TILE_W,
    y: startRow * TILE_H,
    col: startCol,
    row: startRow,
    // stats
    hp: PLAYER_MAX_HP,
    maxHp: PLAYER_MAX_HP,
    hunger: PLAYER_MAX_HUNGER,
    water: PLAYER_MAX_WATER,
    stamina: PLAYER_MAX_STAMINA,
    // state
    isRunning: false,
    facingAngle: 0,        // angle toward mouse (radians)
    attackCooldown: 0,
    lastAttackTime: 0,
    infectedTimer: 0,
    injuries: [],          // array of active injuries: 'minor_wound', 'bitten', 'deep_cut'
    // inventory
    inventory: {
      food: 3,
      water_jug: 3,
      wood: 5,
      stone: 5,
      meat: 0,
      sun_stone: 0,
      rags: 0,
      pills: 0,
      shiv: 0,
      molotov: 0,
      noise_bomb: 0,
      electric_trap: 0,
      medkit: 0,
      infection_cure: 0,
      painkiller: 0,
    },
    // xp / level
    xp: 0,
    level: 1,
    // flags
    hasSunStone: false,
    isAlive: true,
    attackAnim: 0,         // frames of attack flash
  };
}

export function updatePlayer(player, keys, mouseAngle, tiles, buildings, dt, now) {
  if (!player.isAlive) return;

  // ── stamina check ──────────────────────────────────────────────────────────
  const wantRun = keys['ShiftLeft'] || keys['ShiftRight'];
  player.isRunning = wantRun && player.stamina > 0;
  const baseSpeed = player.isRunning ? PLAYER_RUN_SPEED : PLAYER_SPEED;

  // ── terrain speed modifier & injury debuff ───────────────────────────────
  const currentTile = tiles[player.row]?.[player.col] ?? 0;
  let terrainMult = TILE_SPEED[currentTile] ?? 1.0;
  
  if (player.injuries?.includes('minor_wound')) terrainMult *= 0.85; // 15% slower
  
  const speed = baseSpeed * terrainMult;

  // ── WASD → screen-space direction, then convert to world ─────────────────
  // Accumulate in SCREEN space (iso-aligned axes) so diagonal speed is
  // visually identical to cardinal speed regardless of tile aspect ratio.
  let sx = 0, sy = 0;
  if (keys['KeyW'] || keys['ArrowUp'])    { sx +=  0; sy -= 1; } // screen up
  if (keys['KeyS'] || keys['ArrowDown'])  { sx +=  0; sy += 1; } // screen down
  if (keys['KeyA'] || keys['ArrowLeft'])  { sx -= 1; sy +=  0; } // screen left
  if (keys['KeyD'] || keys['ArrowRight']) { sx += 1; sy +=  0; } // screen right

  // Normalize screen vector (handles all combos equally)
  const smag = Math.sqrt(sx * sx + sy * sy);
  let wx = 0, wy = 0;
  if (smag > 0) {
    const nsx = sx / smag;
    const nsy = sy / smag;
    // Inverse iso projection (TILE_W=64, TILE_H=32):
    //   screen_x = wx/2 - wy  →  wx =  nsx + 2*nsy
    //   screen_y = wx/4 + wy/2 →  wy =  nsy - nsx*0.5
    wx = (nsx + 2 * nsy) * speed;
    wy = (nsy - nsx * 0.5) * speed;
  }

  // ── collision with map boundaries & water ─────────────────────────────────
  const nextX = player.x + wx;
  const nextY = player.y + wy;
  const nextCol = Math.floor(nextX / TILE_W);
  const nextRow = Math.floor(nextY / TILE_H);

  // Check building collision
  const bKey = `${Math.floor(nextX / TILE_W)},${Math.floor(nextY / TILE_H)}`;
  const hasBuilding = buildings && buildings[bKey];

  if (isWalkable(tiles, nextCol, nextRow) && !hasBuilding) {
    player.x = nextX;
    player.y = nextY;
  } else {
    // Try sliding on X
    const slX = Math.floor((player.x + wx) / TILE_W);
    const slY = Math.floor(player.y / TILE_H);
    const bKeyX = `${slX},${slY}`;
    if (isWalkable(tiles, slX, slY) && !buildings[bKeyX]) {
      player.x += wx;
    }
    // Try sliding on Y
    const slX2 = Math.floor(player.x / TILE_W);
    const slY2 = Math.floor((player.y + wy) / TILE_H);
    const bKeyY = `${slX2},${slY2}`;
    if (isWalkable(tiles, slX2, slY2) && !buildings[bKeyY]) {
      player.y += wy;
    }
  }

  player.col = Math.floor(player.x / TILE_W);
  player.row = Math.floor(player.y / TILE_H);

  // ── facing angle ──────────────────────────────────────────────────────────
  player.facingAngle = mouseAngle;

  // ── stat decay ────────────────────────────────────────────────────────────
  player.hunger  = Math.max(0, player.hunger  - HUNGER_DECAY_RATE * dt);
  player.water   = Math.max(0, player.water   - WATER_DECAY_RATE  * dt);

  // ── deep cut debuff ──────────────────────────────────────────────────────
  let runDecay = STAMINA_RUN_DECAY;
  if (player.injuries?.includes('deep_cut')) runDecay *= 1.25;

  if (player.isRunning && (wx !== 0 || wy !== 0)) {
    player.stamina = Math.max(0, player.stamina - runDecay * dt);
  } else {
    player.stamina = Math.min(PLAYER_MAX_STAMINA, player.stamina + STAMINA_REGEN * dt);
  }

  // ── starvation / dehydration damage ──────────────────────────────────────
  if (player.hunger === 0) {
    player.hp = Math.max(0, player.hp - 0.015 * dt);
  }
  if (player.water === 0) {
    player.hp = Math.max(0, player.hp - 0.02 * dt);
  }

  // ── infection timer (Bitten) ──────────────────────────────────────────────
  if (player.injuries?.includes('bitten')) {
    player.infectionTimer -= dt;
    if (player.infectionTimer <= 0) {
      player.hp = 0; // Death by infection
    }
  }

  // ── attack cooldown ───────────────────────────────────────────────────────
  if (player.attackCooldown > 0) player.attackCooldown -= dt;
  if (player.attackAnim > 0)     player.attackAnim -= dt;

  // ── death check ───────────────────────────────────────────────────────────
  if (player.hp <= 0) player.isAlive = false;
}

export function playerAttack(player, zombies, now) {
  if (player.attackCooldown > 0) return [];
  player.attackCooldown = ATTACK_COOLDOWN;
  player.attackAnim = 200;

  const hit = [];
  for (const z of zombies) {
    if (!z.isAlive) continue;
    const dist = Math.hypot(z.x - player.x, z.y - player.y);
    if (dist <= ATTACK_RANGE) {
      let dmg = ATTACK_DAMAGE;
      // Sun stone kills boss
      if (z.isBoss && player.hasSunStone) dmg = 9999;
      else if (z.isBoss) dmg = 0; // can't hurt boss without sun stone
      z.hp -= dmg;
      if (z.hp <= 0) z.isAlive = false;
      hit.push({ x: z.x, y: z.y, dmg });
    }
  }
  return hit;
}

export function useItem(player, itemType) {
  if (player.inventory[itemType] <= 0) return false;
  if (itemType === 'food') {
    player.hunger = Math.min(PLAYER_MAX_HUNGER, player.hunger + 30);
    player.inventory.food--;
    return true;
  }
  if (itemType === 'water_jug') {
    player.water = Math.min(PLAYER_MAX_WATER, player.water + 35);
    player.inventory.water_jug--;
    return true;
  }
  if (itemType === 'meat') {
    player.hunger = Math.min(PLAYER_MAX_HUNGER, player.hunger + 50);
    player.inventory.meat--;
    return true;
  }
  if (itemType === 'sun_stone') {
    player.hasSunStone = true;
    return true;
  }
  if (itemType === 'medkit') {
    player.hp = Math.min(player.maxHp, player.hp + player.maxHp * 0.6);
    // remove minor wound
    if (player.injuries) {
      player.injuries = player.injuries.filter(i => i !== 'minor_wound' && i !== 'deep_cut');
    }
    player.inventory.medkit--;
    return true;
  }
  if (itemType === 'infection_cure') {
    if (player.injuries) {
      player.injuries = player.injuries.filter(i => i !== 'bitten');
    }
    player.inventory.infection_cure--;
    return true;
  }
  if (itemType === 'painkiller') {
    player.hp = Math.min(player.maxHp, player.hp + 20); // temp boost
    player.inventory.painkiller--;
    return true;
  }
  return false;
}

export function tryStealthKill(player, zombies) {
  for (const z of zombies) {
    if (!z.isAlive || z.isBoss) continue;
    // Must be unaware
    if (z.state > 1) continue; // > CURIOUS means aware
    
    const dist = Math.hypot(z.x - player.x, z.y - player.y);
    if (dist <= ATTACK_RANGE + 10) {
      // Check if player is behind zombie (zombie faces its movement target)
      // Since zombie.facing isn't strictly tracked, we just check stealth if unaware and close
      z.hp = 0;
      z.isAlive = false;
      return { success: true, target: z };
    }
  }
  return { success: false };
}

export function addXP(player, amount) {
  player.xp += amount;
  const threshold = player.level * 100;
  if (player.xp >= threshold) {
    player.xp -= threshold;
    player.level++;
    player.maxHp = Math.min(200, player.maxHp + 10);
    player.hp = Math.min(player.maxHp, player.hp + 20);
  }
}
