import React from 'react';
import { BUILDING_COSTS } from '../game/constants.js';

const BAR_COLORS = {
  hp:      ['#ff4444', '#882222'],
  hunger:  ['#ff9922', '#884400'],
  water:   ['#44aaff', '#224488'],
  stamina: ['#44ff88', '#226644'],
};

function StatBar({ label, value, max, type, warn }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const [fill, bg] = BAR_COLORS[type];
  return (
    <div className="stat-bar-wrap">
      <span className="stat-label">{label}</span>
      <div className="stat-bar-bg" style={{ background: bg }}>
        <div
          className="stat-bar-fill"
          style={{
            width: `${pct}%`,
            background: pct < 20 ? '#ff0000' : fill,
            boxShadow: pct < 20 ? `0 0 8px ${fill}` : 'none',
            transition: 'width 0.2s ease',
          }}
        />
      </div>
      <span className="stat-val">{Math.floor(value)}</span>
    </div>
  );
}

const BUILD_ITEMS = [
  { key: 'fence',      label: '🪵 Fence',      hotkey: 'F' },
  { key: 'wall',       label: '🪨 Wall',        hotkey: 'G' },
  { key: 'watchtower', label: '🔭 Tower',       hotkey: 'H' },
  { key: 'firepit',    label: '🔥 Firepit',     hotkey: 'J' },
  { key: 'well',       label: '🪣 Well',        hotkey: 'K' },
  { key: 'farm',       label: '🌱 Farm',        hotkey: 'L' },
];

function costLabel(key) {
  const c = BUILDING_COSTS[key];
  if (!c) return '';
  return Object.entries(c).map(([r, n]) => `${n}${r === 'wood' ? '🪵' : '🪨'}`).join(' ');
}

export default function HUD({ data, onSetBuildMode, onUseItem }) {
  const {
    hp, maxHp, hunger, water, stamina, infected,
    inventory, hasSunStone, level, xp,
    buildMode, wave, totalWaves, wavePhase, waveTimer, zombiesLeft,
    alerts,
  } = data;

  const xpNeeded = level * 100;

  return (
    <div className="hud-root">
      {/* ── Top bar ── */}
      <div className="hud-top">
        <div className="stats-panel">
          {infected && <div className="infected-badge">☣ INFECTED</div>}
          <StatBar label="❤️" value={hp} max={maxHp} type="hp" />
          <StatBar label="🍖" value={hunger} max={100} type="hunger" warn={hunger < 20} />
          <StatBar label="💧" value={water}  max={100} type="water"  warn={water  < 20} />
          <StatBar label="⚡" value={stamina} max={100} type="stamina" />
          <div className="xp-bar-wrap">
            <span className="stat-label">LVL {level}</span>
            <div className="stat-bar-bg" style={{ background: '#332200' }}>
              <div className="stat-bar-fill" style={{ width: `${(xp / xpNeeded) * 100}%`, background: '#ffdd00' }} />
            </div>
          </div>
        </div>

        <div className="wave-panel">
          {wavePhase === 'rest' ? (
            <>
              <div className="wave-label">WAVE {wave} / {totalWaves}</div>
              <div className="wave-next">Next wave in <span>{(waveTimer / 1000).toFixed(0)}s</span></div>
            </>
          ) : wavePhase === 'active' ? (
            <>
              <div className="wave-label wave-active">⚔ WAVE {wave} / {totalWaves}</div>
              <div className="wave-remaining">Zombies: <span>{zombiesLeft}</span></div>
            </>
          ) : null}
        </div>
      </div>

      {/* ── Alerts ── */}
      <div className="alerts-panel">
        {alerts.map((a, i) => (
          <div key={i} className="alert-item" style={{ opacity: Math.min(1, a.timer / 800) }}>
            {a.msg}
          </div>
        ))}
      </div>

      {/* ── Bottom left: Inventory ── */}
      <div className="hud-bottom-left">
        <div className="panel-title">INVENTORY</div>
        <div className="inventory-grid">
          {[
            { key: 'food',      icon: '🌿', label: 'Food',    hotkey: '1' },
            { key: 'water_jug', icon: '💧', label: 'Water',   hotkey: '2' },
            { key: 'meat',      icon: '🥩', label: 'Meat',    hotkey: '3' },
            { key: 'wood',      icon: '🪵', label: 'Wood',    hotkey: '' },
            { key: 'stone',     icon: '🪨', label: 'Stone',   hotkey: '' },
            { key: 'sun_stone', icon: '⭐', label: 'SunStone',hotkey: '4' },
          ].map(item => (
            <div
              key={item.key}
              className={`inv-slot ${item.key === 'sun_stone' && hasSunStone ? 'sun-stone-slot' : ''}`}
              onClick={() => item.hotkey && onUseItem(item.key)}
              title={item.hotkey ? `Use [${item.hotkey}]` : item.label}
            >
              <span className="inv-icon">{item.icon}</span>
              <span className="inv-count">{inventory[item.key] || 0}</span>
              {item.hotkey && <span className="inv-hotkey">[{item.hotkey}]</span>}
            </div>
          ))}
        </div>
        <div className="hint-text">Click or hotkey to use consumables</div>
      </div>

      {/* ── Bottom right: Build menu ── */}
      <div className="hud-bottom-right">
        <div className="panel-title">BUILD <span style={{ fontSize: '10px', color: '#888' }}>ESC to cancel</span></div>
        <div className="build-grid">
          {BUILD_ITEMS.map(b => {
            const inv = inventory;
            const cost = BUILDING_COSTS[b.key];
            const affordable = cost && Object.entries(cost).every(([r, n]) => (inv[r] || 0) >= n);
            return (
              <div
                key={b.key}
                className={`build-slot ${buildMode === b.key ? 'build-active' : ''} ${!affordable ? 'build-unaffordable' : ''}`}
                onClick={() => onSetBuildMode(buildMode === b.key ? null : b.key)}
                title={`${b.label} — Cost: ${costLabel(b.key)}`}
              >
                <div className="build-label">{b.label}</div>
                <div className="build-cost">{costLabel(b.key)}</div>
                <div className="build-hotkey">[{b.hotkey}]</div>
              </div>
            );
          })}
        </div>
        <div className="hint-text">Left click to place • Right click cancel</div>
      </div>

      {/* ── Sun Stone notice ── */}
      {hasSunStone && (
        <div className="sun-stone-notice">
          ⭐ SUN STONE EQUIPPED — You can now damage the Plague Lord!
        </div>
      )}

      {/* ── Controls hint ── */}
      <div className="controls-hint">
        WASD Move • Shift Run • Left Click Attack/Build • Right Click Cancel Build
      </div>
    </div>
  );
}
