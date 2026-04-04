import { useState, useEffect, useRef } from 'react';

const EMOJIS = ['📊', '💼', '☕', '📱', '🖥️', '📋', '📎', '🗂️', '💡', '🔑'];
const TOTAL_PAIRS = 10;
const TIME_LIMIT = 45; // seconds

function generateBoard() {
  const pairs = [...EMOJIS, ...EMOJIS];
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs.map((emoji, i) => ({ id: i, emoji, flipped: false, matched: false }));
}

export default function MemoryMatch({ onComplete }) {
  const [cards, setCards] = useState(() => generateBoard());
  const [selected, setSelected] = useState([]);
  const [moves, setMoves] = useState(0);
  const [matches, setMatches] = useState(0);
  const [startTime] = useState(Date.now());
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [gameOver, setGameOver] = useState(false);
  const timerRef = useRef(null);

  // Countdown timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, TIME_LIMIT - elapsed);
      setTimeLeft(Math.ceil(remaining));
      if (remaining <= 0 && !gameOver) {
        setGameOver(true);
        clearInterval(timerRef.current);
        // Time's up — score based on what you matched
        const score = Math.round((matches / TOTAL_PAIRS) * 60); // partial credit
        setTimeout(() => onComplete(score), 500);
      }
    }, 200);
    return () => clearInterval(timerRef.current);
  }, [matches, gameOver]);

  useEffect(() => {
    if (matches >= TOTAL_PAIRS && !gameOver) {
      setGameOver(true);
      clearInterval(timerRef.current);
      const elapsed = (Date.now() - startTime) / 1000;
      // Score: time bonus + move efficiency
      const timeScore = Math.max(0, 50 - elapsed); // 50 points max for speed
      const moveScore = Math.max(0, 50 - (moves - TOTAL_PAIRS) * 3); // 10 perfect moves = 50pts
      const score = Math.round(Math.min(100, timeScore + moveScore));
      setTimeout(() => onComplete(score), 500);
    }
  }, [matches]);

  const handleFlip = (id) => {
    if (gameOver) return;
    if (selected.length >= 2) return;
    if (cards[id].matched || cards[id].flipped) return;

    const newCards = [...cards];
    newCards[id] = { ...newCards[id], flipped: true };
    setCards(newCards);

    const newSelected = [...selected, id];
    setSelected(newSelected);

    if (newSelected.length === 2) {
      setMoves(moves + 1);
      const [a, b] = newSelected;
      if (newCards[a].emoji === newCards[b].emoji) {
        setTimeout(() => {
          setCards((prev) => prev.map((c, i) =>
            i === a || i === b ? { ...c, matched: true } : c
          ));
          setMatches((m) => m + 1);
          setSelected([]);
        }, 200);
      } else {
        setTimeout(() => {
          setCards((prev) => prev.map((c, i) =>
            i === a || i === b ? { ...c, flipped: false } : c
          ));
          setSelected([]);
        }, 600);
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between text-xs mb-3">
        <span className="text-earth-600">Moves: {moves}</span>
        <span className="text-earth-600">Matched: {matches}/{TOTAL_PAIRS}</span>
        <span className={`font-bold ${timeLeft <= 10 ? 'text-ember animate-pulse' : 'text-earth-300'}`}>
          {timeLeft}s
        </span>
      </div>
      <div className="grid grid-cols-5 gap-1.5">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleFlip(card.id)}
            className={`aspect-square rounded-lg text-lg flex items-center justify-center transition-all ${
              card.matched
                ? 'bg-jungle/20 border border-jungle/30 scale-90'
                : card.flipped
                  ? 'bg-torch/20 border border-torch/30'
                  : 'bg-earth-700 border border-earth-600 hover:bg-earth-600 active:scale-90'
            }`}
          >
            {card.flipped || card.matched ? card.emoji : ''}
          </button>
        ))}
      </div>
    </div>
  );
}
