import { useState, useEffect, useRef } from 'react';

const EMOJIS = ['📊', '💼', '☕', '📱', '🖥️', '📋'];

function generateBoard() {
  const pairs = [...EMOJIS, ...EMOJIS];
  // Fisher-Yates shuffle
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
  const [gameOver, setGameOver] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (matches >= 6) {
      const elapsed = (Date.now() - startTime) / 1000;
      // Score: lower is better. Convert to 0-100 scale (100 = perfect)
      const timeScore = Math.max(0, 100 - elapsed * 2);
      const moveScore = Math.max(0, 100 - (moves - 6) * 5); // 6 moves = perfect
      const score = Math.round((timeScore + moveScore) / 2);
      setGameOver(true);
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
        // Match!
        setTimeout(() => {
          setCards((prev) => prev.map((c, i) =>
            i === a || i === b ? { ...c, matched: true } : c
          ));
          setMatches((m) => m + 1);
          setSelected([]);
        }, 300);
      } else {
        // No match — flip back
        timeoutRef.current = setTimeout(() => {
          setCards((prev) => prev.map((c, i) =>
            i === a || i === b ? { ...c, flipped: false } : c
          ));
          setSelected([]);
        }, 800);
      }
    }
  };

  return (
    <div>
      <div className="flex justify-between text-xs text-earth-600 mb-3">
        <span>Moves: {moves}</span>
        <span>Matched: {matches}/6</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {cards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleFlip(card.id)}
            className={`aspect-square rounded-lg text-xl flex items-center justify-center transition-all ${
              card.matched
                ? 'bg-jungle/20 border border-jungle/30'
                : card.flipped
                  ? 'bg-torch/20 border border-torch/30'
                  : 'bg-earth-700 border border-earth-600 hover:bg-earth-600 active:scale-90'
            }`}
          >
            {card.flipped || card.matched ? card.emoji : '?'}
          </button>
        ))}
      </div>
    </div>
  );
}
