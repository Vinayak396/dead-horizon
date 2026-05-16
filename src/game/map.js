import { TILE, MAP_COLS, MAP_ROWS, COLORS, TILE_W, TILE_H } from './constants.js';

// ─── Noise helper (simple value noise) ──────────────────────────────────────
function mulberry32(a) {
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function generateMap(seed = 42) {
  const rng = mulberry32(seed);
  const tiles = [];
  const resources = [];
  const buildings = {};

  // ── build noise grid (Bilinear Interpolation for massive biomes) ─────────
  const scale = 80; // Massive biome scale
  const noiseGridRows = Math.ceil(MAP_ROWS / scale) + 1;
  const noiseGridCols = Math.ceil(MAP_COLS / scale) + 1;
  const noiseGrid = Array.from({ length: noiseGridRows }, () =>
    Array.from({ length: noiseGridCols }, () => rng())
  );

  function getNoise(r, c) {
    const x0 = Math.floor(c / scale);
    const x1 = x0 + 1;
    const y0 = Math.floor(r / scale);
    const y1 = y0 + 1;
    const sx = (c / scale) - x0;
    const sy = (r / scale) - y0;
    
    // smoothstep function for organic curves
    const smoothX = sx * sx * (3 - 2 * sx);
    const smoothY = sy * sy * (3 - 2 * sy);

    const nx0 = noiseGrid[y0][x0] * (1 - smoothX) + noiseGrid[y0][x1] * smoothX;
    const nx1 = noiseGrid[y1][x0] * (1 - smoothX) + noiseGrid[y1][x1] * smoothX;
    return nx0 * (1 - smoothY) + nx1 * smoothY;
  }

  for (let r = 0; r < MAP_ROWS; r++) {
    tiles[r] = [];
    for (let c = 0; c < MAP_COLS; c++) {
      const n = getNoise(r, c);
      if (n < 0.20) tiles[r][c] = TILE.WATER;
      else if (n < 0.35) tiles[r][c] = TILE.SAND;
      else if (n < 0.65) tiles[r][c] = TILE.GRASS;
      else if (n < 0.80) tiles[r][c] = TILE.DIRT;
      else if (n < 0.90) tiles[r][c] = TILE.ROAD;
      else tiles[r][c] = TILE.RUBBLE;
    }
  }

  // ── carve out player start area (centre) ──────────────────────────────────
  const cr = Math.floor(MAP_ROWS / 2);
  const cc = Math.floor(MAP_COLS / 2);
  for (let dr = -5; dr <= 5; dr++) {
    for (let dc = -5; dc <= 5; dc++) {
      const rr = cr + dr, rc = cc + dc;
      if (rr >= 0 && rr < MAP_ROWS && rc >= 0 && rc < MAP_COLS) {
        tiles[rr][rc] = TILE.DIRT;
      }
    }
  }

  // ── generate world buildings (ruins) ──────────────────────────────────────
  let bPlaced = 0;
  let bAttempts = 0;
  // Increase buildings because map is 200x200
  while (bPlaced < 40 && bAttempts < 300) {
    bAttempts++;
    const bw = Math.floor(rng() * 6) + 5; 
    const bh = Math.floor(rng() * 6) + 5;
    const br = Math.floor(rng() * (MAP_ROWS - bh - 4)) + 2;
    const bc = Math.floor(rng() * (MAP_COLS - bw - 4)) + 2;

    // Don't spawn on player
    if (Math.hypot(br + bh/2 - cr, bc + bw/2 - cc) < 15) continue;
    
    // Check if flat enough (mostly dirt or road)
    let ok = true;
    for (let r = br; r < br + bh; r++) {
      for (let c = bc; c < bc + bw; c++) {
        if (tiles[r][c] === TILE.WATER) ok = false;
      }
    }
    if (!ok) continue;

    // Carve building
    for (let r = br; r < br + bh; r++) {
      for (let c = bc; c < bc + bw; c++) {
        if (r === br || r === br + bh - 1 || c === bc || c === bc + bw - 1) {
          tiles[r][c] = TILE.WALL;
        } else {
          tiles[r][c] = TILE.FLOOR;
        }
      }
    }

    // Punch a door
    const doorSide = Math.floor(rng() * 4);
    if (doorSide === 0) tiles[br][bc + Math.floor(bw/2)] = TILE.FLOOR;
    else if (doorSide === 1) tiles[br + Math.floor(bh/2)][bc + bw - 1] = TILE.FLOOR;
    else if (doorSide === 2) tiles[br + bh - 1][bc + Math.floor(bw/2)] = TILE.FLOOR;
    else tiles[br + Math.floor(bh/2)][bc] = TILE.FLOOR;

    bPlaced++;
  }

  // ── resources ─────────────────────────────────────────────────────────────
  // More resources for a larger map
  for (let i = 0; i < 300; i++) {
    const r = Math.floor(rng() * MAP_ROWS);
    const c = Math.floor(rng() * MAP_COLS);
    if (tiles[r][c] === TILE.WATER || tiles[r][c] === TILE.WALL) continue;
    if (Math.hypot(r - cr, c - cc) < 5) continue; // not directly on spawn

    const typePool = ['food', 'water_jug', 'wood', 'stone', 'rags', 'pills'];
    const type = typePool[Math.floor(rng() * typePool.length)];
    const amount = Math.floor(rng() * 3) + 1;
    resources.push({ row: r, col: c, type, amount, isSunStone: false });
  }
  
  // ── place the Sun Stone (single, far from centre, deep map) ───────────────
  let sunPlaced = false;
  let sunAttempts = 0;
  while (!sunPlaced && sunAttempts < 5000) {
    sunAttempts++;
    const r = Math.floor(rng() * MAP_ROWS);
    const c = Math.floor(rng() * MAP_COLS);
    const dist = Math.hypot(r - cr, c - cc);
    if (dist < 40) continue; // Much further away because map is 200x200!
    if (tiles[r][c] === TILE.WATER || tiles[r][c] === TILE.WALL) continue;
    
    resources.push({ row: r, col: c, type: 'sun_stone', amount: 1, isSunStone: true });
    sunPlaced = true;
  }

  return { tiles, resources, buildings };
}

export function getTileHeight(tileType) {
  const heights = {
    [TILE.WATER]: 0,
    [TILE.SAND]: 4,
    [TILE.ROAD]: 6,
    [TILE.DIRT]: 8,
    [TILE.GRASS]: 12,
    [TILE.FLOOR]: 16,
    [TILE.RUBBLE]: 20,
    [TILE.WALL]: 60,
  };
  return heights[tileType] || 0;
}

export function getExactHeight(x, y, tiles) {
  const c = Math.floor(x / TILE_W);
  const r = Math.floor(y / TILE_H);
  if (c < 0 || c >= MAP_COLS || r < 0 || r >= MAP_ROWS) return 0;
  const t = tiles[r][c];
  if (t === TILE.WALL) return 20; // Prevent snapping to top of solid walls
  return getTileHeight(t);
}

// ─── Coordinate helpers ───────────────────────────────────────────────────────
export function tileToIso(col, row, tileW, tileH) {
  return {
    x: (col - row) * (tileW / 2),
    y: (col + row) * (tileH / 2),
  };
}

export function isoToTile(isoX, isoY, tileW, tileH) {
  const col = (isoX / (tileW / 2) + isoY / (tileH / 2)) / 2;
  const row = (isoY / (tileH / 2) - isoX / (tileW / 2)) / 2;
  return { col: Math.floor(col), row: Math.floor(row) };
}

export function worldToScreen(wx, wy, camX, camY, tileW, tileH) {
  const iso = tileToIso(wx / tileW, wy / tileH, tileW, tileH);
  return {
    sx: iso.x - camX,
    sy: iso.y - camY,
  };
}

export function getTileColor(tileType) {
  const map = {
    [TILE.GRASS]:  [COLORS.grass,  '#4a6a32'],
    [TILE.DIRT]:   [COLORS.dirt,   '#8a6a48'],
    [TILE.WATER]:  [COLORS.water,  '#1a5a8a'],
    [TILE.ROAD]:   [COLORS.road,   '#5a5a5a'],
    [TILE.RUBBLE]: [COLORS.rubble, '#7a6a5a'],
    [TILE.SAND]:   [COLORS.sand,   '#c8b070'],
    [TILE.FLOOR]:  ['#786858',     '#584838'], // Dirty wood/tile
    [TILE.WALL]:   ['#888888',     '#666666'], // Concrete/Brick wall
  };
  return map[tileType] || [COLORS.grass, '#4a6a32'];
}

export function isWalkable(tiles, col, row) {
  if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return false;
  const t = tiles[row][col];
  return t !== TILE.WATER && t !== TILE.WALL;
}
