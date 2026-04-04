import { useState, useEffect, useRef } from 'react';

const TOTAL_ROUNDS = 5;

export default function ReactionTap({ onComplete }) {
  const [phase, setPhase] = useState('ready'); // ready | waiting | tap | result | done
  const [round, setRound] = useState(0);
  const [times, setTimes] = useState([]);
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 });
  const [showTime, setShowTime] = useState(null);
  const [tooEarly, setTooEarly] = useState(false);
  const startRef = useRef(null);
  const timerRef = useRef(null);

  const startRound = () => {
    setTooEarly(false);
    setPhase('waiting');
    // Random delay 1-3 seconds
    const delay = 1000 + Math.random() * 2000;
    timerRef.current = setTimeout(() => {
      setTargetPos({
        x: 15 + Math.random() * 70,
        y: 15 + Math.random() * 70,
      });
      startRef.current = Date.now();
      setPhase('tap');
    }, delay);
  };

  const handleTap = () => {
    if (phase === 'waiting') {
      // Too early!
      clearTimeout(timerRef.current);
      setTooEarly(true);
      setPhase('result');
      setShowTime(999);
      setTimes([...times, 999]);
      return;
    }
    if (phase !== 'tap') return;

    const elapsed = Date.now() - startRef.current;
    setShowTime(elapsed);
    setTimes([...times, elapsed]);
    setPhase('result');
  };

  const handleNext = () => {
    const nextRound = round + 1;
    if (nextRound >= TOTAL_ROUNDS) {
      // Calculate score
      const validTimes = times.filter((t) => t < 900);
      const avg = validTimes.length > 0
        ? validTimes.reduce((a, b) => a + b, 0) / validTimes.length
        : 999;
      // Score: 100 = 300ms avg, 0 = 1000ms+ avg (generous scaling)
      const score = Math.round(Math.max(0, Math.min(100, (1000 - avg) / 7)));
      setPhase('done');
      setTimeout(() => onComplete(score), 500);
    } else {
      setRound(nextRound);
      startRound();
    }
  };

  return (
    <div>
      <div className="flex justify-between text-xs text-earth-600 mb-3">
        <span>Round {round + 1}/{TOTAL_ROUNDS}</span>
        <span>{times.filter((t) => t < 900).length} clean taps</span>
      </div>

      {phase === 'ready' && (
        <div className="text-center py-12">
          <p className="text-sm text-earth-300 mb-4">Tap the target as fast as it appears. Don't tap too early!</p>
          <button
            onClick={startRound}
            className="bg-torch hover:bg-torch-dim text-earth-900 font-bold py-3 px-8 rounded-lg active:scale-95"
          >
            Start
          </button>
        </div>
      )}

      {phase === 'waiting' && (
        <div
          className="relative bg-earth-800 rounded-lg border border-earth-700 cursor-pointer"
          style={{ height: '250px' }}
          onClick={handleTap}
        >
          <p className="absolute inset-0 flex items-center justify-center text-sm text-earth-600 animate-pulse">
            Wait for it...
          </p>
        </div>
      )}

      {phase === 'tap' && (
        <div
          className="relative bg-earth-800 rounded-lg border border-earth-700 cursor-pointer"
          style={{ height: '250px' }}
          onClick={handleTap}
        >
          <div
            className="absolute w-12 h-12 bg-torch rounded-full flex items-center justify-center text-earth-900 font-bold animate-pulse"
            style={{ left: `${targetPos.x}%`, top: `${targetPos.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            TAP
          </div>
        </div>
      )}

      {phase === 'result' && (
        <div className="text-center py-8">
          {tooEarly ? (
            <p className="text-lg font-bold text-ember mb-2">Too early!</p>
          ) : (
            <>
              <p className="text-3xl font-bold text-earth-100 mb-1">{showTime}ms</p>
              <p className={`text-sm ${showTime < 400 ? 'text-jungle-light' : showTime < 600 ? 'text-sand' : 'text-ember'}`}>
                {showTime < 400 ? 'Lightning!' : showTime < 600 ? 'Good' : 'Slow'}
              </p>
            </>
          )}
          <button
            onClick={handleNext}
            className="mt-4 bg-earth-700 hover:bg-earth-600 text-earth-100 font-medium py-2 px-6 rounded-lg active:scale-95"
          >
            {round + 1 >= TOTAL_ROUNDS ? 'See Score' : 'Next →'}
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
