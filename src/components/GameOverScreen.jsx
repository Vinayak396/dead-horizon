import React from 'react';

export default function GameOverScreen({ onRestart }) {
  return (
    <div className="screen game-over-screen">
      <div className="go-content">
        <div className="go-skull">💀</div>
        <h1 className="go-title">YOU DIED</h1>
        <p className="go-sub">The dead consumed you.</p>
        <p className="go-sub dim">The world remains in darkness...</p>
        <button className="start-btn red-btn" onClick={onRestart}>↺ Try Again</button>
      </div>
    </div>
  );
}
