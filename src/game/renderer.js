import { TILE_W, TILE_H, MAP_COLS, MAP_ROWS, COLORS, BUILDING } from './constants.js';
import { tileToIso, getTileColor } from './map.js';
import { getBossPhase } from './zombie.js';

// ─── Isometric draw helpers ──────────────────────────────────────────────────
function drawIsoTile(ctx, sx, sy, topColor, leftColor, rightColor, height = 0) {
  const hw = TILE_W / 2, hh = TILE_H / 2;
  // Top face
  ctx.beginPath();
  ctx.moveTo(sx, sy - hh - height);
  ctx.lineTo(sx + hw, sy - height);
  ctx.lineTo(sx, sy + hh - height);
  ctx.lineTo(sx - hw, sy - height);
  ctx.closePath();
  ctx.fillStyle = topColor;
  ctx.fill();

  if (height > 0) {
    // Left face (tall)
    ctx.beginPath();
    ctx.moveTo(sx - hw, sy - height);
    ctx.lineTo(sx, sy + hh - height);
    ctx.lineTo(sx, sy + hh);
    ctx.lineTo(sx - hw, sy);
    ctx.closePath();
    ctx.fillStyle = leftColor;
    ctx.fill();

    // Right face (tall)
    ctx.beginPath();
    ctx.moveTo(sx, sy + hh - height);
    ctx.lineTo(sx + hw, sy - height);
    ctx.lineTo(sx + hw, sy);
    ctx.lineTo(sx, sy + hh);
    ctx.closePath();
    ctx.fillStyle = rightColor;
    ctx.fill();
  } else {
    // Left face (flat tile thickness)
    ctx.beginPath();
    ctx.moveTo(sx - hw, sy);
    ctx.lineTo(sx, sy + hh);
    ctx.lineTo(sx, sy + hh + 8);
    ctx.lineTo(sx - hw, sy + 8);
    ctx.closePath();
    ctx.fillStyle = leftColor;
    ctx.fill();

    // Right face (flat tile thickness)
    ctx.beginPath();
    ctx.moveTo(sx, sy + hh);
    ctx.lineTo(sx + hw, sy);
    ctx.lineTo(sx + hw, sy + 8);
    ctx.lineTo(sx, sy + hh + 8);
    ctx.closePath();
    ctx.fillStyle = rightColor;
    ctx.fill();
  }
}

export function drawMap(ctx, tiles, camX, camY, canvasW, canvasH) {
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      if (tiles[r][c] === 7) continue; // Skip TILE.WALL (drawn in depth sort)
      const iso = tileToIso(c, r, TILE_W, TILE_H);
      const sx = iso.x - camX + canvasW / 2;
      const sy = iso.y - camY + canvasH / 2;
      if (sx < -TILE_W || sx > canvasW + TILE_W) continue;
      if (sy < -TILE_H || sy > canvasH + TILE_H * 2) continue;
      const [top, side] = getTileColor(tiles[r][c]);
      const dark = shadeColor(side, -30);
      drawIsoTile(ctx, sx, sy, top, side, dark, 0);
    }
  }
}

export function drawResources(ctx, resources, camX, camY, canvasW, canvasH) {
  for (const res of resources) {
    if (res.amount <= 0) continue;
    const iso = tileToIso(res.col, res.row, TILE_W, TILE_H);
    const sx = iso.x - camX + canvasW / 2;
    const sy = iso.y - camY + canvasH / 2;
    if (sx < -60 || sx > canvasW + 60 || sy < -60 || sy > canvasH + 60) continue;

    const icons = { food:'🌿', water_jug:'💧', wood:'🪵', stone:'🪨', meat:'🥩', sun_stone:'⭐' };
    ctx.font = res.isSunStone ? '28px serif' : '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Glow for sun stone
    if (res.isSunStone) {
      ctx.shadowColor = '#ffdd00';
      ctx.shadowBlur = 20;
    }
    ctx.fillText(icons[res.type] || '?', sx, sy - 10);
    ctx.shadowBlur = 0;
  }
}

export function drawBuildings(ctx, buildings, camX, camY, canvasW, canvasH) {
  for (const [key, b] of Object.entries(buildings)) {
    const iso = tileToIso(b.col, b.row, TILE_W, TILE_H);
    const sx = iso.x - camX + canvasW / 2;
    const sy = iso.y - camY + canvasH / 2;
    if (sx < -80 || sx > canvasW + 80 || sy < -80 || sy > canvasH + 80) continue;
    drawBuilding(ctx, sx, sy, b);
  }
}

function drawBuilding(ctx, sx, sy, b) {
  const hpRatio = b.hp / b.maxHp;
  switch (b.type) {
    case 'fence': {
      ctx.strokeStyle = `rgb(139,105,20)`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(sx - TILE_W / 2, sy);
      ctx.lineTo(sx, sy - TILE_H / 2);
      ctx.lineTo(sx + TILE_W / 2, sy);
      ctx.lineTo(sx, sy + TILE_H / 2);
      ctx.closePath();
      ctx.stroke();
      // vertical posts
      for (let i = 0; i < 3; i++) {
        const px = sx - TILE_W / 2 + (i + 0.5) * (TILE_W / 3);
        const py = sy - 8;
        ctx.fillStyle = '#8B6914';
        ctx.fillRect(px - 3, py - 14, 6, 22);
      }
      break;
    }
    case 'wall': {
      ctx.fillStyle = `hsl(220,15%,${30 + hpRatio * 20}%)`;
      drawIsoTile(ctx, sx, sy - 14, '#9a9aaa', '#7a7a8a', '#6a6a7a');
      drawIsoTile(ctx, sx, sy - 26, '#8a8a9a', '#6a6a7a', '#5a5a6a');
      break;
    }
    case 'watchtower': {
      ctx.fillStyle = '#5a4020';
      ctx.fillRect(sx - 6, sy - 40, 12, 40);
      ctx.fillStyle = '#7a6030';
      ctx.fillRect(sx - 14, sy - 50, 28, 18);
      break;
    }
    case 'firepit': {
      ctx.beginPath();
      ctx.arc(sx, sy - 4, 10, 0, Math.PI * 2);
      ctx.fillStyle = '#333';
      ctx.fill();
      // Flames
      const t = Date.now() / 200;
      ctx.fillStyle = `rgba(255,${80 + Math.sin(t) * 40},0,0.9)`;
      ctx.beginPath();
      ctx.ellipse(sx, sy - 10, 6, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,220,0,0.7)`;
      ctx.beginPath();
      ctx.ellipse(sx, sy - 13, 3, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'well': {
      ctx.fillStyle = '#5a6a4a';
      ctx.fillRect(sx - 10, sy - 20, 20, 20);
      ctx.beginPath();
      ctx.arc(sx, sy - 20, 10, Math.PI, Math.PI * 2);
      ctx.fillStyle = '#4a5a3a';
      ctx.fill();
      ctx.fillStyle = '#1a4a7a';
      ctx.beginPath();
      ctx.ellipse(sx, sy - 4, 8, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'farm': {
      ctx.fillStyle = '#3a5a1a';
      for (let i = -2; i <= 2; i++) {
        ctx.fillRect(sx + i * 8 - 2, sy - 10, 4, 14);
      }
      break;
    }
  }
  // HP bar
  if (hpRatio < 1) {
    ctx.fillStyle = '#333';
    ctx.fillRect(sx - 20, sy - 50, 40, 5);
    ctx.fillStyle = hpRatio > 0.5 ? '#44ff44' : hpRatio > 0.25 ? '#ffaa00' : '#ff3333';
    ctx.fillRect(sx - 20, sy - 50, 40 * hpRatio, 5);
  }
}

export function drawPlayer(ctx, player, sx, sy) {

  ctx.save();
  ctx.translate(sx, sy - 18);

  // Attack flash
  if (player.attackAnim > 0) {
    ctx.shadowColor = '#ffaa00';
    ctx.shadowBlur = 20;
  }

  // Calculate walk animation based on position
  // We use the sum of x and y so both diagonal and straight movement animates.
  const walkCycle = Math.sin((player.x + player.y) * 0.15); 
  // If not moving, this naturally stops at whatever phase it's in, which is fine, 
  // but let's make it more robust: if player is standing still, reset legs.
  // We don't have a direct "isMoving" flag, but we can assume if they aren't attacking,
  // we just use the position.
  const legSwing = walkCycle * 6; 

  // --- Legs (Jeans) ---
  ctx.fillStyle = '#2c3e50'; 
  
  // Back leg
  ctx.beginPath();
  ctx.roundRect(-6 + legSwing, 6, 5, 14, 2);
  ctx.fill();
  
  // Front leg
  ctx.beginPath();
  ctx.roundRect(1 - legSwing, 6, 5, 14, 2);
  ctx.fill();

  // --- Torso / Jacket ---
  ctx.fillStyle = player.infected ? '#4c6b32' : '#6b4c3a'; // Brown leather or green if infected
  ctx.beginPath();
  ctx.roundRect(-9, -6, 18, 14, 4);
  ctx.fill();

  // Backpack
  ctx.fillStyle = '#333';
  ctx.beginPath();
  ctx.roundRect(-12, -4, 6, 10, 2);
  ctx.fill();

  // --- Head ---
  ctx.fillStyle = player.infected ? '#88cc44' : '#f5cba7'; // Skin color
  ctx.beginPath();
  ctx.arc(0, -12, 7, 0, Math.PI * 2);
  ctx.fill();

  // Hair / Beanie
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(0, -13, 7.5, Math.PI, 0);
  ctx.fill();

  // --- Weapon Arm (rotates toward mouse) ---
  ctx.save();
  ctx.translate(2, -4); // Shoulder joint
  ctx.rotate(player.facingAngle);
  
  // Sleeve
  ctx.fillStyle = player.infected ? '#4c6b32' : '#6b4c3a';
  ctx.beginPath();
  ctx.roundRect(0, -2.5, 12, 5, 2);
  ctx.fill();

  // Hand
  ctx.fillStyle = player.infected ? '#88cc44' : '#f5cba7';
  ctx.beginPath();
  ctx.arc(14, 0, 3, 0, Math.PI * 2);
  ctx.fill();

  // Weapon (Shiv / Pipe)
  ctx.fillStyle = '#8B6914'; // Wood handle
  ctx.fillRect(12, -10, 3, 20);
  
  // Blade tip
  ctx.fillStyle = '#eee';
  ctx.beginPath();
  ctx.moveTo(12, -10);
  ctx.lineTo(13.5, -18);
  ctx.lineTo(15, -10);
  ctx.fill();

  // Blood on blade if attack anim
  if (player.attackAnim > 0) {
    ctx.fillStyle = '#cc0000';
    ctx.beginPath();
    ctx.arc(13.5, -14, 2, 0, Math.PI*2);
    ctx.fill();
  }

  ctx.restore();

  // Sun stone glow
  if (player.hasSunStone) {
    ctx.shadowColor = '#ffdd00';
    ctx.shadowBlur = 30;
    ctx.fillStyle = 'rgba(255,220,0,0.2)';
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.restore();

  // HP bar above player
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(sx - 22, sy - 50, 44, 6);
  ctx.fillStyle = '#44ff44';
  ctx.fillRect(sx - 22, sy - 50, 44 * (player.hp / player.maxHp), 6);
}

export function drawZombies(ctx, zombies, camX, camY, canvasW, canvasH, isListening) {
  for (const z of zombies) {
    if (!z.isAlive) continue;
    const iso = tileToIso(z.x / TILE_W, z.y / TILE_H, TILE_W, TILE_H);
    const sx = iso.x - camX + canvasW / 2;
    const sy = iso.y - camY + canvasH / 2;
    if (sx < -60 || sx > canvasW + 60 || sy < -80 || sy > canvasH + 80) continue;
    drawZombie(ctx, z, sx, sy, isListening);
  }
}

function drawZombie(ctx, z, sx, sy, isListening) {
  ctx.save();
  ctx.translate(sx, sy - z.size);

  // Hit flash
  if (z.hitFlash > 0) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 15;
  }

  const baseY = 0;
  const s = z.size / 18; // scale factor

  // Boss special rendering
  if (z.isBoss) {
    drawBoss(ctx, z, s);
    ctx.restore();
    // HP bar
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(sx - 50, sy - z.size - 30, 100, 8);
    const phase = getBossPhase(z);
    ctx.fillStyle = phase === 3 ? '#ff0000' : phase === 2 ? '#ff6600' : '#aa00ff';
    ctx.fillRect(sx - 50, sy - z.size - 30, 100 * (z.hp / z.maxHp), 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`☠ PLAGUE LORD (Phase ${phase})`, sx, sy - z.size - 34);
    return;
  }

  // Listening mode overrides rendering
  if (isListening) {
    // Stalker invisible in listening mode
    if (z.rank === 11) { ctx.restore(); return; }

    let color = '#ffff00'; // IDLE/CURIOUS
    if (z.state === 2 || z.state === 4) color = '#ff8800'; // ALERTED/SEARCHING
    if (z.state === 3) color = '#ff0000'; // HUNTING

    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(0, -6 * s, 10 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
    return;
  }

  // Body
  ctx.fillStyle = z.color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 9 * s, 12 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Ragged clothes overlay
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(-8 * s, -3 * s, 16 * s, 10 * s);
  // Head
  ctx.fillStyle = shadeColor(z.color, 10);
  ctx.beginPath();
  ctx.arc(0, -14 * s, 8 * s, 0, Math.PI * 2);
  ctx.fill();
  // Eyes (red glow)
  ctx.fillStyle = '#ff2200';
  ctx.beginPath();
  ctx.arc(-3 * s, -15 * s, 2 * s, 0, Math.PI * 2);
  ctx.arc(3 * s, -15 * s, 2 * s, 0, Math.PI * 2);
  ctx.fill();
  // Rank badge
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.beginPath();
  ctx.arc(9 * s, -20 * s, 7 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffdd00';
  ctx.font = `bold ${7 * s}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(z.rank, 9 * s, -20 * s);

  ctx.restore();

  // HP bar
  const barW = 30;
  const hpR = z.hp / z.maxHp;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(sx - barW / 2, sy - z.size - 25, barW, 4);
  ctx.fillStyle = hpR > 0.5 ? '#88ff44' : '#ff4444';
  ctx.fillRect(sx - barW / 2, sy - z.size - 25, barW * hpR, 4);
}

function drawBoss(ctx, z, s) {
  const phase = getBossPhase(z);
  const t = Date.now() / 500;
  // Pulsing aura
  ctx.shadowColor = phase === 3 ? '#ff0000' : '#8800cc';
  ctx.shadowBlur = 25 + Math.sin(t) * 10;
  // Cloak
  ctx.fillStyle = phase === 3 ? '#660000' : '#2a0044';
  ctx.beginPath();
  ctx.ellipse(0, 5 * s, 22 * s, 30 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body
  ctx.fillStyle = '#4a0080';
  ctx.beginPath();
  ctx.ellipse(0, 0, 14 * s, 20 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  // Head / skull
  ctx.fillStyle = '#1a001a';
  ctx.beginPath();
  ctx.arc(0, -22 * s, 14 * s, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#cc00ff';
  ctx.beginPath();
  ctx.arc(-5 * s, -22 * s, 4 * s, 0, Math.PI * 2);
  ctx.arc(5 * s, -22 * s, 4 * s, 0, Math.PI * 2);
  ctx.fill();
  // Crown
  for (let i = -2; i <= 2; i++) {
    ctx.fillStyle = '#ffdd00';
    ctx.fillRect(i * 5 * s - 2 * s, -36 * s, 4 * s, 8 * s + Math.abs(i) * 3 * s);
  }
  ctx.shadowBlur = 0;
}

export function drawParticles(ctx, particles, camX, camY, canvasW, canvasH, state) {
  // Draw Fire Tiles (Molotov/NoiseBomb/Trap)
  if (state?.fireTiles) {
    for (const f of state.fireTiles) {
      const iso = tileToIso(f.x / TILE_W, f.y / TILE_H, TILE_W, TILE_H);
      const sx = iso.x - camX + canvasW / 2;
      const sy = iso.y - camY + canvasH / 2;
      if (f.isNoiseBomb) {
        ctx.fillStyle = `rgba(0,100,255,0.4)`;
        ctx.beginPath(); ctx.arc(sx, sy, 8, 0, Math.PI * 2); ctx.fill();
      } else if (f.isTrap) {
        ctx.fillStyle = `rgba(0,255,255,0.6)`;
        ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI * 2); ctx.fill();
        if (Math.random() > 0.8) {
          ctx.strokeStyle = '#00ffff';
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (Math.random()-0.5)*20, sy - Math.random()*20); ctx.stroke();
        }
      } else {
        const t = Date.now() / 150;
        ctx.fillStyle = `rgba(255,${80 + Math.sin(t)*50},0,0.7)`;
        ctx.beginPath(); ctx.arc(sx, sy, 25 + Math.random()*5, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = `rgba(255,200,0,0.9)`;
        ctx.beginPath(); ctx.arc(sx, sy - 10, 15 + Math.random()*5, 0, Math.PI*2); ctx.fill();
      }
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.timer -= 16;
    if (p.timer <= 0) { particles.splice(i, 1); continue; }
    const alpha = p.timer / p.maxTimer;
    if (p.type === 'damage') {
      ctx.fillStyle = `rgba(255,80,0,${alpha})`;
      ctx.font = `bold ${12 + (1 - alpha) * 8}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(`-${p.dmg}`, p.sx, p.sy - (1 - alpha) * 30);
    } else if (p.type === 'boss_aoe') {
      const iso = tileToIso(p.x / TILE_W, p.y / TILE_H, TILE_W, TILE_H);
      const sx = iso.x - camX + canvasW / 2;
      const sy = iso.y - camY + canvasH / 2;
      ctx.strokeStyle = `rgba(255,0,0,${alpha * 0.7})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(sx, sy, 80 * (1 - alpha / p.maxTimer * 0.5), 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.type === 'collect') {
      ctx.fillStyle = `rgba(255,220,100,${alpha})`;
      ctx.font = `12px serif`;
      ctx.textAlign = 'center';
      ctx.fillText(p.icon, p.sx, p.sy - (1 - alpha) * 25);
    }
  }
}

export function drawWorldDepthSorted(ctx, state, camX, camY, canvasW, canvasH) {
  const { player, tiles, resources, buildings, zombies } = state;
  const renderables = [];

  // 1. TILE.WALL map elements
  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      if (tiles[r][c] === 7) { // TILE.WALL
        const iso = tileToIso(c, r, TILE_W, TILE_H);
        const sx = iso.x - camX + canvasW / 2;
        const sy = iso.y - camY + canvasH / 2;
        if (sx < -TILE_W || sx > canvasW + TILE_W || sy < -TILE_H || sy > canvasH + TILE_H * 2) continue;
        renderables.push({ type: 'wall', z: iso.y, r, c, sx, sy });
      }
    }
  }

  // 2. Resources
  for (const res of resources) {
    if (res.amount <= 0) continue;
    const iso = tileToIso(res.col, res.row, TILE_W, TILE_H);
    const sx = iso.x - camX + canvasW / 2;
    const sy = iso.y - camY + canvasH / 2;
    if (sx < -60 || sx > canvasW + 60 || sy < -60 || sy > canvasH + 60) continue;
    renderables.push({ type: 'resource', z: iso.y, res, sx, sy });
  }

  // 3. Buildings
  for (const b of Object.values(buildings)) {
    const iso = tileToIso(b.col, b.row, TILE_W, TILE_H);
    const sx = iso.x - camX + canvasW / 2;
    const sy = iso.y - camY + canvasH / 2;
    if (sx < -80 || sx > canvasW + 80 || sy < -80 || sy > canvasH + 80) continue;
    renderables.push({ type: 'building', z: iso.y, b, sx, sy });
  }

  // 4. Zombies
  for (const z of zombies) {
    if (!z.isAlive) continue;
    const iso = tileToIso(z.x / TILE_W, z.y / TILE_H, TILE_W, TILE_H);
    const sx = iso.x - camX + canvasW / 2;
    const sy = iso.y - camY + canvasH / 2;
    if (sx < -60 || sx > canvasW + 60 || sy < -80 || sy > canvasH + 80) continue;
    renderables.push({ type: 'zombie', z: iso.y, zombie: z, sx, sy });
  }

  // 5. Player
  const isoP = tileToIso(player.x / TILE_W, player.y / TILE_H, TILE_W, TILE_H);
  const pSx = isoP.x - camX + canvasW / 2;
  const pSy = isoP.y - camY + canvasH / 2;
  renderables.push({ type: 'player', z: isoP.y, player, sx: pSx, sy: pSy });

  // Sort by depth (isometric Y)
  renderables.sort((a, b) => a.z - b.z);

  // Draw loop
  for (const item of renderables) {
    if (item.type === 'wall') {
      const [top, side] = getTileColor(tiles[item.r][item.c]);
      const dark = shadeColor(side, -30);
      
      // X-Ray logic: if wall is in front of player and obscuring
      if (item.z > isoP.y && Math.hypot(item.sx - pSx, item.sy - pSy) < 120) {
        ctx.globalAlpha = 0.25;
      }
      drawIsoTile(ctx, item.sx, item.sy, top, side, dark, 60);
      ctx.globalAlpha = 1.0;
    } 
    else if (item.type === 'resource') {
      const icons = { food:'🌿', water_jug:'💧', wood:'🪵', stone:'🪨', meat:'🥩', sun_stone:'⭐', rags:'🧻', pills:'💊', medkit:'✚', painkiller:'💊', infection_cure:'💉', molotov:'🔥', noise_bomb:'🔊', electric_trap:'⚡', shiv:'🔪' };
      ctx.font = item.res.isSunStone ? '28px serif' : '20px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (item.res.isSunStone) { ctx.shadowColor = '#ffdd00'; ctx.shadowBlur = 20; }
      ctx.fillText(icons[item.res.type] || '?', item.sx, item.sy - 10);
      ctx.shadowBlur = 0;
    }
    else if (item.type === 'building') {
      drawBuilding(ctx, item.sx, item.sy, item.b);
    }
    else if (item.type === 'zombie') {
      drawZombie(ctx, item.zombie, item.sx, item.sy, state.isListening);
    }
    else if (item.type === 'player') {
      drawPlayer(ctx, item.player, item.sx, item.sy);
    }
  }
}

export function drawBuildPreview(ctx, buildType, hoverCol, hoverRow, canAfford, camX, camY, canvasW, canvasH) {
  if (!buildType || hoverCol < 0) return;
  const iso = tileToIso(hoverCol, hoverRow, TILE_W, TILE_H);
  const sx = iso.x - camX + canvasW / 2;
  const sy = iso.y - camY + canvasH / 2;
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = canAfford ? '#44ff44' : '#ff4444';
  const hw = TILE_W / 2, hh = TILE_H / 2;
  ctx.beginPath();
  ctx.moveTo(sx, sy - hh);
  ctx.lineTo(sx + hw, sy);
  ctx.lineTo(sx, sy + hh);
  ctx.lineTo(sx - hw, sy);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

export function drawMinimap(ctx, player, zombies, resources, buildings, mapCols, mapRows) {
  const mw = 150, mh = 100, mx = 10, my = 10;
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.strokeStyle = '#666';
  ctx.lineWidth = 1;
  ctx.fillRect(mx, my, mw, mh);
  ctx.strokeRect(mx, my, mw, mh);

  const scaleX = mw / mapCols;
  const scaleY = mh / mapRows;

  // Resources
  for (const r of resources) {
    if (r.amount <= 0) continue;
    ctx.fillStyle = r.isSunStone ? '#ffdd00' : '#44aa44';
    ctx.fillRect(mx + r.col * scaleX - 1, my + r.row * scaleY - 1, 2, 2);
  }

  // Buildings
  for (const [key, b] of Object.entries(buildings)) {
    ctx.fillStyle = '#8B6914';
    ctx.fillRect(mx + b.col * scaleX - 1, my + b.row * scaleY - 1, 2, 2);
  }

  // Zombies
  ctx.fillStyle = '#ff3333';
  for (const z of zombies) {
    if (!z.isAlive) continue;
    ctx.fillRect(mx + z.col * scaleX - 1, my + z.row * scaleY - 1, 2, 2);
  }

  // Player
  const pc = player.x / TILE_W;
  const pr = player.y / TILE_H;
  ctx.fillStyle = '#00ff88';
  ctx.beginPath();
  ctx.arc(mx + pc * scaleX, my + pr * scaleY, 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = '9px sans-serif';
  ctx.fillText('MAP', mx + 2, my + mh - 3);
}

// ─── Utility ─────────────────────────────────────────────────────────────────
function shadeColor(color, percent) {
  const num = parseInt(color.replace('#', ''), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + percent));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + percent));
  const b = Math.min(255, Math.max(0, (num & 0xff) + percent));
  return `rgb(${r},${g},${b})`;
}
