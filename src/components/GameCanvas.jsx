import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useGameLoop } from '../hooks/useGameLoop.js';
import { createGameState, gameUpdate, gameDraw, handleBuild, handleAttack } from '../game/engine.js';
import { useItem } from '../game/player.js';
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
      if (e.code === 'Digit1') useItem(s.player, 'food');
      if (e.code === 'Digit2') useItem(s.player, 'water_jug');
      if (e.code === 'Digit3') useItem(s.player, 'meat');
      if (e.code === 'Digit4') useItem(s.player, 'sun_stone');
      if (e.code === 'KeyF') s.buildMode = s.buildMode === 'fence'      ? null : 'fence';
      if (e.code === 'KeyG') s.buildMode = s.buildMode === 'wall'       ? null : 'wall';
      if (e.code === 'KeyH') s.buildMode = s.buildMode === 'watchtower' ? null : 'watchtower';
      if (e.code === 'KeyJ') s.buildMode = s.buildMode === 'firepit'    ? null : 'firepit';
      if (e.code === 'KeyK') s.buildMode = s.buildMode === 'well'       ? null : 'well';
      if (e.code === 'KeyL') s.buildMode = s.buildMode === 'farm'       ? null : 'farm';
      if (e.code === 'Escape') s.buildMode = null;
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
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    mouseRef.current.x = mx;
    mouseRef.current.y = my;
    mouseRef.current.angle = Math.atan2(my - canvas.height / 2, mx - canvas.width / 2);

    const s = stateRef.current;
    if (!s) return;
    const { player } = s;
    const camX = (player.x / TILE_W - player.y / TILE_H) * (TILE_W / 2);
    const camY = (player.x / TILE_W + player.y / TILE_H) * (TILE_H / 2);
    const relX = (mx - canvas.width / 2) + camX;
    const relY = (my - canvas.height / 2) + camY;
    s.hoverCol = Math.floor((relX / (TILE_W / 2) + relY / (TILE_H / 2)) / 2);
    s.hoverRow = Math.floor((relY / (TILE_H / 2) - relX / (TILE_W / 2)) / 2);
  }, []);

  const handleMouseClick = useCallback(() => {
    const s = stateRef.current;
    if (!s || s.gamePhase !== 'playing') return;
    if (s.buildMode) {
      handleBuild(s, s.hoverCol, s.hoverRow);
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
      });
    }
  });

  const setBuildMode = useCallback((mode) => {
    if (stateRef.current) stateRef.current.buildMode = mode;
  }, []);

  const doUseItem = useCallback((item) => {
    if (stateRef.current) useItem(stateRef.current.player, item);
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
