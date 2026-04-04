import { useState, useMemo } from 'react';
import useGameStore from '../stores/gameStore';
import { STAT_LABELS, STAT_ICONS } from '../components/StatBar';
import { resolveChallenge, CHALLENGE_SCENARIOS } from '../engine/challengeEngine';
import { pick, shuffle } from '../utils/random';

const STAT_ORDER = ['ath', 'soc', 'snk', 'lead', 'cut', 'res', 'per'];

export default function ChallengeScreen() {
  const {
    player, contestants, day,
    setImmunity, setChallengeResult, grantStatPoint, setScreen,
  } = useGameStore();

  const [phase, setPhase] = useState('pick'); // pick | result
  const [scenario] = useState(() => pick(CHALLENGE_SCENARIOS));
  const availableStats = useMemo(() => shuffle([...STAT_ORDER]).slice(0, 3), []);
  const [result, setResult] = useState(null);
  const [narration, setNarration] = useState('');

  const handleStatPick = (statKey) => {
    const challengeResult = resolveChallenge(
      player.stats[statKey], statKey, contestants, player.id
    );

    setResult(challengeResult);
    setImmunity(challengeResult.winnerId);
    setChallengeResult(challengeResult);

    if (challengeResult.playerWon) {
      grantStatPoint(1);
    }

    const winLines = [
      'Management is impressed. You\'re untouchable this week.',
      'The board nods approvingly. Nobody\'s touching you this round.',
      'You crushed it. Your position is secure — for now.',
    ];
    const loseLines = [
      `${challengeResult.winnerName} nails it and earns the board's protection.`,
      `${challengeResult.winnerName} edges you out. They're safe this week.`,
      `${challengeResult.winnerName} delivers a flawless performance. Untouchable.`,
    ];
    setNarration(pick(challengeResult.playerWon ? winLines : loseLines));
    setPhase('result');
  };

  return (
    <div className="flex-1 flex flex-col p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-earth-100">📊 Performance Review</h1>
        <p className="text-sm text-earth-600 mt-1">Week {day}</p>
      </div>

      {/* Scenario */}
      <p className="text-sm text-earth-300 italic font-serif bg-earth-800 border border-earth-700 rounded-lg p-4 mb-6">{scenario.text}</p>

      {/* Stat pick */}
      {phase === 'pick' && (
        <div className="fade-in">
          <p className="text-sm text-earth-300 mb-4 text-center">
            Choose which skill to compete with:
          </p>
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
          {/* Winner banner */}
          <div className={`text-center py-4 mb-4 rounded-lg border ${
            result.playerWon
              ? 'bg-torch/10 border-torch'
              : 'bg-earth-800 border-earth-700'
          }`}>
            <p className="text-lg font-bold text-earth-100">
              {result.playerWon ? '🏆 Top Performer!' : `🏆 ${result.winnerName} Wins`}
            </p>
            {!result.playerWon && (
              <p className="text-xs text-earth-600 mt-1">
                You placed #{result.playerRank} of {result.rankings.length}
              </p>
            )}
            {result.playerWon && (
              <p className="text-xs text-jungle-light mt-1">+1 bonus stat point</p>
            )}
          </div>

          <p className="text-sm text-earth-300 italic font-serif bg-earth-800 border border-earth-700 rounded-lg p-4 mb-4">{narration}</p>

          {/* Top 5 results */}
          <div className="bg-earth-800 border border-earth-700 rounded-lg p-3 mb-6">
            <p className="text-xs text-earth-600 mb-2">Results</p>
            {result.rankings.slice(0, 5).map((r, i) => (
              <div key={r.id} className={`flex justify-between text-sm py-1 ${
                r.isPlayer ? 'text-torch font-bold' : 'text-earth-300'
              }`}>
                <span>#{i + 1} {r.name}</span>
                <span className="text-earth-600">{r.score}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setScreen('tribal')}
            className="w-full bg-earth-800 hover:bg-earth-700 text-earth-100 font-bold py-3 rounded-lg border border-earth-700 transition-colors active:scale-95"
          >
            🏛️ Head to Board Meeting
          </button>
        </div>
      )}
    </div>
  );
}
