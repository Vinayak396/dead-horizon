import { ZOMBIE_RANKS, BOSS_RANK, TILE_W, TILE_H, MAP_COLS, MAP_ROWS, ZOMBIE_STATE } from './constants.js';
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
    state: ZOMBIE_STATE.IDLE,
    stateTimer: 0,
    targetX: col * TILE_W,
    targetY: row * TILE_H,
    lastKnownX: 0,
    lastKnownY: 0,
    highAlertTimer: 0,
    memoryScore: 0,
    attackCooldown: 0,
  };
}

export function updateZombies(zombies, player, buildings, tiles, dt, now, particles, noiseEvents = []) {
  const buildingKeys = new Set(Object.keys(buildings));

  // Helper: clear line of sight
  const hasLineOfSight = (zx, zy, px, py) => {
    // simplified: just check distance and buildings. (Real raycast is better but complex for isometric)
    const dist = Math.hypot(px - zx, py - zy);
    if (dist > 600) return false;
    // Check if a building is directly between them
    for (const key of buildingKeys) {
      const b = buildings[key];
      const bx = b.col * TILE_W + TILE_W/2;
      const by = b.row * TILE_H + TILE_H/2;
      const bDist = Math.hypot(bx - zx, by - zy);
      if (bDist < dist) {
        // rough dot product check
        const dirX = (px - zx) / dist;
        const dirY = (py - zy) / dist;
        const bDirX = (bx - zx) / bDist;
        const bDirY = (by - zy) / bDist;
        const dot = dirX * bDirX + dirY * bDirY;
        if (dot > 0.95) return false; // blocked
      }
    }
    return true;
  };

  for (const z of zombies) {
    if (!z.isAlive) continue;
    if (z.stunTimer > 0) { z.stunTimer -= dt; continue; }
    if (z.hitFlash > 0)  z.hitFlash -= dt;

    if (z.highAlertTimer > 0) z.highAlertTimer -= dt;

    let speed = z.speed;
    const canSeePlayer = hasLineOfSight(z.x, z.y, player.x, player.y);
    const distPlayer = Math.hypot(player.x - z.x, player.y - z.y);

    // ── Noise Reaction ──────────────────────────────────────────────────────
    let loudestNoise = null;
    let maxVolume = 0;
    for (const noise of noiseEvents) {
      const d = Math.hypot(noise.x - z.x, noise.y - z.y);
      if (d < noise.radius) {
        const volume = noise.radius - d;
        if (volume > maxVolume) { maxVolume = volume; loudestNoise = noise; }
      }
    }

    if (loudestNoise && z.state !== ZOMBIE_STATE.HUNTING) {
      z.lastKnownX = loudestNoise.x;
      z.lastKnownY = loudestNoise.y;
      if (loudestNoise.radius > 150) {
        z.state = ZOMBIE_STATE.ALERTED;
        z.stateTimer = 1000;
      } else if (z.state === ZOMBIE_STATE.IDLE || z.state === ZOMBIE_STATE.GIVING_UP) {
        z.state = ZOMBIE_STATE.CURIOUS;
        z.stateTimer = 8000 + Math.random() * 4000;
      }
    }

    // ── AI State Machine ────────────────────────────────────────────────────
    switch (z.state) {
      case ZOMBIE_STATE.IDLE:
        speed *= 0.4;
        z.stateTimer -= dt;
        if (z.stateTimer <= 0) {
          // pick new wander spot
          const angle = Math.random() * Math.PI * 2;
          z.targetX = z.x + Math.cos(angle) * 100;
          z.targetY = z.y + Math.sin(angle) * 100;
          z.stateTimer = 4000 + Math.random() * 4000;
        }
        if (canSeePlayer && distPlayer < (z.highAlertTimer > 0 ? 350 : 250)) {
          z.state = ZOMBIE_STATE.ALERTED;
          z.stateTimer = 800; // screech time
        }
        break;

      case ZOMBIE_STATE.CURIOUS:
        speed *= 0.6;
        z.targetX = z.lastKnownX;
        z.targetY = z.lastKnownY;
        z.stateTimer -= dt;
        if (Math.hypot(z.targetX - z.x, z.targetY - z.y) < 20 || z.stateTimer <= 0) {
          z.state = ZOMBIE_STATE.IDLE;
        }
        if (canSeePlayer && distPlayer < 300) {
          z.state = ZOMBIE_STATE.ALERTED;
          z.stateTimer = 600;
        }
        break;

      case ZOMBIE_STATE.ALERTED:
        speed = 0; // stop to screech
        z.stateTimer -= dt;
        // (Pack signaling happens here visually/audio in engine)
        if (z.stateTimer <= 0) {
          z.state = ZOMBIE_STATE.HUNTING;
        }
        break;

      case ZOMBIE_STATE.HUNTING:
        speed *= z.rank === 2 ? 1.2 : (z.rank === 3 ? 1.5 : 1.1); // Runners go fast
        z.targetX = player.x;
        z.targetY = player.y;
        z.lastKnownX = player.x;
        z.lastKnownY = player.y;
        
        if (!canSeePlayer) {
          z.state = ZOMBIE_STATE.SEARCHING;
          z.stateTimer = 15000 + (z.memoryScore * 5000); // memory increases search time
        }
        break;

      case ZOMBIE_STATE.SEARCHING:
        speed *= 0.8;
        z.targetX = z.lastKnownX;
        z.targetY = z.lastKnownY;
        z.stateTimer -= dt;
        // Re-acquire?
        if (canSeePlayer && distPlayer < 350) {
          z.state = ZOMBIE_STATE.HUNTING;
        } else if (z.stateTimer <= 0) {
          z.state = ZOMBIE_STATE.GIVING_UP;
          z.stateTimer = 3000;
          z.memoryScore++;
        }
        break;

      case ZOMBIE_STATE.GIVING_UP:
        speed *= 0.5;
        z.targetX = z.x + (Math.random() - 0.5) * 50;
        z.targetY = z.y + (Math.random() - 0.5) * 50;
        z.stateTimer -= dt;
        if (z.stateTimer <= 0) {
          z.state = ZOMBIE_STATE.IDLE;
          z.highAlertTimer = 180000; // 3 mins high alert
        }
        if (canSeePlayer && distPlayer < 350) {
          z.state = ZOMBIE_STATE.ALERTED;
          z.stateTimer = 400; // faster reaction
        }
        break;
    }

    // ── Movement Execution ─────────────────────────────────────────────────
    // Check if a building is closer than target (aggro buildings if in the way)
    let attackTarget = null;
    let closestBuildDist = Math.hypot(z.targetX - z.x, z.targetY - z.y);
    for (const key of buildingKeys) {
      const b = buildings[key];
      const bx = b.col * TILE_W + TILE_W / 2;
      const by = b.row * TILE_H + TILE_H / 2;
      const bd = Math.hypot(bx - z.x, by - z.y);
      if (bd < closestBuildDist && bd < 60) {
        closestBuildDist = bd;
        z.targetX = bx;
        z.targetY = by;
        attackTarget = { type: 'building', key };
      }
    }
    
    if (distPlayer < (z.isBoss ? 70 : 35)) attackTarget = { type: 'player' };

    const distToTarget = Math.hypot(z.targetX - z.x, z.targetY - z.y);
    if (distToTarget > 2 && speed > 0 && !attackTarget) {
      const angle = Math.atan2(z.targetY - z.y, z.targetX - z.x);
      const nx = z.x + Math.cos(angle) * speed;
      const ny = z.y + Math.sin(angle) * speed;
      const nc = Math.floor(nx / TILE_W);
      const nr = Math.floor(ny / TILE_H);
      if (isWalkable(tiles, nc, nr)) {
        z.x = nx;
        z.y = ny;
      } else {
        // If hunting and blocked, randomize slightly to get around
        if (z.state === ZOMBIE_STATE.HUNTING) {
          z.targetX += (Math.random() - 0.5) * 100;
          z.targetY += (Math.random() - 0.5) * 100;
        }
      }
    }

    // ── Attack Logic ───────────────────────────────────────────────────────
    z.attackCooldown -= dt;
    if (z.attackCooldown <= 0 && attackTarget) {
      if (attackTarget.type === 'player') {
        z.attackCooldown = z.isBoss ? 800 : 1200;
        // Injury system hook (Biter infection moved to player update via player.injuries)
        player.hp -= z.dmg;
        if (z.rank === 4 && !player.injuries?.includes('bitten')) {
          player.injuries = player.injuries || [];
          player.injuries.push('bitten');
          player.infectionTimer = 300000; // 5 mins
        } else if (!player.injuries?.includes('minor_wound')) {
          player.injuries = player.injuries || [];
          player.injuries.push('minor_wound');
        }
        
        // Boss AOE
        if (z.isBoss && z.hp < z.maxHp * 0.25) {
          particles && particles.push({ type:'boss_aoe', x: z.x, y: z.y, timer: 600 });
          player.hp -= 15;
        }
      } else if (attackTarget.type === 'building') {
        const key = attackTarget.key;
        buildings[key].hp -= z.dmg * 0.5;
        z.attackCooldown = 800;
        if (buildings[key].hp <= 0) {
          delete buildings[key];
          buildingKeys.delete(key);
        }
      }
    }

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
