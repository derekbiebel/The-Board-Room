import { useState, useMemo } from 'react';
import useGameStore from '../stores/gameStore';
import { STAT_LABELS, STAT_ICONS } from '../components/StatBar';
import { ARCHETYPES } from '../data/archetypes';
import { pick, shuffle, randInt } from '../utils/random';

const STAT_ORDER = ['ath', 'soc', 'snk', 'lead', 'cut', 'res', 'per'];

function barColor(value) {
  if (value <= 2) return 'bg-ember';
  if (value <= 4) return 'bg-red-400';
  if (value <= 6) return 'bg-sand';
  if (value <= 8) return 'bg-jungle';
  return 'bg-jungle-light';
}

export default function ChallengeScreen() {
  const {
    player, contestants, day, hasDoubleVote,
    setImmunity, setChallengeResult, grantStatPoint, grantDoubleVote, setScreen,
  } = useGameStore();

  const active = contestants.filter((c) => !c.isEliminated);
  const knownInfo = player.knownInfo || {};

  // Pick 3 random opponents
  const opponents = useMemo(() => shuffle([...active]).slice(0, 3), []);

  const [phase, setPhase] = useState('intro'); // intro | matchup | result | final | reward
  const [round, setRound] = useState(0);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [roundResult, setRoundResult] = useState(null);
  const [usedStats, setUsedStats] = useState([]);

  // 3 random stats per matchup (excluding used)
  const availableStats = useMemo(() => {
    const remaining = STAT_ORDER.filter((s) => !usedStats.includes(s));
    return shuffle([...remaining]).slice(0, 3);
  }, [usedStats]);

  const currentOpponent = opponents[round];
  const opponentArch = currentOpponent ? ARCHETYPES[currentOpponent.archetype] : null;
  const opponentKnown = currentOpponent ? (knownInfo[currentOpponent.id] || {}) : {};

  const handleStatPick = (statKey) => {
    const playerScore = player.stats[statKey] + randInt(1, 3);
    const npcScore = (currentOpponent.stats[statKey] || 1) + randInt(1, 3);
    const won = playerScore >= npcScore;

    setRoundResult({
      statKey,
      playerScore,
      npcScore,
      won,
      opponentName: currentOpponent.name,
    });

    if (won) setWins(wins + 1);
    else setLosses(losses + 1);

    setUsedStats([...usedStats, statKey]);
    setPhase('result');
  };

  const handleNext = () => {
    // Check if we have a winner already (2 wins or 2 losses)
    const newRound = round + 1;
    if (wins >= 2 || losses >= 2 || newRound >= 3) {
      // Final
      const playerWon = wins >= 2;
      setImmunity(playerWon ? 'player' : null);
      setChallengeResult({ playerWon, wins, losses });
      setPhase('final');
    } else {
      setRound(newRound);
      setRoundResult(null);
      setPhase('matchup');
    }
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
          <div className="bg-earth-800 border border-earth-700 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-bold text-earth-100 mb-2">Head-to-Head Review</h3>
            <div className="space-y-1.5 text-xs text-earth-300">
              <p>You'll face 3 opponents one-on-one.</p>
              <p>Each matchup: choose a skill to compete with. Your score vs theirs.</p>
              <p>Win 2 of 3 to earn immunity.</p>
              <p className="text-sand">Use what you know about their stats to pick your advantage.</p>
            </div>
          </div>

          {/* Preview opponents */}
          <div className="bg-earth-800 border border-earth-700 rounded-lg p-4 mb-6">
            <p className="text-xs text-earth-600 mb-2">Your opponents:</p>
            {opponents.map((opp, i) => {
              const arch = ARCHETYPES[opp.archetype];
              const known = knownInfo[opp.id] || {};
              const knownCount = Object.keys(known).length;
              return (
                <div key={opp.id} className="flex items-center gap-2 py-1.5">
                  <span className="text-earth-600 text-xs w-4">{i + 1}.</span>
                  <span className="text-lg">{arch?.emoji}</span>
                  <div className="flex-1">
                    <span className="text-sm text-earth-100">{opp.name}</span>
                    <span className="text-xs text-earth-600 ml-2">{arch?.label}</span>
                  </div>
                  <span className="text-[10px] text-earth-600">
                    {knownCount > 0 ? `${knownCount} stats known` : 'unknown'}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => setPhase('matchup')}
            className="w-full bg-torch hover:bg-torch-dim text-earth-900 font-bold py-3 rounded-lg transition-colors active:scale-95"
          >
            Begin
          </button>
        </div>
      )}

      {/* Matchup — pick a stat */}
      {phase === 'matchup' && currentOpponent && (
        <div className="fade-in">
          {/* Score */}
          <div className="flex justify-between items-center mb-4">
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < wins ? 'bg-jungle text-earth-100' :
                  i < wins + losses ? 'bg-ember text-earth-100' :
                  i === round ? 'bg-earth-700 text-earth-300 ring-1 ring-torch' :
                  'bg-earth-700 text-earth-600'
                }`}>
                  {i < wins ? 'W' : i < wins + losses ? 'L' : i + 1}
                </div>
              ))}
            </div>
            <span className="text-xs text-earth-600">Match {round + 1} of 3</span>
          </div>

          {/* Opponent card */}
          <div className="bg-earth-800 border border-earth-700 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-2xl">{opponentArch?.emoji}</span>
              <div>
                <div className="text-lg font-bold text-earth-100">{currentOpponent.name}</div>
                <div className="text-xs text-earth-600">{opponentArch?.label}</div>
              </div>
            </div>

            {/* Show known stats */}
            <div className="space-y-1">
              {STAT_ORDER.map((stat) => {
                const known = opponentKnown[stat];
                const val = known ? (typeof known === 'object' ? known.value : known) : null;
                return (
                  <div key={stat} className="flex items-center gap-1.5">
                    <span className="text-[10px] text-earth-600 w-14">{STAT_LABELS[stat]}</span>
                    <div className="flex-1 h-1.5 bg-earth-700 rounded-full overflow-hidden">
                      {val != null ? (
                        <div className={`h-full rounded-full ${barColor(val)} opacity-70`}
                          style={{ width: `${(val / 10) * 100}%` }} />
                      ) : (
                        <div className="h-full rounded-full bg-earth-600/20" style={{ width: '100%' }} />
                      )}
                    </div>
                    <span className="text-[10px] w-6 text-right">
                      {val != null ? <span className="text-earth-300">{Math.max(1, val - 1)}-{Math.min(10, val + 1)}</span> : <span className="text-earth-600">???</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Stat choice */}
          <p className="text-xs text-earth-600 mb-2 text-center">Choose your skill:</p>
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

          {usedStats.length > 0 && (
            <div className="mt-2 text-xs text-earth-600 text-center">
              Used: {usedStats.map((s) => `${STAT_ICONS[s]}`).join(' ')}
            </div>
          )}
        </div>
      )}

      {/* Round result */}
      {phase === 'result' && roundResult && (
        <div className="fade-in">
          <div className={`text-center py-4 mb-4 rounded-lg border ${
            roundResult.won ? 'bg-jungle/10 border-jungle' : 'bg-ember/10 border-ember'
          }`}>
            <p className="text-lg font-bold text-earth-100">
              {roundResult.won ? '✓ You Win' : '✗ You Lose'}
            </p>
            <p className="text-xs text-earth-600 mt-1">
              {STAT_ICONS[roundResult.statKey]} {STAT_LABELS[roundResult.statKey]}
            </p>
          </div>

          <div className="bg-earth-800 border border-earth-700 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-torch font-medium">You</span>
              <span className="text-sm text-earth-100 font-bold">{roundResult.playerScore}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-earth-300">{roundResult.opponentName}</span>
              <span className="text-sm text-earth-100 font-bold">{roundResult.npcScore}</span>
            </div>
          </div>

          {/* Series score */}
          <div className="flex justify-center gap-2 mb-6">
            {[...Array(wins)].map((_, i) => (
              <span key={`w${i}`} className="text-sm text-jungle font-bold">W</span>
            ))}
            {[...Array(losses)].map((_, i) => (
              <span key={`l${i}`} className="text-sm text-ember font-bold">L</span>
            ))}
          </div>

          <button
            onClick={handleNext}
            className="w-full bg-torch hover:bg-torch-dim text-earth-900 font-bold py-3 rounded-lg transition-colors active:scale-95"
          >
            {wins >= 2 || losses >= 2 || round >= 2 ? 'See Results' : 'Next Matchup →'}
          </button>
        </div>
      )}

      {/* Final */}
      {phase === 'final' && (
        <div className="fade-in">
          <div className={`text-center py-6 mb-4 rounded-lg border ${
            wins >= 2 ? 'bg-torch/10 border-torch' : 'bg-earth-800 border-earth-700'
          }`}>
            <p className="text-2xl font-bold text-earth-100 mb-1">
              {wins >= 2 ? '🏆 Immunity Won!' : 'Not This Time'}
            </p>
            <p className="text-sm text-earth-600">
              {wins >= 2
                ? `You won ${wins}-${losses}. You're safe this week.`
                : `You lost ${losses}-${wins}. No protection at the board meeting.`
              }
            </p>
            {wins >= 2 && (
              <p className="text-xs text-jungle-light mt-2">Choose your reward below</p>
            )}
          </div>

          <p className="text-sm text-earth-300 italic font-serif bg-earth-800 border border-earth-700 rounded-lg p-4 mb-4">
            {wins >= 2
              ? pick([
                  'Three rounds, three opponents, and you came out on top. Management noticed.',
                  'Dominant performance. Nobody is touching you this week.',
                  'You read your opponents perfectly. Immunity is yours.',
                ])
              : pick([
                  'Close, but not enough. You\'ll need to rely on your alliances tonight.',
                  'The competition was fierce. Better luck next cycle.',
                  'No safety net this week. Time to work the room.',
                ])
            }
          </p>

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
