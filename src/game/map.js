import { TILE, MAP_COLS, MAP_ROWS, COLORS } from './constants.js';

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

  // ── build noise grid ───────────────────────────────────────────────────────
  const noise = Array.from({ length: MAP_ROWS }, () =>
    Array.from({ length: MAP_COLS }, () => rng())
  );

  for (let r = 0; r < MAP_ROWS; r++) {
    tiles[r] = [];
    for (let c = 0; c < MAP_COLS; c++) {
      const n = noise[r][c];
      if (n < 0.07) tiles[r][c] = TILE.WATER;
      else if (n < 0.18) tiles[r][c] = TILE.SAND;
      else if (n < 0.55) tiles[r][c] = TILE.GRASS;
      else if (n < 0.70) tiles[r][c] = TILE.DIRT;
      else if (n < 0.82) tiles[r][c] = TILE.ROAD;
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

  // ── scatter resources ─────────────────────────────────────────────────────
  const resourceDefs = [
    { type:'food',      count:35, tile:[TILE.GRASS, TILE.DIRT] },
    { type:'water_jug', count:25, tile:[TILE.SAND, TILE.RUBBLE] },
    { type:'wood',      count:40, tile:[TILE.GRASS] },
    { type:'stone',     count:35, tile:[TILE.RUBBLE, TILE.DIRT] },
    { type:'meat',      count:20, tile:[TILE.GRASS, TILE.RUBBLE] },
  ];

  for (const def of resourceDefs) {
    let placed = 0;
    let attempts = 0;
    while (placed < def.count && attempts < 3000) {
      attempts++;
      const r = Math.floor(rng() * MAP_ROWS);
      const c = Math.floor(rng() * MAP_COLS);
      const dist = Math.hypot(r - cr, c - cc);
      if (dist < 8) continue;
      if (!def.tile.includes(tiles[r][c])) continue;
      const key = `${r},${c}`;
      if (resources.find(x => x.key === key)) continue;
      resources.push({ key, row: r, col: c, type: def.type, amount: Math.floor(rng() * 4) + 2 });
      placed++;
    }
  }

  // ── place the Sun Stone (single, far from centre, deep map) ───────────────
  let sunPlaced = false;
  let sunAttempts = 0;
  while (!sunPlaced && sunAttempts < 5000) {
    sunAttempts++;
    const r = Math.floor(rng() * MAP_ROWS);
    const c = Math.floor(rng() * MAP_COLS);
    const dist = Math.hypot(r - cr, c - cc);
    if (dist < 20) continue;
    const key = `${r},${c}`;
    if (resources.find(x => x.key === key)) continue;
    resources.push({ key, row: r, col: c, type: 'sun_stone', amount: 1, isSunStone: true });
    sunPlaced = true;
  }

  return { tiles, resources, buildings };
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
  };
  return map[tileType] || [COLORS.grass, '#4a6a32'];
}

export function isWalkable(tiles, col, row) {
  if (row < 0 || row >= MAP_ROWS || col < 0 || col >= MAP_COLS) return false;
  return tiles[row][col] !== TILE.WATER;
}
