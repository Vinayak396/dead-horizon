import { BUILDING_COSTS, BUILDING_HP, TILE_W, TILE_H } from './constants.js';

export function canAfford(inventory, buildingType) {
  const cost = BUILDING_COSTS[buildingType];
  if (!cost) return false;
  for (const [res, amt] of Object.entries(cost)) {
    if ((inventory[res] || 0) < amt) return false;
  }
  return true;
}

export function placeBuilding(buildings, inventory, buildingType, col, row) {
  const key = `${col},${row}`;
  if (buildings[key]) return false;
  const cost = BUILDING_COSTS[buildingType];
  if (!cost) return false;
  for (const [res, amt] of Object.entries(cost)) {
    if ((inventory[res] || 0) < amt) return false;
  }
  // Deduct resources
  for (const [res, amt] of Object.entries(cost)) {
    inventory[res] -= amt;
  }
  buildings[key] = {
    type: buildingType,
    col, row,
    hp: BUILDING_HP[buildingType],
    maxHp: BUILDING_HP[buildingType],
  };
  return true;
}

export function removeBuilding(buildings, inventory, col, row) {
  const key = `${col},${row}`;
  if (!buildings[key]) return false;
  const type = buildings[key].type;
  // Refund half resources
  const cost = BUILDING_COSTS[type] || {};
  for (const [res, amt] of Object.entries(cost)) {
    inventory[res] = (inventory[res] || 0) + Math.floor(amt / 2);
  }
  delete buildings[key];
  return true;
}

export function updateBuildings(buildings, player, dt) {
  for (const key of Object.keys(buildings)) {
    const b = buildings[key];
    // Farm: generate food over time
    if (b.type === 'farm') {
      b.farmTimer = (b.farmTimer || 0) + dt;
      if (b.farmTimer >= 15000) {
        b.farmTimer = 0;
        player.inventory.food = (player.inventory.food || 0) + 1;
      }
    }
    // Well: generate water jugs over time
    if (b.type === 'well') {
      b.wellTimer = (b.wellTimer || 0) + dt;
      if (b.wellTimer >= 12000) {
        b.wellTimer = 0;
        player.inventory.water_jug = (player.inventory.water_jug || 0) + 1;
      }
    }
    // Firepit: restore stamina faster when near
    if (b.type === 'firepit') {
      const bx = b.col * TILE_W + TILE_W / 2;
      const by = b.row * TILE_H + TILE_H / 2;
      const dist = Math.hypot(bx - player.x, by - player.y);
      if (dist < 80) {
        player.stamina = Math.min(player.maxHp || 100, (player.stamina || 0) + 0.08 * dt);
      }
    }
  }
}
