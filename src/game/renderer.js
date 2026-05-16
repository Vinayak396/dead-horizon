import { TILE_W, TILE_H, MAP_COLS, MAP_ROWS } from './constants.js';

const spriteCache = {};
function getSpriteCanvas(emoji, color) {
  const key = emoji || color;
  if (spriteCache[key]) return spriteCache[key];
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const cx = c.getContext('2d');
  if (emoji) {
    cx.font = '50px serif';
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.shadowColor = 'rgba(0,0,0,0.8)';
    cx.shadowBlur = 4;
    cx.fillText(emoji, 32, 32);
  } else {
    cx.fillStyle = color;
    cx.fillRect(0,0,64,64);
    cx.strokeStyle = '#000';
    cx.strokeRect(0,0,64,64);
  }
  spriteCache[key] = c;
  return c;
}

export function drawRaycaster(ctx, state, canvasW, canvasH) {
  const { player, tiles, resources, buildings, zombies, particles } = state;

  const FOV = Math.PI / 3; 
  const HALF_FOV = FOV / 2;
  const numRays = canvasW; 
  const projDistance = (canvasW / 2) / Math.tan(HALF_FOV);

  const zBuffer = new Float32Array(canvasW);

  // Draw Sky (Ceiling)
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvasH / 2);
  skyGrad.addColorStop(0, '#0a1020'); 
  skyGrad.addColorStop(1, '#2a3a50'); 
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, canvasW, canvasH / 2);

  const pA = player.facingAngle;
  const px = player.x;
  const py = player.y;
  
  // Floor casting (checkerboard) for visual movement feedback
  for (let y = canvasH / 2 + 1; y < canvasH; y += 4) {
    const rayDirX0 = Math.cos(pA - HALF_FOV);
    const rayDirY0 = Math.sin(pA - HALF_FOV);
    const rayDirX1 = Math.cos(pA + HALF_FOV);
    const rayDirY1 = Math.sin(pA + HALF_FOV);
    
    const p = y - canvasH / 2;
    const posZ = 0.5 * canvasH; 
    const rowDistance = posZ / p;
    
    const floorStepX = rowDistance * (rayDirX1 - rayDirX0) / canvasW;
    const floorStepY = rowDistance * (rayDirY1 - rayDirY0) / canvasW;
    
    let floorX = px + rowDistance * rayDirX0;
    let floorY = py + rowDistance * rayDirY0;
    
    for (let x = 0; x < canvasW; x += 4) {
      const cellX = Math.floor(floorX / TILE_W);
      const cellY = Math.floor(floorY / TILE_H);
      
      let colorStr = '30, 30, 30'; 
      const isAlt = ((cellX + cellY) % 2 === 0);

      if (cellX >= 0 && cellX < MAP_COLS && cellY >= 0 && cellY < MAP_ROWS) {
        const t = tiles[cellY][cellX];
        if (t === 2) { // WATER
           colorStr = isAlt ? '30, 100, 160' : '40, 120, 180';
        } else if (t === 0) { // GRASS
           colorStr = isAlt ? '45, 90, 35' : '55, 105, 45';
        } else if (t === 1) { // DIRT
           colorStr = isAlt ? '90, 60, 30' : '105, 70, 35';
        } else if (t === 3) { // ROAD
           colorStr = isAlt ? '70, 70, 70' : '85, 85, 85';
        } else if (t === 5) { // SAND
           colorStr = isAlt ? '180, 160, 100' : '195, 175, 110';
        } else if (t === 4) { // RUBBLE
           colorStr = isAlt ? '60, 50, 45' : '75, 65, 60';
        } else {
           colorStr = isAlt ? '40, 40, 40' : '50, 50, 50';
        }
      }
      
      // Draw grid lines (Block edges) to give Minecraft-like block perception
      const u = Math.abs(floorX % TILE_W);
      const v = Math.abs(floorY % TILE_H);
      if (u < 3 || v < 3 || u > TILE_W - 3 || v > TILE_H - 3) {
        // Darken edges significantly
        colorStr = '15, 15, 15';
      }
      
      // Shade by distance
      const shade = Math.max(0, 1 - (rowDistance / 1000));
      
      ctx.fillStyle = `rgba(${colorStr}, ${shade})`;
      ctx.fillRect(x, y, 4, 4);
      
      floorX += floorStepX * 4;
      floorY += floorStepY * 4;
    }
  }

  // Render Walls
  for (let x = 0; x < numRays; x++) {
    const rayAngle = pA - HALF_FOV + (x / numRays) * FOV;
    const sinA = Math.sin(rayAngle);
    const cosA = Math.cos(rayAngle);
    
    let mapX = Math.floor(px / TILE_W);
    let mapY = Math.floor(py / TILE_H);
    
    const deltaDistX = Math.abs(TILE_W / cosA);
    const deltaDistY = Math.abs(TILE_H / sinA);
    
    let stepX, stepY, sideDistX, sideDistY;
    let side = 0; 
    let hit = false;
    const maxDepth = 2000;
    
    if (cosA < 0) {
      stepX = -1;
      sideDistX = (px - mapX * TILE_W) * (deltaDistX / TILE_W);
    } else {
      stepX = 1;
      sideDistX = ((mapX + 1) * TILE_W - px) * (deltaDistX / TILE_W);
    }
    if (sinA < 0) {
      stepY = -1;
      sideDistY = (py - mapY * TILE_H) * (deltaDistY / TILE_H);
    } else {
      stepY = 1;
      sideDistY = ((mapY + 1) * TILE_H - py) * (deltaDistY / TILE_H);
    }
    
    let distance = 0;
    while (!hit && distance < maxDepth) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      
      if (mapX < 0 || mapX >= MAP_COLS || mapY < 0 || mapY >= MAP_ROWS) {
        hit = true;
        distance = maxDepth;
      } else if (tiles[mapY][mapX] === 7) { 
        hit = true;
      }
      
      if (side === 0) distance = (mapX * TILE_W - px + (1 - stepX) * TILE_W / 2) / cosA;
      else            distance = (mapY * TILE_H - py + (1 - stepY) * TILE_H / 2) / sinA;
    }

    let perpWallDist = distance * Math.cos(rayAngle - pA);
    if (perpWallDist <= 0) perpWallDist = 0.1;
    
    const wallH = 64; 
    const lineHeight = Math.floor((wallH / perpWallDist) * projDistance);
    const drawStart = -lineHeight / 2 + canvasH / 2;
    
    let color = '#555555';
    if (side === 1) color = '#333333'; 
    
    // Depth shading
    const shade = Math.max(0, 1 - (perpWallDist / 1200));
    ctx.fillStyle = color;
    ctx.globalAlpha = shade;
    ctx.fillRect(x, drawStart, 1, lineHeight);
    ctx.globalAlpha = 1.0;
    
    zBuffer[x] = perpWallDist;
  }

  // Gather Sprites
  const sprites = [];
  
  for (const z of zombies) {
    if (z.isAlive) sprites.push({ x: z.x, y: z.y, emoji: '🧟', size: 64 });
  }
  if (resources) {
    for (const r of resources) {
      if (r.amount > 0) {
        const icons = { food:'🌿', water_jug:'💧', wood:'🪵', stone:'🪨', meat:'🥩', sun_stone:'⭐', rags:'🧻', pills:'💊', medkit:'✚', painkiller:'💊', infection_cure:'💉', molotov:'🔥', noise_bomb:'🔊', electric_trap:'⚡', shiv:'🔪' };
        sprites.push({ x: r.col * TILE_W + TILE_W/2, y: r.row * TILE_H + TILE_H/2, emoji: icons[r.type] || '?', size: 24 });
      }
    }
  }
  if (buildings) {
    for (const b of Object.values(buildings)) {
      const icons = { firepit:'🔥', wall:'🧱', fence:'🚧', tower:'🗼', well:'💧', farm:'🌾' };
      sprites.push({ x: b.col * TILE_W + TILE_W/2, y: b.row * TILE_H + TILE_H/2, emoji: icons[b.type] || '?', size: 64 });
    }
  }

  // Calculate distance and sort (furthest first)
  for (let i = 0; i < sprites.length; i++) {
    sprites[i].dist = Math.hypot(player.x - sprites[i].x, player.y - sprites[i].y);
  }
  sprites.sort((a, b) => b.dist - a.dist);

  // Render Sprites
  for (const sprite of sprites) {
    const spriteX = sprite.x - player.x;
    const spriteY = sprite.y - player.y;
    
    const transformX = -spriteX * Math.sin(pA) + spriteY * Math.cos(pA);
    const transformY = spriteX * Math.cos(pA) + spriteY * Math.sin(pA);
    
    if (transformY > 0) { 
      const spriteScreenX = Math.floor((canvasW / 2) * (1 + transformX / transformY));
      const spriteHeight = Math.abs(Math.floor((sprite.size / transformY) * projDistance));
      const spriteWidth = spriteHeight; 
      
      // Calculate floor Y on screen (assuming camera is at height 32 and wall height is 64)
      const floorYScreen = Math.floor(canvasH / 2 + (32 / transformY) * projDistance);
      const drawStartY = floorYScreen - spriteHeight;
      const drawStartX = spriteScreenX - spriteWidth / 2;
      
      const startX = Math.max(0, Math.floor(drawStartX));
      const endX = Math.min(canvasW - 1, Math.floor(drawStartX + spriteWidth));
      
      const spriteImg = getSpriteCanvas(sprite.emoji, null);
      
      ctx.imageSmoothingEnabled = false;

      for (let stripe = startX; stripe <= endX; stripe++) {
        if (transformY < zBuffer[stripe]) {
          const texX = Math.floor((stripe - drawStartX) * 64 / spriteWidth);
          if (texX >= 0 && texX < 64) {
            ctx.drawImage(spriteImg, texX, 0, 1, 64, stripe, drawStartY, 1, spriteHeight);
          }
        }
      }
    }
  }

  // Weapon HUD (Player's Hand)
  ctx.save();
  const bob = player.isMoving ? Math.sin(Date.now() / 150) * (player.isRunning ? 30 : 15) : 0;
  const attackOffset = player.attackAnim > 0 ? 50 : 0;
  
  ctx.fillStyle = player.infected ? '#88cc44' : '#f5cba7';
  ctx.beginPath();
  ctx.arc(canvasW/2 + 100, canvasH - 50 + bob - attackOffset, 40, 0, Math.PI*2);
  ctx.fill();
  
  ctx.fillStyle = '#8B6914';
  ctx.fillRect(canvasW/2 + 80, canvasH - 150 + bob - attackOffset, 20, 150);
  ctx.fillStyle = '#ccc';
  ctx.beginPath();
  ctx.moveTo(canvasW/2 + 80, canvasH - 150 + bob - attackOffset);
  ctx.lineTo(canvasW/2 + 90, canvasH - 200 + bob - attackOffset);
  ctx.lineTo(canvasW/2 + 100, canvasH - 150 + bob - attackOffset);
  ctx.fill();
  
  if (player.attackAnim > 0) {
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(canvasW/2 + 90, canvasH - 180 + bob - attackOffset, 10, 0, Math.PI*2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawMinimap(ctx, state, canvasW, canvasH) {
  const { player, tiles, zombies, resources, buildings } = state;
  const size = 150;
  const pad = 10;
  const sx = pad;
  const sy = pad;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(sx, sy, size, size);
  ctx.strokeStyle = '#55ff55';
  ctx.strokeRect(sx, sy, size, size);

  const scaleX = size / (MAP_COLS * TILE_W);
  const scaleY = size / (MAP_ROWS * TILE_H);

  for (let r = 0; r < MAP_ROWS; r++) {
    for (let c = 0; c < MAP_COLS; c++) {
      if (tiles[r][c] === 7) {
        ctx.fillStyle = '#555';
        ctx.fillRect(sx + c * TILE_W * scaleX, sy + r * TILE_H * scaleY, Math.ceil(TILE_W * scaleX), Math.ceil(TILE_H * scaleY));
      }
    }
  }

  if (resources) {
    for (const r of resources) {
      if (r.amount > 0) {
        ctx.fillStyle = '#44aa44';
        ctx.fillRect(sx + r.col * TILE_W * scaleX, sy + r.row * TILE_H * scaleY, 2, 2);
      }
    }
  }

  if (buildings) {
    for (const b of Object.values(buildings)) {
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(sx + b.col * TILE_W * scaleX, sy + b.row * TILE_H * scaleY, 2, 2);
    }
  }

  ctx.fillStyle = '#ff3333';
  for (const z of zombies) {
    if (!z.isAlive) continue;
    ctx.beginPath();
    ctx.arc(sx + z.x * scaleX, sy + z.y * scaleY, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Vision cone on minimap
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.moveTo(sx + player.x * scaleX, sy + player.y * scaleY);
  ctx.arc(sx + player.x * scaleX, sy + player.y * scaleY, 30, player.facingAngle - Math.PI/4, player.facingAngle + Math.PI/4);
  ctx.closePath();
  ctx.fill();
  
  ctx.fillStyle = '#55ff55';
  ctx.beginPath();
  ctx.arc(sx + player.x * scaleX, sy + player.y * scaleY, 2, 0, Math.PI * 2);
  ctx.fill();
}

export function drawBuildPreview(ctx, buildType, hoverCol, hoverRow, canAfford, camX, camY, canvasW, canvasH) {
  ctx.font = '20px sans-serif';
  ctx.fillStyle = canAfford ? '#44ff44' : '#ff4444';
  ctx.textAlign = 'center';
  ctx.fillText(`Placing: ${buildType} (Left Click to build)`, canvasW/2, canvasH/2 + 50);
}

export function drawParticles(ctx, particles, camX, camY, canvasW, canvasH, state) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.timer -= 16;
    if (p.timer <= 0) { particles.splice(i, 1); continue; }
    const alpha = p.timer / p.maxTimer;
    
    const spriteX = p.x - state.player.x;
    const spriteY = p.y - state.player.y;
    const transformX = spriteX * Math.sin(state.player.facingAngle) - spriteY * Math.cos(state.player.facingAngle);
    const transformY = spriteX * Math.cos(state.player.facingAngle) + spriteY * Math.sin(state.player.facingAngle);
    
    if (transformY > 0) {
      const projDistance = (canvasW / 2) / Math.tan(Math.PI/6);
      const spriteScreenX = Math.floor((canvasW / 2) * (1 + transformX / transformY));
      
      if (p.type === 'damage') {
        ctx.fillStyle = `rgba(255,80,0,${alpha})`;
        ctx.font = `bold ${12 + (1 - alpha) * 8}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(`-${p.dmg}`, spriteScreenX, canvasH/2 - (1 - alpha) * 30);
      }
    }
  }
}
