// ─── Tile & World ───────────────────────────────────────────────────────────
export const TILE_W = 64;          // isometric tile width
export const TILE_H = 32;          // isometric tile height
export const MAP_COLS = 60;
export const MAP_ROWS = 60;

// ─── Player ──────────────────────────────────────────────────────────────────
export const PLAYER_SPEED       = 3;
export const PLAYER_RUN_SPEED   = 5.5;
export const PLAYER_MAX_HP      = 100;
export const PLAYER_MAX_HUNGER  = 100;
export const PLAYER_MAX_WATER   = 100;
export const PLAYER_MAX_STAMINA = 100;
export const HUNGER_DECAY_RATE  = 0.00033;  // ~5 min to deplete at 60fps
export const WATER_DECAY_RATE   = 0.00042;  // ~4 min to deplete at 60fps
export const STAMINA_RUN_DECAY  = 0.25;
export const STAMINA_REGEN      = 0.12;
export const ATTACK_RANGE       = 55;
export const ATTACK_DAMAGE      = 20;
export const ATTACK_COOLDOWN    = 500;      // ms

// ─── Tile types ───────────────────────────────────────────────────────────────
export const TILE = {
  GRASS:  0,
  DIRT:   1,
  WATER:  2,
  ROAD:   3,
  RUBBLE: 4,
  SAND:   5,
  FLOOR:  6,
  WALL:   7,
};

// ─── Terrain speed multipliers ────────────────────────────────────────────────
export const TILE_SPEED = {
  0: 1.0,   // Grass
  1: 1.0,   // Dirt
  2: 0.0,   // Water
  3: 1.35,  // Road
  4: 0.75,  // Rubble
  5: 0.65,  // Sand
  6: 1.1,   // Floor - slightly faster indoors
  7: 0.0,   // Wall - blocked
};

// ─── Resource types ───────────────────────────────────────────────────────────
export const RES = {
  FOOD:      'food',
  WATER_JUG: 'water_jug',
  WOOD:      'wood',
  STONE:     'stone',
  SUN_STONE: 'sun_stone',
  MEAT:      'meat',
  RAGS:      'rags',
  PILLS:     'pills',
};

// ─── Items (Craftable / Usable) ───────────────────────────────────────────────
export const ITEMS = {
  SHIV:          'shiv',
  MOLOTOV:       'molotov',
  NOISE_BOMB:    'noise_bomb',
  ELECTRIC_TRAP: 'electric_trap',
  MEDKIT:        'medkit',
  INFECTION_CURE:'infection_cure',
  PAINKILLER:    'painkiller',
};

// ─── Zombie States ────────────────────────────────────────────────────────────
export const ZOMBIE_STATE = {
  IDLE: 0,
  CURIOUS: 1,
  ALERTED: 2,
  HUNTING: 3,
  SEARCHING: 4,
  GIVING_UP: 5,
};

// ─── Noise Levels ─────────────────────────────────────────────────────────────
export const NOISE_RADIUS = {
  SNEAK: 0,
  WALK: 30,
  RUN: 80,
  ATTACK: 120,
  EXPLOSION: 300,
};

// ─── Building types ───────────────────────────────────────────────────────────
export const BUILDING = {
  FENCE:     'fence',
  WALL:      'wall',
  WATCHTOWER:'watchtower',
  FIREPIT:   'firepit',
  WELL:      'well',
  FARM:      'farm',
};

export const BUILDING_COSTS = {
  fence:      { wood: 2, stone: 1 },
  wall:       { stone: 3 },
  watchtower: { wood: 4 },
  firepit:    { wood: 2 },
  well:       { stone: 3 },
  farm:       { wood: 1 },
};

export const BUILDING_HP = {
  fence:      80,
  wall:       200,
  watchtower: 120,
  firepit:    60,
  well:       100,
  farm:       70,
};

// ─── Zombie ranks ─────────────────────────────────────────────────────────────
export const ZOMBIE_RANKS = [
  { rank:1,  name:'Crawler',     hp:30,   dmg:5,  speed:0.5, color:'#6b7a3d', size:14, xp:5   },
  { rank:2,  name:'Walker',      hp:50,   dmg:8,  speed:0.8, color:'#7a6b3d', size:16, xp:10  },
  { rank:3,  name:'Runner',      hp:60,   dmg:10, speed:1.8, color:'#5a8a3d', size:16, xp:15  },
  { rank:4,  name:'Biter',       hp:80,   dmg:15, speed:1.1, color:'#8a3d3d', size:18, xp:20  },
  { rank:5,  name:'Spitter',     hp:90,   dmg:12, speed:1.2, color:'#3d8a5a', size:18, xp:25  },
  { rank:6,  name:'Bloater',     hp:120,  dmg:20, speed:0.7, color:'#6a4a2a', size:22, xp:35  },
  { rank:7,  name:'Armored',     hp:150,  dmg:18, speed:1.0, color:'#4a4a6a', size:20, xp:40  },
  { rank:8,  name:'Berserker',   hp:130,  dmg:25, speed:2.0, color:'#8a1a1a', size:20, xp:50  },
  { rank:9,  name:'Necromancer', hp:100,  dmg:15, speed:0.9, color:'#5a1a8a', size:18, xp:60  },
  { rank:10, name:'Tank',        hp:300,  dmg:30, speed:0.6, color:'#3a3a3a', size:28, xp:80  },
  { rank:11, name:'Shadow',      hp:120,  dmg:35, speed:2.5, color:'#1a1a2a', size:18, xp:100 },
];

export const BOSS_RANK = {
  rank:12, name:'Plague Lord', hp:2000, dmg:50, speed:1.3, color:'#4a0080', size:36, xp:500,
};

// ─── Waves config ─────────────────────────────────────────────────────────────
// Each wave: array of {rank, count}
export const WAVE_CONFIG = [
  /* 1*/  [{ rank:1, count:6 }],
  /* 2*/  [{ rank:1, count:8 }, { rank:2, count:3 }],
  /* 3*/  [{ rank:2, count:8 }, { rank:3, count:4 }],
  /* 4*/  [{ rank:2, count:6 }, { rank:3, count:6 }, { rank:4, count:2 }],
  /* 5*/  [{ rank:3, count:8 }, { rank:4, count:4 }, { rank:5, count:2 }],
  /* 6*/  [{ rank:4, count:6 }, { rank:5, count:4 }, { rank:6, count:2 }],
  /* 7*/  [{ rank:5, count:6 }, { rank:6, count:4 }, { rank:7, count:3 }],
  /* 8*/  [{ rank:6, count:4 }, { rank:7, count:4 }, { rank:8, count:4 }],
  /* 9*/  [{ rank:7, count:5 }, { rank:8, count:5 }, { rank:9, count:3 }],
  /*10*/  [{ rank:8, count:5 }, { rank:9, count:4 }, { rank:10, count:2 }, { rank:11, count:2 }],
  /*11 BOSS*/ [{ rank:12, count:1 }, { rank:8, count:6 }, { rank:9, count:4 }],
];

export const WAVE_REST_TIME = 12000;  // ms between waves
export const TOTAL_WAVES    = 11;

// ─── Colors ───────────────────────────────────────────────────────────────────
export const COLORS = {
  grass:  '#3d5a2a',
  dirt:   '#7a5c3a',
  water:  '#1a4a7a',
  road:   '#4a4a4a',
  rubble: '#6a5a4a',
  sand:   '#b8a060',
  fence:  '#8B6914',
  wall:   '#7a7a9a',
  watchtower: '#5a4020',
  firepit:'#cc4400',
  well:   '#5a7a9a',
  farm:   '#4a7a2a',
};
