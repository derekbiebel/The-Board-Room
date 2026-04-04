import { useState, useEffect, useRef } from 'react';

const GRID_SIZE = 9; // 3x3

export default function SequenceMemory({ onComplete }) {
  const [sequence, setSequence] = useState([]);
  const [playerInput, setPlayerInput] = useState([]);
  const [phase, setPhase] = useState('ready'); // ready | showing | input | wrong | done
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [level, setLevel] = useState(0);
  const [bestLevel, setBestLevel] = useState(0);
  const timerRef = useRef(null);

  const startLevel = (lvl) => {
    const newSeq = [];
    for (let i = 0; i <= lvl + 2; i++) { // starts at 3 tiles
      newSeq.push(Math.floor(Math.random() * GRID_SIZE));
    }
    setSequence(newSeq);
    setPlayerInput([]);
    setPhase('showing');

    // Show sequence
    let i = 0;
    const show = () => {
      if (i < newSeq.length) {
        setHighlightIndex(newSeq[i]);
        timerRef.current = setTimeout(() => {
          setHighlightIndex(-1);
          timerRef.current = setTimeout(() => {
            i++;
            show();
          }, 200);
        }, 500);
      } else {
        setHighlightIndex(-1);
        setPhase('input');
      }
    };
    setTimeout(show, 500);
  };

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleTileTap = (index) => {
    if (phase !== 'input') return;

    const nextInput = [...playerInput, index];
    setPlayerInput(nextInput);
    setHighlightIndex(index);
    setTimeout(() => setHighlightIndex(-1), 150);

    const step = nextInput.length - 1;
    if (nextInput[step] !== sequence[step]) {
      // Wrong!
      setBestLevel(Math.max(bestLevel, level));
      setPhase('wrong');
      return;
    }

    if (nextInput.length === sequence.length) {
      // Correct! Next level
      const nextLevel = level + 1;
      setBestLevel(Math.max(bestLevel, nextLevel));
      if (nextLevel >= 7) {
        // Max level reached
        setPhase('done');
        const score = Math.round(Math.min(100, nextLevel * 14));
        setTimeout(() => onComplete(score), 500);
      } else {
        setLevel(nextLevel);
        setTimeout(() => startLevel(nextLevel), 800);
      }
    }
  };

  const handleFinish = () => {
    const score = Math.round(Math.min(100, bestLevel * 14)); // 7 levels = 98, max 100
    setPhase('done');
    setTimeout(() => onComplete(score), 500);
  };

  return (
    <div>
      <div className="flex justify-between text-xs text-earth-600 mb-3">
        <span>Level {level + 1}</span>
        <span>{sequence.length} tiles to remember</span>
      </div>

      {phase === 'ready' && (
        <div className="text-center py-8">
          <p className="text-sm text-earth-300 mb-4">Watch the pattern, then repeat it. Gets harder each round.</p>
          <button
            onClick={() => startLevel(0)}
            className="bg-torch hover:bg-torch-dim text-earth-900 font-bold py-3 px-8 rounded-lg active:scale-95"
          >
            Start
          </button>
        </div>
      )}

      {(phase === 'showing' || phase === 'input') && (
        <div>
          <p className="text-xs text-earth-600 text-center mb-3">
            {phase === 'showing' ? 'Watch carefully...' : 'Your turn — repeat the pattern'}
          </p>
          <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
            {Array.from({ length: GRID_SIZE }, (_, i) => (
              <button
                key={i}
                onClick={() => handleTileTap(i)}
                disabled={phase !== 'input'}
                className={`aspect-square rounded-lg transition-all ${
                  highlightIndex === i
                    ? 'bg-torch scale-95'
                    : phase === 'input'
                      ? 'bg-earth-700 hover:bg-earth-600 active:scale-90 active:bg-torch'
                      : 'bg-earth-700'
                }`}
              />
            ))}
          </div>
          {phase === 'input' && (
            <p className="text-xs text-earth-600 text-center mt-2">
              {playerInput.length}/{sequence.length}
            </p>
          )}
        </div>
      )}

      {phase === 'wrong' && (
        <div className="text-center py-8">
          <p className="text-lg font-bold text-ember mb-1">Wrong!</p>
          <p className="text-sm text-earth-600 mb-4">You made it to level {level + 1} ({sequence.length} tiles)</p>
          <button
            onClick={handleFinish}
            className="bg-earth-700 hover:bg-earth-600 text-earth-100 font-medium py-2 px-6 rounded-lg active:scale-95"
          >
            See Score
          </button>
        </div>
      )}

      {phase === 'done' && (
        <div className="text-center py-8">
          <div className="text-torch animate-pulse text-lg">Calculating...</div>
        </div>
      )}
    </div>
  );
}
