import { useState, useMemo } from 'react';
import useGameStore from '../stores/gameStore';
import { STAT_LABELS, STAT_ICONS } from '../components/StatBar';
import { CHALLENGE_SCENARIOS } from '../engine/challengeEngine';
import { pick, shuffle, randInt } from '../utils/random';

const STAT_ORDER = ['ath', 'soc', 'snk', 'lead', 'cut', 'res', 'per'];
const TOTAL_ROUNDS = 3;

export default function ChallengeScreen() {
  const {
    player, contestants, day, hasDoubleVote,
    setImmunity, setChallengeResult, grantStatPoint, grantDoubleVote, setScreen,
  } = useGameStore();

  const [phase, setPhase] = useState('intro'); // intro | pick | roundResult | final | rewardChoice
  const [scenario] = useState(() => pick(CHALLENGE_SCENARIOS));
  const [round, setRound] = useState(1);
  const [usedStats, setUsedStats] = useState([]);
  const [narration, setNarration] = useState('');

  // Running scores for all participants across rounds
  const [scores, setScores] = useState(() => {
    const s = { player: { id: player.id, name: 'You', total: 0, isPlayer: true } };
    contestants.filter((c) => !c.isEliminated).forEach((c) => {
      s[c.id] = { id: c.id, name: c.name, total: 0, isPlayer: false };
    });
    return s;
  });

  const [roundDetail, setRoundDetail] = useState(null);

  // Get 2 stats for this round (excluding already used)
  const availableStats = useMemo(() => {
    const remaining = STAT_ORDER.filter((s) => !usedStats.includes(s));
    return shuffle([...remaining]).slice(0, 2);
  }, [usedStats]);

  const handleStatPick = (statKey) => {
    // Score this round
    const playerScore = player.stats[statKey] + randInt(1, 4);
    const roundScores = [{ id: player.id, name: 'You', score: playerScore, isPlayer: true }];

    contestants.filter((c) => !c.isEliminated).forEach((c) => {
      const npcScore = (c.stats[statKey] || 1) + randInt(1, 4);
      roundScores.push({ id: c.id, name: c.name, score: npcScore, isPlayer: false });
    });

    roundScores.sort((a, b) => b.score - a.score);
    const playerRank = roundScores.findIndex((r) => r.isPlayer) + 1;

    // Update running totals
    const newScores = { ...scores };
    for (const r of roundScores) {
      if (newScores[r.id]) {
        newScores[r.id] = { ...newScores[r.id], total: newScores[r.id].total + r.score };
      }
    }
    setScores(newScores);

    // Get overall standings
    const standings = Object.values(newScores).sort((a, b) => b.total - a.total);
    const overallRank = standings.findIndex((s) => s.isPlayer) + 1;

    setRoundDetail({
      round,
      statKey,
      playerScore,
      playerRank,
      roundScores: roundScores.slice(0, 5),
      standings: standings.slice(0, 5),
      overallRank,
    });

    setUsedStats([...usedStats, statKey]);
    setPhase('roundResult');
  };

  const handleNextRound = () => {
    if (round >= TOTAL_ROUNDS) {
      // Final results
      const standings = Object.values(scores).sort((a, b) => b.total - a.total);
      const winner = standings[0];
      const playerRank = standings.findIndex((s) => s.isPlayer) + 1;

      setImmunity(winner.id === player.id ? 'player' : winner.id);
      setChallengeResult({ winnerId: winner.id, winnerName: winner.name, playerWon: winner.isPlayer, playerRank, rankings: standings });

      // Don't auto-grant stat point — let player choose between stat point and double vote

      const winLines = [
        'Management is impressed. You\'re untouchable this week.',
        'The board nods approvingly. Nobody\'s touching you this round.',
        'Three rounds. Three chances to prove yourself. You took every one.',
      ];
      const loseLines = [
        `${winner.name} dominated across all three rounds. They're untouchable.`,
        `${winner.name} edges you out in the cumulative rankings. They're safe.`,
        `Close — but ${winner.name} had the edge when it mattered.`,
      ];
      setNarration(pick(winner.isPlayer ? winLines : loseLines));
      setPhase('final');
    } else {
      setRound(round + 1);
      setRoundDetail(null);
      setPhase('pick');
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4">
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold text-earth-100">📊 Performance Review</h1>
        <p className="text-sm text-earth-600 mt-1">Week {day}</p>
      </div>

      {/* Intro */}
      {phase === 'intro' && (
        <div className="flex-1 flex flex-col fade-in">
          <p className="text-sm text-earth-300 italic font-serif bg-earth-800 border border-earth-700 rounded-lg p-4 mb-4">
            {scenario.text}
          </p>
          <div className="bg-earth-800 border border-earth-700 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-bold text-earth-100 mb-2">How It Works</h3>
            <div className="space-y-1.5 text-xs text-earth-300">
              <p>Three rounds. Each round, pick a skill to compete with.</p>
              <p>Your score accumulates across all three rounds.</p>
              <p>Highest total wins immunity — safe from this week's board meeting.</p>
              <p className="text-earth-600">You can't use the same skill twice.</p>
            </div>
          </div>
          <button
            onClick={() => setPhase('pick')}
            className="w-full bg-torch hover:bg-torch-dim text-earth-900 font-bold py-3 rounded-lg transition-colors active:scale-95"
          >
            Begin Review
          </button>
        </div>
      )}

      {/* Stat pick */}
      {phase === 'pick' && (
        <div className="fade-in">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-earth-300">Round {round} of {TOTAL_ROUNDS}</p>
            <div className="flex gap-1">
              {Array.from({ length: TOTAL_ROUNDS }, (_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${
                  i < round - 1 ? 'bg-torch' : i === round - 1 ? 'bg-torch animate-pulse' : 'bg-earth-700'
                }`} />
              ))}
            </div>
          </div>

          <p className="text-xs text-earth-600 mb-3 text-center">Choose your approach:</p>
          <div className="space-y-2">
            {availableStats.map((stat) => (
              <button
                key={stat}
                onClick={() => handleStatPick(stat)}
                className="w-full bg-earth-800 border border-earth-700 rounded-lg p-4 flex items-center justify-between hover:border-torch transition-colors active:scale-[0.98]"
              >
                <span className="text-sm text-earth-100">
                  {STAT_ICONS[stat]} {STAT_LABELS[stat]}
                </span>
                <span className="text-sm font-bold text-torch">{player.stats[stat]}</span>
              </button>
            ))}
          </div>

          {/* Used stats */}
          {usedStats.length > 0 && (
            <div className="mt-3 text-xs text-earth-600 text-center">
              Used: {usedStats.map((s) => `${STAT_ICONS[s]} ${STAT_LABELS[s]}`).join(', ')}
            </div>
          )}
        </div>
      )}

      {/* Round result */}
      {phase === 'roundResult' && roundDetail && (
        <div className="fade-in">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-earth-300">Round {roundDetail.round} Results</p>
            <span className="text-xs text-earth-600">
              {STAT_ICONS[roundDetail.statKey]} {STAT_LABELS[roundDetail.statKey]}
            </span>
          </div>

          {/* Round rank */}
          <div className={`text-center py-3 mb-4 rounded-lg border ${
            roundDetail.playerRank <= 3 ? 'bg-torch/10 border-torch' :
            roundDetail.playerRank <= 6 ? 'bg-earth-800 border-earth-700' :
            'bg-ember/10 border-ember'
          }`}>
            <p className="text-lg font-bold text-earth-100">
              #{roundDetail.playerRank} this round
            </p>
            <p className="text-xs text-earth-600 mt-0.5">
              Score: {roundDetail.playerScore}
            </p>
          </div>

          {/* Round top 5 */}
          <div className="bg-earth-800 border border-earth-700 rounded-lg p-3 mb-4">
            <p className="text-xs text-earth-600 mb-2">Round {roundDetail.round}</p>
            {roundDetail.roundScores.map((r, i) => (
              <div key={r.id} className={`flex justify-between text-xs py-0.5 ${
                r.isPlayer ? 'text-torch font-bold' : 'text-earth-300'
              }`}>
                <span>#{i + 1} {r.name}</span>
                <span className="text-earth-600">{r.score}</span>
              </div>
            ))}
          </div>

          {/* Overall standings */}
          <div className="bg-earth-800 border border-earth-700 rounded-lg p-3 mb-6">
            <p className="text-xs text-earth-600 mb-2">Overall Standings</p>
            {roundDetail.standings.map((s, i) => (
              <div key={s.id} className={`flex justify-between text-xs py-0.5 ${
                s.isPlayer ? 'text-torch font-bold' : 'text-earth-300'
              }`}>
                <span>#{i + 1} {s.name}</span>
                <span className="text-earth-600">{s.total}</span>
              </div>
            ))}
            {roundDetail.overallRank > 5 && (
              <div className="text-xs text-torch font-bold py-0.5 mt-1 border-t border-earth-700 pt-1">
                You: #{roundDetail.overallRank} ({scores.player.total})
              </div>
            )}
          </div>

          <button
            onClick={handleNextRound}
            className="w-full bg-torch hover:bg-torch-dim text-earth-900 font-bold py-3 rounded-lg transition-colors active:scale-95"
          >
            {round >= TOTAL_ROUNDS ? 'See Final Results' : `Round ${round + 1} →`}
          </button>
        </div>
      )}

      {/* Final result */}
      {phase === 'final' && (
        <div className="fade-in">
          {/* Winner banner */}
          <div className={`text-center py-4 mb-4 rounded-lg border ${
            scores.player.total >= Object.values(scores).sort((a, b) => b.total - a.total)[0].total
              ? 'bg-torch/10 border-torch'
              : 'bg-earth-800 border-earth-700'
          }`}>
            {(() => {
              const standings = Object.values(scores).sort((a, b) => b.total - a.total);
              const winner = standings[0];
              const playerRank = standings.findIndex((s) => s.isPlayer) + 1;
              return (
                <>
                  <p className="text-lg font-bold text-earth-100">
                    {winner.isPlayer ? '🏆 Top Performer!' : `🏆 ${winner.name} Wins`}
                  </p>
                  {!winner.isPlayer && (
                    <p className="text-xs text-earth-600 mt-1">You placed #{playerRank}</p>
                  )}
                  {winner.isPlayer && (
                    <p className="text-xs text-jungle-light mt-1">Choose your reward</p>
                  )}
                </>
              );
            })()}
          </div>

          <p className="text-sm text-earth-300 italic font-serif bg-earth-800 border border-earth-700 rounded-lg p-4 mb-4">
            {narration}
          </p>

          {/* Final standings */}
          <div className="bg-earth-800 border border-earth-700 rounded-lg p-3 mb-6">
            <p className="text-xs text-earth-600 mb-2">Final Rankings</p>
            {Object.values(scores).sort((a, b) => b.total - a.total).slice(0, 5).map((s, i) => (
              <div key={s.id} className={`flex justify-between text-sm py-1 ${
                s.isPlayer ? 'text-torch font-bold' : 'text-earth-300'
              }`}>
                <span>#{i + 1} {s.name}</span>
                <span className="text-earth-600">{s.total}</span>
              </div>
            ))}
          </div>

          {(() => {
            const standings = Object.values(scores).sort((a, b) => b.total - a.total);
            const playerWon = standings[0]?.isPlayer;
            if (playerWon) {
              return (
                <div className="space-y-2">
                  <p className="text-xs text-earth-600 text-center mb-1">Choose your reward:</p>
                  <button
                    onClick={() => { grantStatPoint(1); setScreen('tribal'); }}
                    className="w-full bg-jungle/10 border border-jungle/30 rounded-lg p-4 text-center hover:bg-jungle/20 transition-colors active:scale-95"
                  >
                    <span className="text-sm font-bold text-jungle-light">📊 +1 Stat Point</span>
                    <span className="block text-[10px] text-earth-600 mt-0.5">Permanently improve one skill</span>
                  </button>
                  {!hasDoubleVote && (
                    <button
                      onClick={() => { grantDoubleVote(); setScreen('tribal'); }}
                      className="w-full bg-torch/10 border border-torch/30 rounded-lg p-4 text-center hover:bg-torch/20 transition-colors active:scale-95"
                    >
                      <span className="text-sm font-bold text-torch">⚡ Double Vote Token</span>
                      <span className="block text-[10px] text-earth-600 mt-0.5">Your vote counts for +2 extra at one board meeting. One use.</span>
                    </button>
                  )}
                </div>
              );
            }
            return (
              <button
                onClick={() => setScreen('tribal')}
                className="w-full bg-earth-800 hover:bg-earth-700 text-earth-100 font-bold py-3 rounded-lg border border-earth-700 transition-colors active:scale-95"
              >
                🏛️ Head to Board Meeting
              </button>
            );
          })()}
        </div>
      )}
    </div>
  );
}
