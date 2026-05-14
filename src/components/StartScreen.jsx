import React from 'react';

export default function StartScreen({ onStart }) {
  return (
    <div className="screen start-screen">
      <div className="start-bg-overlay" />
      <div className="start-content">
        <div className="start-skull">☠</div>
        <h1 className="start-title">DEAD HORIZON</h1>
        <p className="start-subtitle">A Zombie Apocalypse Survival</p>
        <div className="start-divider" />
        <div className="start-lore">
          <p>The world fell in silence. The dead walk again.</p>
          <p>You are the last survivor. Gather resources, build defenses,</p>
          <p>and survive 10 waves of the undead.</p>
          <p>Find the <span className="sun-stone-text">⭐ Sun Stone</span> to defeat the <span className="boss-text">Plague Lord</span>.</p>
        </div>
        <div className="controls-list">
          <div className="ctrl-row"><kbd>WASD</kbd> Move</div>
          <div className="ctrl-row"><kbd>Shift</kbd> Run</div>
          <div className="ctrl-row"><kbd>Click</kbd> Attack / Build</div>
          <div className="ctrl-row"><kbd>1-4</kbd> Use items</div>
          <div className="ctrl-row"><kbd>F G H J K L</kbd> Build modes</div>
        </div>
        <button className="start-btn" onClick={onStart}>
          ▶ BEGIN SURVIVAL
        </button>
      </div>
    </div>
  );
}
