import { useState, useMemo } from 'react';
import useGameStore from '../stores/gameStore';
import { STAT_LABELS, STAT_ICONS } from '../components/StatBar';
import { ARCHETYPES } from '../data/archetypes';
import { resolveChallenge, CHALLENGE_SCENARIOS } from '../engine/challengeEngine';
import { pick, shuffle } from '../utils/random';

const STAT_ORDER = ['ath', 'soc', 'snk', 'lead', 'cut', 'res', 'per'];

export default function FinalChallengeScreen() {
  const { player, contestants, day, setImmunity, setScreen } = useGameStore();

  const [phase, setPhase] = useState('intro'); // intro | pick | result | cut
  const [scenario] = useState(() => pick(CHALLENGE_SCENARIOS));
  const availableStats = useMemo(() => shuffle([...STAT_ORDER]).slice(0, 3), []);
  const [result, setResult] = useState(null);

  const active = contestants.filter((c) => !c.isEliminated);

  const handleStatPick = (statKey) => {
    const challengeResult = resolveChallenge(
      player.stats[statKey], statKey, contestants, player.id
    );
    setResult(challengeResult);
    setImmunity(challengeResult.winnerId);
    setPhase('result');
  };

  const handleCut = (contestantId) => {
    const store = useGameStore.getState();
    store.eliminateContestant(contestantId);
    // Check if we need to cut more (need exactly 2 NPCs remaining for 3 finalists)
    const remaining = store.contestants.filter((c) => !c.isEliminated).length;
    if (remaining > 2) {
      // Need to cut more — stay on cut screen (force re-render)
      setPhase('cut');
    } else {
      setScreen('finalTribal');
    }
  };

  // Recalculate cuttable from current store state for each render
  const currentContestants = useGameStore((s) => s.contestants);
  const currentActive = currentContestants.filter((c) => !c.isEliminated);
  const cuttable = currentActive.filter((c) => {
    if (result && c.id === result.winnerId) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col p-4">
      {/* Intro */}
      {phase === 'intro' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center fade-in">
          <div className="text-4xl mb-4">🏆</div>
          <h1 className="text-2xl font-bold text-earth-100 mb-2">Final Performance Review</h1>
          <p className="text-sm text-earth-300 mb-2">4 employees remain. This is it.</p>
          <p className="text-sm text-earth-600 mb-8">
            Win this challenge and you choose who makes the final three.
          </p>
          <button
            onClick={() => setPhase('pick')}
            className="bg-torch hover:bg-torch-dim text-earth-900 font-bold py-3 px-8 rounded-lg transition-colors active:scale-95"
          >
            Begin
          </button>
        </div>
      )}

      {/* Stat pick */}
      {phase === 'pick' && (
        <div className="fade-in">
          <h1 className="text-xl font-bold text-earth-100 text-center mb-2">Final Challenge</h1>
          <p className="text-sm text-earth-300 italic font-serif bg-earth-800 border border-earth-700 rounded-lg p-4 mb-6">
            {scenario.text}
          </p>
          <p className="text-sm text-earth-300 mb-4 text-center">Choose your approach:</p>
          <div className="space-y-2">
            {availableStats.map((stat) => (
              <button
                key={stat}
                onClick={() => handleStatPick(stat)}
                className="w-full bg-earth-800 border border-earth-700 rounded-lg p-3 flex items-center justify-between hover:border-torch transition-colors active:scale-[0.98]"
              >
                <span className="text-sm text-earth-100">
                  {STAT_ICONS[stat]} {STAT_LABELS[stat]}
                </span>
                <span className="text-sm font-bold text-torch">{player.stats[stat]}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {phase === 'result' && result && (
        <div className="fade-in">
          <div className={`text-center py-4 mb-4 rounded-lg border ${
            result.playerWon ? 'bg-torch/10 border-torch' : 'bg-earth-800 border-earth-700'
          }`}>
            <p className="text-lg font-bold text-earth-100">
              {result.playerWon ? '🏆 You Win!' : `🏆 ${result.winnerName} Wins`}
            </p>
            <p className="text-xs text-earth-600 mt-1">
              {result.playerWon
                ? 'You choose who makes the final three.'
                : `${result.winnerName} will decide who to cut.`
              }
            </p>
          </div>

          {/* Rankings */}
          <div className="bg-earth-800 border border-earth-700 rounded-lg p-3 mb-6">
            {result.rankings.slice(0, 4).map((r, i) => (
              <div key={r.id} className={`flex justify-between text-sm py-1 ${
                r.isPlayer ? 'text-torch font-bold' : 'text-earth-300'
              }`}>
                <span>#{i + 1} {r.name}</span>
                <span className="text-earth-600">{r.score}</span>
              </div>
            ))}
          </div>

          {result.playerWon ? (
            <button
              onClick={() => setPhase('cut')}
              className="w-full bg-torch hover:bg-torch-dim text-earth-900 font-bold py-3 rounded-lg transition-colors active:scale-95"
            >
              Choose Who to Cut
            </button>
          ) : (
            <button
              onClick={() => {
                // NPC winner cuts people until 2 NPCs remain
                const store = useGameStore.getState();
                const winner = store.contestants.find((c) => c.id === result.winnerId);

                while (true) {
                  const remaining = store.contestants.filter((c) => !c.isEliminated);
                  if (remaining.length <= 2) break;

                  // Pick who they like least
                  let worstId = null;
                  let worstRel = Infinity;
                  for (const other of remaining) {
                    if (other.id === result.winnerId) continue;
                    const rel = winner?.relationships?.[other.id] || 0;
                    if (rel < worstRel) { worstRel = rel; worstId = other.id; }
                  }
                  // Consider player
                  const playerRel = winner?.relationships?.[player.id] || 0;
                  if (playerRel < worstRel) {
                    // NPC cuts the player — game over
                    setScreen('gameOver');
                    return;
                  }
                  if (worstId) {
                    store.eliminateContestant(worstId);
                  } else {
                    break;
                  }
                }
                setScreen('finalTribal');
              }}
              className="w-full bg-earth-800 hover:bg-earth-700 text-earth-100 font-bold py-3 rounded-lg border border-earth-700 transition-colors active:scale-95"
            >
              See {result.winnerName}'s Decision
            </button>
          )}
        </div>
      )}

      {/* Player chooses who to cut */}
      {phase === 'cut' && (
        <div className="fade-in">
          <h2 className="text-lg font-bold text-earth-100 text-center mb-2">Who Gets Cut?</h2>
          <p className="text-sm text-earth-600 text-center mb-4">
            Choose one person to eliminate. The remaining three face the jury.
          </p>
          <div className="space-y-2">
            {cuttable.map((c) => {
              const rel = player.relationships[c.id] || 0;
              const arch = contestants.find((x) => x.id === c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => handleCut(c.id)}
                  className="w-full bg-earth-800 border border-earth-700 rounded-lg p-4 flex items-center gap-3 hover:border-ember transition-colors active:scale-[0.98]"
                >
                  <span className="text-xl">{ARCHETYPES[c.archetype]?.emoji || '👤'}</span>
                  <div className="flex-1 text-left">
                    <div className="text-sm font-medium text-earth-100">{c.name}</div>
                  </div>
                  <span className={`text-sm font-medium ${
                    rel >= 1 ? 'text-jungle' : rel <= -1 ? 'text-ember' : 'text-earth-600'
                  }`}>
                    {rel > 0 ? '+' : ''}{rel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
