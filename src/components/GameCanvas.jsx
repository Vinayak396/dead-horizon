import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useGameLoop } from '../hooks/useGameLoop.js';
import { createGameState, gameUpdate, gameDraw, handleBuild, handleAttack, handleThrowable, addAlert } from '../game/engine.js';
import { consumeItem, tryStealthKill } from '../game/player.js';
import { TILE_W, TILE_H } from '../game/constants.js';
import HUD from './HUD.jsx';

export default function GameCanvas({ onDead, onVictory }) {
  const canvasRef = useRef(null);
  const stateRef  = useRef(null);
  const keysRef   = useRef({});
  const mouseRef  = useRef({ x: 0, y: 0, angle: 0 });
  const [hudData, setHudData] = useState(null);
  const deadFiredRef    = useRef(false);
  const victoryFiredRef = useRef(false);

  // Init game
  useEffect(() => {
    stateRef.current = createGameState();
    deadFiredRef.current = false;
    victoryFiredRef.current = false;
  }, []);

  // Key handlers
  useEffect(() => {
    const down = (e) => {
      keysRef.current[e.code] = true;
      const s = stateRef.current;
      if (!s) return;
      if (e.code === 'Digit1') consumeItem(s.player, 'food');
      if (e.code === 'Digit2') consumeItem(s.player, 'water_jug');
      if (e.code === 'Digit3') consumeItem(s.player, 'meat');
      if (e.code === 'Digit4') consumeItem(s.player, 'sun_stone');
      if (e.code === 'KeyF') s.buildMode = s.buildMode === 'fence'      ? null : 'fence';
      if (e.code === 'KeyG') s.buildMode = s.buildMode === 'wall'       ? null : 'wall';
      if (e.code === 'KeyH') s.buildMode = s.buildMode === 'watchtower' ? null : 'watchtower';
      if (e.code === 'KeyJ') s.buildMode = s.buildMode === 'firepit'    ? null : 'firepit';
      if (e.code === 'KeyK') s.buildMode = s.buildMode === 'well'       ? null : 'well';
      if (e.code === 'KeyL') s.buildMode = s.buildMode === 'farm'       ? null : 'farm';
      if (e.code === 'KeyC') s.craftingOpen = !s.craftingOpen;
      if (e.code === 'Escape') { s.buildMode = null; s.craftingOpen = false; }
      
      // Stealth kill
      if (e.code === 'KeyE') {
        const kill = tryStealthKill(s.player, s.zombies);
        if (kill.success) {
          addAlert(s.alerts, '🔪 Stealth Kill!');
          s.noiseEvents.push({ x: s.player.x, y: s.player.y, radius: 40 }); // quiet kill
        }
      }

      // Throwables
      const worldTargetX = s.hoverCol * TILE_W + TILE_W / 2;
      const worldTargetY = s.hoverRow * TILE_H + TILE_H / 2;
      if (e.code === 'KeyT') handleThrowable(s, 'molotov', worldTargetX, worldTargetY);
      if (e.code === 'KeyY') handleThrowable(s, 'noise_bomb', worldTargetX, worldTargetY);
      if (e.code === 'KeyU') handleThrowable(s, 'electric_trap', worldTargetX, worldTargetY);
    };
    const up = (e) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  // Mouse tracking
  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    if (document.pointerLockElement === canvas) {
      // First-Person camera rotation
      const dx = e.movementX || 0;
      mouseRef.current.angle += dx * 0.003; // sensitivity
      // normalize
      if (mouseRef.current.angle > Math.PI * 2) mouseRef.current.angle -= Math.PI * 2;
      if (mouseRef.current.angle < 0) mouseRef.current.angle += Math.PI * 2;
    } else {
      // Free mouse mode
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      mouseRef.current.x = mx;
      mouseRef.current.y = my;
    }
  }, []);

  const handleMouseClick = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (document.pointerLockElement !== canvas) {
      // Request pointer lock on first click
      canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock;
      canvas.requestPointerLock();
      return;
    }

    const s = stateRef.current;
    if (!s || s.gamePhase !== 'playing') return;
    if (s.buildMode) {
      // Building might be weird in FPS, but let's keep the hook
      // We will place it directly in front of the player
      // s.hoverCol / s.hoverRow need to be calculated based on looking direction
      const pDist = 64; // distance to place
      const tx = s.player.x + Math.cos(s.player.facingAngle) * pDist;
      const ty = s.player.y + Math.sin(s.player.facingAngle) * pDist;
      handleBuild(s, Math.floor(tx / TILE_W), Math.floor(ty / TILE_H));
    } else {
      handleAttack(s, performance.now());
    }
  }, []);

  // Game loop
  useGameLoop((dt, now) => {
    const s = stateRef.current;
    const canvas = canvasRef.current;
    if (!s || !canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    gameUpdate(s, keysRef.current, mouseRef.current.angle, dt, now);
    gameDraw(s, ctx, canvas.width, canvas.height);

    if (s.gamePhase === 'dead' && !deadFiredRef.current) {
      deadFiredRef.current = true;
      setTimeout(() => onDead?.(), 1500);
    }
    if (s.gamePhase === 'victory' && !victoryFiredRef.current) {
      victoryFiredRef.current = true;
      setTimeout(() => onVictory?.(), 2000);
    }

    if (now % 100 < dt) {
      setHudData({
        hp:         s.player.hp,
        maxHp:      s.player.maxHp,
        hunger:     s.player.hunger,
        water:      s.player.water,
        stamina:    s.player.stamina,
        infected:   s.player.infected,
        injuries:   s.player.injuries || [],
        infectionTimer: s.player.infectionTimer || 0,
        inventory:  { ...s.player.inventory },
        hasSunStone: s.player.hasSunStone,
        level:      s.player.level,
        xp:         s.player.xp,
        buildMode:  s.buildMode,
        wave:       s.waveManager.currentWave,
        totalWaves: s.waveManager.totalWaves,
        wavePhase:  s.waveManager.phase,
        waveTimer:  s.waveManager.phaseTimer,
        zombiesLeft: s.waveManager.zombiesRemaining,
        alerts:     [...s.alerts],
        craftingOpen: s.craftingOpen,
      });
    }
  });

  const setBuildMode = useCallback((mode) => {
    if (stateRef.current) stateRef.current.buildMode = mode;
  }, []);

  const doUseItem = useCallback((item) => {
    if (stateRef.current) consumeItem(stateRef.current.player, item);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ display: 'block', cursor: hudData?.buildMode ? 'crosshair' : 'default' }}
        onMouseMove={handleMouseMove}
        onClick={handleMouseClick}
        onContextMenu={(e) => { e.preventDefault(); if (stateRef.current) stateRef.current.buildMode = null; }}
      />
      {hudData && (
        <HUD
          data={hudData}
          onSetBuildMode={setBuildMode}
          onUseItem={doUseItem}
        />
      )}
    </div>
  );
}
