import { generateMap, isoToTile, tileToIso } from './map.js';
import { createPlayer, updatePlayer, playerAttack, useItem, addXP } from './player.js';
import { updateZombies } from './zombie.js';
import { createWaveManager, updateWaveManager } from './waveManager.js';
import { placeBuilding, removeBuilding, updateBuildings, canAfford } from './buildings.js';
import {
  drawMap, drawResources, drawBuildings, drawPlayer,
  drawZombies, drawParticles, drawBuildPreview, drawMinimap
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

  // Update zombies
  updateZombies(zombies, player, buildings, tiles, dt, now, particles);

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

  drawMap(ctx, tiles, camX, camY, canvasW, canvasH);
  drawResources(ctx, resources, camX, camY, canvasW, canvasH);
  drawBuildings(ctx, buildings, camX, camY, canvasW, canvasH);
  drawZombies(ctx, zombies, camX, camY, canvasW, canvasH);
  drawPlayer(ctx, player, camX, camY, canvasW, canvasH);
  drawParticles(ctx, particles, camX, camY, canvasW, canvasH);
  if (buildMode) drawBuildPreview(ctx, buildMode, hoverCol, hoverRow, canAfford(player.inventory, buildMode), camX, camY, canvasW, canvasH);

  // Minimap (drawn in screen space - no camera offset)
  drawMinimap(ctx, player, zombies, resources, buildings, MAP_COLS, MAP_ROWS);
}

export function handleBuild(state, col, row) {
  const { player, buildings } = state;
  if (!state.buildMode) return;
  if (col < 0 || row < 0 || col >= MAP_COLS || row >= MAP_ROWS) return;
  const ok = placeBuilding(buildings, player.inventory, state.buildMode, col, row);
  if (!ok) addAlert(state.alerts, '❌ Not enough resources or tile occupied!');
}

export function handleAttack(state, now) {
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

function addAlert(alerts, msg) {
  // Prevent duplicates
  if (alerts.find(a => a.msg === msg)) return;
  alerts.push({ msg, timer: 3500 });
  if (alerts.length > 5) alerts.shift();
}
