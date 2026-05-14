import { WAVE_CONFIG, WAVE_REST_TIME, TOTAL_WAVES } from './constants.js';
import { spawnZombie } from './zombie.js';

export function createWaveManager() {
  return {
    currentWave: 0,       // 0 = not started
    totalWaves: TOTAL_WAVES,
    phase: 'rest',        // 'rest' | 'active' | 'victory'
    phaseTimer: 5000,     // countdown to first wave (ms)
    zombiesRemaining: 0,
    bossAlive: false,
  };
}

export function updateWaveManager(wm, zombies, tiles, player, dt) {
  if (wm.phase === 'victory') return;

  const aliveZombies = zombies.filter(z => z.isAlive);

  if (wm.phase === 'rest') {
    wm.phaseTimer -= dt;
    if (wm.phaseTimer <= 0) {
      // Start next wave
      wm.currentWave++;
      if (wm.currentWave > wm.totalWaves) {
        wm.phase = 'victory';
        return;
      }
      wm.phase = 'active';
      const waveDef = WAVE_CONFIG[wm.currentWave - 1];
      let total = 0;
      for (const group of waveDef) {
        for (let i = 0; i < group.count; i++) {
          zombies.push(spawnZombie(group.rank, tiles, player.x, player.y));
          total++;
        }
      }
      wm.zombiesRemaining = total;
      if (wm.currentWave === wm.totalWaves) wm.bossAlive = true;
    }
  } else if (wm.phase === 'active') {
    wm.zombiesRemaining = aliveZombies.length;
    if (wm.zombiesRemaining === 0) {
      if (wm.currentWave >= wm.totalWaves) {
        wm.phase = 'victory';
      } else {
        wm.phase = 'rest';
        wm.phaseTimer = WAVE_REST_TIME;
        wm.bossAlive = false;
      }
    }
  }
}
