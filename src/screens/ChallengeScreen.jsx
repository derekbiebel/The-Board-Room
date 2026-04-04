import { useState, useMemo } from 'react';
import useGameStore from '../stores/gameStore';
import { pick, randInt } from '../utils/random';
import MemoryMatch from '../components/MemoryMatch';
import ReactionTap from '../components/ReactionTap';
import SequenceMemory from '../components/SequenceMemory';

const MINIGAMES = [
  {
    key: 'memory',
    name: 'Memory Match',
    desc: 'Flip cards and match pairs. Speed and accuracy matter.',
    icon: '🃏',
    Component: MemoryMatch,
  },
  {
    key: 'reaction',
    name: 'Reaction Test',
    desc: 'Tap the target the instant it appears. Don\'t jump the gun.',
    icon: '⚡',
    Component: ReactionTap,
  },
  {
    key: 'sequence',
    name: 'Sequence Memory',
    desc: 'Watch the pattern. Repeat it. It gets harder each round.',
    icon: '🧠',
    Component: SequenceMemory,
  },
];

export default function ChallengeScreen() {
  const {
    player, contestants, day, hasDoubleVote,
    setImmunity, setChallengeResult, grantDoubleVote, setScreen,
  } = useGameStore();

  const active = contestants.filter((c) => !c.isEliminated);
  const [minigame] = useState(() => pick(MINIGAMES));
  const [phase, setPhase] = useState('intro'); // intro | playing | result
  const [playerScore, setPlayerScore] = useState(null);
  const [npcScores, setNpcScores] = useState([]);

  // Simulate NPC scores based on their stats
  const simulateNpcScores = () => {
    return active.map((c) => {
      const avgStat = Object.values(c.stats).reduce((a, b) => a + b, 0) / 7;
      // NPC score: 30-75 based on stats + randomness
      const score = Math.round(30 + (avgStat * 4) + randInt(-10, 10));
      return { id: c.id, name: c.name, score: Math.min(95, Math.max(20, score)) };
    }).sort((a, b) => b.score - a.score);
  };

  const handleComplete = (score) => {
    setPlayerScore(score);
    const npcs = simulateNpcScores();
    setNpcScores(npcs);

    // Determine rank
    const allScores = [{ id: player.id, name: 'You', score, isPlayer: true }, ...npcs.map((n) => ({ ...n, isPlayer: false }))];
    allScores.sort((a, b) => b.score - a.score);
    const rank = allScores.findIndex((s) => s.isPlayer) + 1;
    const won = rank === 1;
    const closeLoss = rank === 2;

    setImmunity(won ? 'player' : npcs[0].id);
    setChallengeResult({ playerWon: won, rank, closeLoss });

    if (closeLoss && !hasDoubleVote) {
      grantDoubleVote();
    }

    setPhase('result');
  };

  return (
    <div className="flex-1 flex flex-col p-4">
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-earth-100">📊 Performance Review</h1>
        <p className="text-sm text-earth-600 mt-1">Week {day}</p>
      </div>

      {/* Intro */}
      {phase === 'intro' && (
        <div className="flex-1 flex flex-col fade-in">
          <div className="text-center py-6 mb-4">
            <div className="text-4xl mb-3">{minigame.icon}</div>
            <h2 className="text-lg font-bold text-earth-100 mb-1">{minigame.name}</h2>
            <p className="text-sm text-earth-300">{minigame.desc}</p>
          </div>

          <div className="bg-earth-800 border border-earth-700 rounded-lg p-4 mb-6">
            <div className="space-y-1.5 text-xs text-earth-300">
              <p>Your score competes against all remaining employees.</p>
              <p>Highest score wins immunity — safe from this week's board meeting.</p>
              <p className="text-sand">2nd place earns a Double Vote token as consolation.</p>
            </div>
          </div>

          <button
            onClick={() => setPhase('playing')}
            className="w-full bg-torch hover:bg-torch-dim text-earth-900 font-bold py-3 rounded-lg transition-colors active:scale-95"
          >
            Begin
          </button>
        </div>
      )}

      {/* Playing */}
      {phase === 'playing' && (
        <div className="flex-1 fade-in">
          <minigame.Component onComplete={handleComplete} />
        </div>
      )}

      {/* Result */}
      {phase === 'result' && playerScore !== null && (
        <div className="fade-in">
          {(() => {
            const allScores = [
              { id: player.id, name: 'You', score: playerScore, isPlayer: true },
              ...npcScores.map((n) => ({ ...n, isPlayer: false })),
            ].sort((a, b) => b.score - a.score);
            const rank = allScores.findIndex((s) => s.isPlayer) + 1;
            const won = rank === 1;
            const closeLoss = rank === 2;

            return (
              <>
                <div className={`text-center py-4 mb-4 rounded-lg border ${
                  won ? 'bg-torch/10 border-torch' : 'bg-earth-800 border-earth-700'
                }`}>
                  <p className="text-2xl font-bold text-earth-100 mb-1">
                    {won ? '🏆 Immunity Won!' : `#${rank} — ${closeLoss ? 'Close!' : 'Not This Time'}`}
                  </p>
                  <p className="text-sm text-earth-600">
                    Your score: <span className="text-torch font-bold">{playerScore}</span>
                  </p>
                  {won && (
                    <p className="text-xs text-jungle-light mt-1">You're safe this week</p>
                  )}
                  {closeLoss && !hasDoubleVote && (
                    <p className="text-xs text-torch mt-1">⚡ Consolation: Double Vote Token earned</p>
                  )}
                </div>

                <p className="text-sm text-earth-300 italic font-serif bg-earth-800 border border-earth-700 rounded-lg p-4 mb-4">
                  {won
                    ? pick([
                        'Flawless performance. Management is impressed.',
                        'Nobody came close. Immunity is yours.',
                        'You crushed it. Untouchable this week.',
                      ])
                    : closeLoss
                      ? pick([
                          'Almost had it. The double vote token is a nice consolation.',
                          'So close. But you\'ve got a weapon for the board meeting.',
                        ])
                      : pick([
                          'Not your day. Better rely on your alliances.',
                          'The competition was tough. No safety net this week.',
                        ])
                  }
                </p>

                {/* Leaderboard */}
                <div className="bg-earth-800 border border-earth-700 rounded-lg p-3 mb-6">
                  <p className="text-xs text-earth-600 mb-2">Rankings</p>
                  {allScores.slice(0, 5).map((s, i) => (
                    <div key={s.id} className={`flex justify-between text-sm py-1 ${
                      s.isPlayer ? 'text-torch font-bold' : 'text-earth-300'
                    }`}>
                      <span>#{i + 1} {s.name}</span>
                      <span className="text-earth-600">{s.score}</span>
                    </div>
                  ))}
                  {rank > 5 && (
                    <div className="text-torch font-bold text-sm py-1 mt-1 border-t border-earth-700">
                      #{rank} You — {playerScore}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => setScreen('tribal')}
                  className="w-full bg-earth-800 hover:bg-earth-700 text-earth-100 font-bold py-3 rounded-lg border border-earth-700 transition-colors active:scale-95"
                >
                  🏛️ Head to Board Meeting
                </button>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
