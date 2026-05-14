import React, { useEffect, useState } from 'react';

export default function VictoryScreen({ onRestart }) {
  const [particles, setParticles] = useState([]);
  useEffect(() => {
    const arr = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      dur: 2 + Math.random() * 2,
    }));
    setParticles(arr);
  }, []);

  return (
    <div className="screen victory-screen">
      {particles.map(p => (
        <div key={p.id} className="confetti" style={{
          left: `${p.x}%`,
          animationDelay: `${p.delay}s`,
          animationDuration: `${p.dur}s`,
          background: ['#ffdd00','#ff4488','#44ffaa','#4488ff','#ff8844'][p.id % 5],
        }} />
      ))}
      <div className="victory-content">
        <div className="victory-icon">🌅</div>
        <h1 className="victory-title">HUMANITY RESTORED</h1>
        <p className="victory-sub">The Plague Lord has fallen.</p>
        <p className="victory-sub">As the Sun Stone's light washed over the undead,</p>
        <p className="victory-sub">one by one — they became <span className="human-text">human again</span>.</p>
        <p className="victory-sub dim">You saved the world, survivor.</p>
        <button className="start-btn gold-btn" onClick={onRestart}>↺ Play Again</button>
      </div>
    </div>
  );
}
