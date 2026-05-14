import { ZOMBIE_RANKS, BOSS_RANK, TILE_W, TILE_H, MAP_COLS, MAP_ROWS } from './constants.js';
import { isWalkable } from './map.js';

let zombieIdCounter = 0;

export function spawnZombie(rank, tiles, playerX, playerY) {
  const def = rank === 12 ? BOSS_RANK : ZOMBIE_RANKS[rank - 1];
  // Spawn from map edge
  const edge = Math.floor(Math.random() * 4);
  let col, row;
  if (edge === 0) { col = Math.floor(Math.random() * MAP_COLS); row = 0; }
  else if (edge === 1) { col = MAP_COLS - 1; row = Math.floor(Math.random() * MAP_ROWS); }
  else if (edge === 2) { col = Math.floor(Math.random() * MAP_COLS); row = MAP_ROWS - 1; }
  else { col = 0; row = Math.floor(Math.random() * MAP_ROWS); }

  // Ensure walkable
  let attempts = 0;
  while (!isWalkable(tiles, col, row) && attempts < 50) {
    col = Math.max(0, Math.min(MAP_COLS - 1, col + (Math.random() > 0.5 ? 1 : -1)));
    row = Math.max(0, Math.min(MAP_ROWS - 1, row + (Math.random() > 0.5 ? 1 : -1)));
    attempts++;
  }

  return {
    id: zombieIdCounter++,
    rank,
    isBoss: rank === 12,
    ...def,
    maxHp: def.hp,
    x: col * TILE_W,
    y: row * TILE_H,
    col, row,
    isAlive: true,
    isReviving: false,
    stunTimer: 0,
    hitFlash: 0,
    teleportCooldown: rank === 11 ? 3000 : 0,
    spitCooldown: rank === 5  ? 2000 : 0,
    necroTimer: rank === 9 ? 4000 : 0,
    // AI state
    path: [],
    pathTimer: 0,
    attackCooldown: 0,
  };
}

export function updateZombies(zombies, player, buildings, tiles, dt, now, particles) {
  const buildingKeys = new Set(Object.keys(buildings));

  for (const z of zombies) {
    if (!z.isAlive) continue;
    if (z.stunTimer > 0) { z.stunTimer -= dt; continue; }
    if (z.hitFlash > 0)  z.hitFlash -= dt;

    const speed = z.speed * (1 + (now % 1000) * 0); // constant speed

    // ── Special behaviours ─────────────────────────────────────────────────
    // Shadow teleport
    if (z.rank === 11) {
      z.teleportCooldown -= dt;
      if (z.teleportCooldown <= 0) {
        z.teleportCooldown = 3000 + Math.random() * 2000;
        const angle = Math.random() * Math.PI * 2;
        const dist  = 60 + Math.random() * 80;
        const nx = z.x + Math.cos(angle) * dist;
        const ny = z.y + Math.sin(angle) * dist;
        const nc = Math.floor(nx / TILE_W);
        const nr = Math.floor(ny / TILE_H);
        if (isWalkable(tiles, nc, nr)) { z.x = nx; z.y = ny; }
      }
    }

    // Necromancer revive
    if (z.rank === 9) {
      z.necroTimer -= dt;
      if (z.necroTimer <= 0) {
        z.necroTimer = 5000;
        for (const other of zombies) {
          if (!other.isAlive && other.rank < 9) {
            const dist = Math.hypot(other.x - z.x, other.y - z.y);
            if (dist < 150) {
              other.isAlive = true;
              other.hp = Math.floor(other.maxHp * 0.3);
              break;
            }
          }
        }
      }
    }

    // ── Move toward player (or nearest building) ───────────────────────────
    let targetX = player.x;
    let targetY = player.y;

    // Check if a building is closer
    let closestBuildDist = Math.hypot(player.x - z.x, player.y - z.y);
    for (const key of buildingKeys) {
      const [bc, br] = key.split(',').map(Number);
      const bx = bc * TILE_W + TILE_W / 2;
      const by = br * TILE_H + TILE_H / 2;
      const bd = Math.hypot(bx - z.x, by - z.y);
      if (bd < closestBuildDist) {
        closestBuildDist = bd;
        targetX = bx;
        targetY = by;
      }
    }

    const distToTarget = Math.hypot(targetX - z.x, targetY - z.y);
    if (distToTarget > 2) {
      const angle = Math.atan2(targetY - z.y, targetX - z.x);
      const nx = z.x + Math.cos(angle) * speed;
      const ny = z.y + Math.sin(angle) * speed;
      const nc = Math.floor(nx / TILE_W);
      const nr = Math.floor(ny / TILE_H);
      if (isWalkable(tiles, nc, nr)) {
        z.x = nx;
        z.y = ny;
      }
    }

    // ── Attack player ──────────────────────────────────────────────────────
    z.attackCooldown -= dt;
    if (z.attackCooldown <= 0) {
      const distPlayer = Math.hypot(player.x - z.x, player.y - z.y);
      const range = z.isBoss ? 70 : 35;
      if (distPlayer < range) {
        z.attackCooldown = z.isBoss ? 800 : 1200;
        player.hp -= z.dmg;
        if (z.rank === 4 && !player.infected) {
          player.infected = true;
          player.infectedTimer = 8000;
          player.speed = TILE_W * 0.5; // slow debuff handled in player update
        }
        // Boss AOE in phase 3
        if (z.isBoss && z.hp < z.maxHp * 0.25) {
          // screen shake handled in renderer
          particles && particles.push({ type:'boss_aoe', x: z.x, y: z.y, timer: 600 });
          player.hp -= 15; // extra AOE chip
        }
      }
      // Attack buildings
      for (const key of buildingKeys) {
        const [bc, br] = key.split(',').map(Number);
        const bx = bc * TILE_W + TILE_W / 2;
        const by = br * TILE_H + TILE_H / 2;
        const bd = Math.hypot(bx - z.x, by - z.y);
        if (bd < 35) {
          buildings[key].hp -= z.dmg * 0.5;
          z.attackCooldown = 800;
          if (buildings[key].hp <= 0) {
            delete buildings[key];
            buildingKeys.delete(key);
          }
          break;
        }
      }
    }

    // Bloater explosion on death (handled in waveManager)
    z.col = Math.floor(z.x / TILE_W);
    z.row = Math.floor(z.y / TILE_H);
  }
}

export function getBossPhase(boss) {
  if (!boss) return 0;
  const ratio = boss.hp / boss.maxHp;
  if (ratio > 0.66) return 1;
  if (ratio > 0.33) return 2;
  return 3;
}
