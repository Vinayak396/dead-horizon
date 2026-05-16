import { generateMap, isoToTile, tileToIso } from './map.js';
import { createPlayer, updatePlayer, playerAttack, consumeItem, addXP } from './player.js';
import { updateZombies } from './zombie.js';
import { createWaveManager, updateWaveManager } from './waveManager.js';
import { placeBuilding, updateBuildings, canAfford } from './buildings.js';
import {
  drawRaycaster,
  drawMinimap,
  drawBuildPreview,
  drawParticles
} from './renderer.js';
import { TILE_W, TILE_H, MAP_COLS, MAP_ROWS } from './constants.js';

export function createGameState() {
  const { tiles, resources, buildings } = generateMap(Date.now() % 99999);
  const player = createPlayer();
  const waveManager = createWaveManager();
  return {
    tiles,
    resources,
    buildings,
    player,
    zombies: [],
    particles: [],
    waveManager,
    noiseEvents: [],
    fireTiles: [],
    isListening: false,
    craftingOpen: false,
    buildMode: null,      // selected building type or null
    hoverCol: -1,
    hoverRow: -1,
    alerts: [],           // {msg, timer}
    screenShake: 0,
    lastTime: null,
    gamePhase: 'playing', // 'playing' | 'dead' | 'victory'
  };
}

export function gameUpdate(state, keys, mouseAngle, dt, now) {
  if (state.gamePhase !== 'playing') return;

  const { player, tiles, buildings, zombies, particles, waveManager, resources, alerts } = state;

  // Update player
  updatePlayer(player, keys, mouseAngle, tiles, buildings, dt, now);

  // Update buildings
  updateBuildings(buildings, player, dt);

  // ── Listening Mode ────────────────────────────────────────────────────────
  state.isListening = !!keys['KeyQ'] && player.stamina > 0;
  if (state.isListening) {
    player.stamina = Math.max(0, player.stamina - 0.08 * dt); // drain stamina
    if (player.isRunning || keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD']) {
      state.noiseEvents.push({ x: player.x, y: player.y, radius: 40 }); // noise from moving while listening
    }
  }

  // ── Player running noise ──────────────────────────────────────────────────
  if (player.isRunning && (keys['KeyW'] || keys['KeyA'] || keys['KeyS'] || keys['KeyD'])) {
    state.noiseEvents.push({ x: player.x, y: player.y, radius: 80 });
  }

  // Update zombies (pass noiseEvents)
  updateZombies(zombies, player, buildings, tiles, dt, now, particles, state.noiseEvents);
  
  // Clear noise events for next frame
  state.noiseEvents = [];

  // Update fire tiles (molotovs, noise bombs, traps)
  for (let i = state.fireTiles.length - 1; i >= 0; i--) {
    const f = state.fireTiles[i];
    f.timer -= dt;
    if (f.timer <= 0) {
      state.fireTiles.splice(i, 1);
      continue;
    }
    
    if (f.isNoiseBomb) {
      state.noiseEvents.push({ x: f.x, y: f.y, radius: 250 });
      if (now % 500 < dt) particles.push({ type:'boss_aoe', x: f.x, y: f.y, timer: 200, maxTimer: 200 }); // visual pulse
    } else if (f.isTrap) {
      for (const z of zombies) {
        if (z.isAlive && Math.hypot(z.x - f.x, z.y - f.y) < 30) {
          z.stunTimer = 4000;
          z.hp -= 10;
          particles.push({ type:'damage', dmg: 10, sx: f.x, sy: f.y, timer: 500 });
          state.fireTiles.splice(i, 1); // Trap consumed
          break;
        }
      }
    } else {
      // Regular molotov fire
      for (const z of zombies) {
        if (z.isAlive && Math.hypot(z.x - f.x, z.y - f.y) < 50) {
          z.hp -= 0.5;
          if (z.hp <= 0) z.isAlive = false;
          if (z.state < 3) z.state = 3; // HUNTING
        }
      }
    }
  }

  // Bloater explosion on death
  for (const z of zombies) {
    if (!z.isAlive && z.rank === 6 && !z._exploded) {
      z._exploded = true;
      const dist = Math.hypot(player.x - z.x, player.y - z.y);
      if (dist < 80) player.hp -= 25;
      particles.push({ type:'boss_aoe', x: z.x, y: z.y, timer: 500, maxTimer: 500 });
      addAlert(alerts, '💥 Bloater exploded!');
    }
  }

  // Collect XP from dead zombies
  for (const z of zombies) {
    if (!z.isAlive && !z._xpGiven) {
      z._xpGiven = true;
      addXP(player, z.xp || 10);
    }
  }

  // Resource pickup (auto when walking over)
  for (const res of resources) {
    if (res.amount <= 0) continue;
    const resWX = res.col * TILE_W + TILE_W / 2;
    const resWY = res.row * TILE_H + TILE_H / 2;
    const dist = Math.hypot(resWX - player.x, resWY - player.y);
    if (dist < 35) {
      const icons = { food:'🌿', water_jug:'💧', wood:'🪵', stone:'🪨', meat:'🥩', sun_stone:'⭐' };
      player.inventory[res.type] = (player.inventory[res.type] || 0) + res.amount;
      if (res.isSunStone) {
        player.hasSunStone = true;
        addAlert(alerts, '⭐ You found the Sun Stone! The Plague Lord can now be defeated!');
      } else {
        addAlert(alerts, `Collected ${res.amount}x ${res.type.replace('_', ' ')}`);
      }
      // Particle
      const iso = tileToIso(res.col, res.row, TILE_W, TILE_H);
      particles.push({ type:'collect', icon: icons[res.type], sx: iso.x, sy: iso.y, timer: 900, maxTimer: 900 });
      res.amount = 0;
    }
  }

  // Alerts decay
  for (let i = alerts.length - 1; i >= 0; i--) {
    alerts[i].timer -= dt;
    if (alerts[i].timer <= 0) alerts.splice(i, 1);
  }

  // Wave manager
  updateWaveManager(waveManager, zombies, tiles, player, dt);
  if (waveManager.phase === 'victory') state.gamePhase = 'victory';

  // Death
  if (!player.isAlive) state.gamePhase = 'dead';

  // Stat alerts
  if (player.hunger < 15 && now % 5000 < dt) addAlert(alerts, '🍖 You are starving!');
  if (player.water < 15 && now % 5000 < dt)  addAlert(alerts, '💧 You are dehydrated!');
  if (player.stamina < 5 && now % 4000 < dt)  addAlert(alerts, '⚡ You are exhausted!');

  // Screen shake during boss AOE
  if (state.screenShake > 0) state.screenShake -= dt;
}

export function gameDraw(state, ctx, canvasW, canvasH) {
  const { player, tiles, resources, buildings, zombies, particles,
          waveManager, buildMode, hoverCol, hoverRow } = state;

  // Camera centered on player
  const isoP = tileToIso(player.x / TILE_W, player.y / TILE_H, TILE_W, TILE_H);
  let camX = isoP.x;
  let camY = isoP.y;

  // Screen shake
  if (state.screenShake > 0) {
    camX += (Math.random() - 0.5) * 6;
    camY += (Math.random() - 0.5) * 6;
  }

  // Background
  ctx.fillStyle = '#0a0e0a';
  ctx.fillRect(0, 0, canvasW, canvasH);

  // Wave overlay tint (boss phase 3 = blood red)
  const boss = zombies.find(z => z.isBoss && z.isAlive);
  if (boss) {
    const phase = boss.hp / boss.maxHp < 0.33 ? 3 : boss.hp / boss.maxHp < 0.66 ? 2 : 1;
    const intensity = phase === 3 ? 0.15 : phase === 2 ? 0.08 : 0.04;
    ctx.fillStyle = `rgba(150,0,0,${intensity + Math.sin(Date.now() / 300) * 0.03})`;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  // Listening mode visual effect
  if (state.isListening) {
    ctx.filter = 'grayscale(100%) brightness(40%) sepia(20%) hue-rotate(180deg)';
  } else {
    ctx.filter = 'none';
  }
  
  // 2. Draw World (First-Person Raycaster)
  drawRaycaster(ctx, state, canvasW, canvasH);

  drawParticles(ctx, particles, camX, camY, canvasW, canvasH, state);
  if (buildMode) drawBuildPreview(ctx, buildMode, hoverCol, hoverRow, canAfford(player.inventory, buildMode), camX, camY, canvasW, canvasH);

  // 3. Draw minimap
  drawMinimap(ctx, state, canvasW, canvasH);
}

export function handleBuild(state, col, row) {
  const { player, buildings } = state;
  if (!state.buildMode) return;
  if (col < 0 || row < 0 || col >= MAP_COLS || row >= MAP_ROWS) return;
  const ok = placeBuilding(buildings, player.inventory, state.buildMode, col, row);
  if (!ok) addAlert(state.alerts, '❌ Not enough resources or tile occupied!');
}

export function handleAttack(state, now) {
  state.noiseEvents.push({ x: state.player.x, y: state.player.y, radius: 120 }); // Attacking makes noise
  const hits = playerAttack(state.player, state.zombies, now);
  for (const h of hits) {
    if (h.dmg === 0) {
      addAlert(state.alerts, '⚠ You need the Sun Stone to hurt the Plague Lord!');
    }
    const iso = tileToIso(h.x / TILE_W, h.y / TILE_H, TILE_W, TILE_H);
    state.particles.push({ type:'damage', dmg: h.dmg, sx: iso.x, sy: iso.y, timer: 700, maxTimer: 700 });
    // Trigger screen shake for boss hit
    const hitZ = state.zombies.find(z => Math.hypot(z.x - h.x, z.y - h.y) < 5 && z.isBoss);
    if (hitZ) state.screenShake = 300;
  }
}

export function addAlert(alerts, msg) {
  // Prevent duplicates
  if (alerts.find(a => a.msg === msg)) return;
  alerts.push({ msg, timer: 3500 });
  if (alerts.length > 5) alerts.shift();
}

export function handleThrowable(state, type, mouseWorldX, mouseWorldY) {
  const { player, inventory } = state.player;
  if (player.inventory[type] <= 0) {
    addAlert(state.alerts, `❌ No ${type.replace('_', ' ')}s left!`);
    return;
  }
  
  player.inventory[type]--;

  if (type === 'molotov') {
    state.fireTiles.push({ x: mouseWorldX, y: mouseWorldY, timer: 4000 });
    state.noiseEvents.push({ x: mouseWorldX, y: mouseWorldY, radius: 300 });
    state.particles.push({ type:'boss_aoe', x: mouseWorldX, y: mouseWorldY, timer: 500 }); // simulated explosion
    addAlert(state.alerts, '🔥 Molotov thrown!');
  } 
  else if (type === 'noise_bomb') {
    // Add a lingering noise event for 5 seconds
    // (We'd need a lingering noise system, or just add a special fireTile-like entity for noise bombs)
    state.fireTiles.push({ x: mouseWorldX, y: mouseWorldY, timer: 5000, isNoiseBomb: true });
    addAlert(state.alerts, '🔊 Noise bomb deployed!');
  }
  else if (type === 'electric_trap') {
    // We can reuse fireTiles logic, but check for zombie collision and stun them
    state.fireTiles.push({ x: mouseWorldX, y: mouseWorldY, timer: 60000, isTrap: true });
    addAlert(state.alerts, '⚡ Trap placed!');
  }
}
