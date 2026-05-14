import React, { useState, useCallback } from 'react';
import StartScreen from './components/StartScreen.jsx';
import GameCanvas from './components/GameCanvas.jsx';
import GameOverScreen from './components/GameOverScreen.jsx';
import VictoryScreen from './components/VictoryScreen.jsx';

export default function App() {
  const [phase, setPhase] = useState('start'); // 'start' | 'playing' | 'dead' | 'victory'
  const [gameKey, setGameKey] = useState(0);

  const restart = useCallback(() => {
    setGameKey(k => k + 1);
    setPhase('playing');
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {phase === 'start'   && <StartScreen onStart={() => setPhase('playing')} />}
      {phase === 'playing' && (
        <GameCanvas
          key={gameKey}
          onDead={()    => setPhase('dead')}
          onVictory={() => setPhase('victory')}
        />
      )}
      {phase === 'dead'    && <GameOverScreen onRestart={restart} />}
      {phase === 'victory' && <VictoryScreen  onRestart={restart} />}
    </div>
  );
}
