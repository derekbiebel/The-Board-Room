import { useState, useEffect } from 'react';
import useGameStore from '../stores/gameStore';
import { ARCHETYPES } from '../data/archetypes';
import { simulateVotes, tallyVotes, pickTribalSpotlight, SPOTLIGHT_DESCRIPTIONS } from '../engine/voteFormula';
import { processBetrayal } from '../engine/allianceEngine';
import { pick, randInt, shuffle } from '../utils/random';

export default function TribalCouncilScreen() {
  const {
    day, contestants, player, immunePlayerId, lobbyedVotes,
    playerCircle, npcFactions,
    setSpotlightStat, setTribalResult, eliminateContestant, setScreen, checkGameOver,
  } = useGameStore();

  const [phase, setPhase] = useState('vote'); // vote | counting | reveal | narration
  const [spotlight] = useState(() => pickTribalSpotlight(day));
  const [playerVote, setPlayerVote] = useState(null);
  const [voteResult, setVoteResult] = useState(null);
  const [revealIndex, setRevealIndex] = useState(0);
  const [narration, setNarration] = useState('');

  const active = contestants.filter((c) => !c.isEliminated);
  const voteTargets = active.filter((c) => c.id !== immunePlayerId);

  // Check if player is immune
  const playerIsImmune = immunePlayerId === 'player';

  const handleVote = async (targetId) => {
    setPlayerVote(targetId);
    setPhase('counting');

    // Simulate NPC votes
    const npcVotes = simulateVotes(
      contestants, player.id, player.stats,
      player.relationships, immunePlayerId, spotlight, lobbyedVotes,
      playerCircle, npcFactions, targetId
    );

    // Tally
    const result = tallyVotes(npcVotes, targetId, player.stats.lead);
    setVoteResult(result);
    setTribalResult(result);

    // Start reveal animation
    setPhase('reveal');
  };

  // Animate vote reveals
  useEffect(() => {
    if (phase !== 'reveal' || !voteResult) return;

    const totalToReveal = voteResult.sorted.length;
    if (revealIndex >= totalToReveal) {
      // All revealed, proceed to narration
      const timer = setTimeout(() => handleElimination(), 1500);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => setRevealIndex((i) => i + 1), 800);
    return () => clearTimeout(timer);
  }, [phase, revealIndex, voteResult]);

  const handleElimination = () => {
    setPhase('narration');

    const eliminatedId = voteResult.eliminatedId;
    const eliminated = contestants.find((c) => c.id === eliminatedId);
    const isPlayerEliminated = eliminatedId === player.id;
    const name = isPlayerEliminated ? player.name : eliminated?.name || 'Unknown';

    const sendoffs = [
      `${name}'s badge has been deactivated. Security will escort them out.`,
      `"We're going in a different direction." ${name} packs their desk in silence.`,
      `${name} gets the email nobody wants: "Let's connect RE: your role." It's over.`,
      `The board has spoken. ${name}'s parking spot has already been reassigned.`,
      `HR slides an envelope across the table. ${name}'s time here is done.`,
    ];
    setNarration(pick(sendoffs));

    if (!isPlayerEliminated && eliminatedId) {
      eliminateContestant(eliminatedId);

      // Cutthroat pro: gain +1 relationship with 2 random surviving NPCs
      if (player.stats.cut >= 4) {
        const store = useGameStore.getState();
        const surviving = store.contestants.filter((c) => !c.isEliminated && c.id !== eliminatedId);
        const lucky = shuffle([...surviving]).slice(0, 3);
        for (const c of lucky) {
          store.updateRelationship(c.id, 1);
        }
      }
    }
  };

  const [exposureMessage, setExposureMessage] = useState(null);

  const handleContinue = () => {
    const isPlayerEliminated = voteResult?.eliminatedId === player.id;
    if (isPlayerEliminated) {
      setScreen('gameOver');
      return;
    }

    if (checkGameOver()) return;

    const store = useGameStore.getState();

    // BETRAYAL CHECK: did the player vote for a circle member?
    if (playerVote && playerCircle.includes(playerVote) && playerVote !== voteResult.eliminatedId) {
      const victim = contestants.find((c) => c.id === playerVote);
      const result = processBetrayal(player.stats.snk, victim?.stats?.per || 1);

      store.recordBetrayal(playerVote, 'vote', result.detected);

      if (result.detected) {
        // Detected: remove from circle, permanent -5, all circle members lose trust
        store.removeFromCircle(playerVote, 'betrayal');
        store.updateRelationship(playerVote, -10); // slam to floor
        // Other circle members lose loyalty
        for (const cid of playerCircle) {
          if (cid !== playerVote) {
            const c = contestants.find((x) => x.id === cid);
            if (c) store.updateRelationship(cid, -2);
          }
        }
        setExposureMessage(`${victim?.name} stands up. "I know what you did." The whole floor heard. Your circle is shaken.`);
      } else {
        setExposureMessage(`You voted against ${victim?.name}. They don't know — yet. (+1 Cutthroat)`);
      }
      setPhase('exposure');
      return;
    }

    // Regular vote exposure: target (non-circle) may find out
    if (playerVote && playerVote !== voteResult.eliminatedId) {
      const exposureChance = Math.max(15, 70 - (player.stats.snk * 6));
      const roll = randInt(1, 100);
      if (roll <= exposureChance) {
        store.updateRelationship(playerVote, -2);
        const target = contestants.find((c) => c.id === playerVote);
        setExposureMessage(`${target?.name} found out you voted for them. They're not happy.`);
        setPhase('exposure');
        return;
      }
    }

    // Grant stat point for surviving
    store.grantStatPoint(1);
    setScreen('statAllocation');
  };

  const handleExposureContinue = () => {
    useGameStore.getState().grantStatPoint(1);
    setScreen('statAllocation');
  };

  const getContestantName = (id) => {
    if (id === player.id) return player.name + ' (You)';
    const c = contestants.find((x) => x.id === id);
    return c?.name || 'Unknown';
  };

  return (
    <div className="flex-1 flex flex-col bg-earth-900">
      {/* Header */}
      <div className="text-center py-6 border-b border-earth-700">
        <h1 className="text-2xl font-bold text-earth-100">🏛️ Board Meeting</h1>
        <p className="text-sm text-earth-600 mt-1">Week {day}</p>
        <p className="text-xs text-sand mt-2 italic font-serif px-4">
          {SPOTLIGHT_DESCRIPTIONS[spotlight]}
        </p>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {/* Voting phase */}
        {phase === 'vote' && (
          <div className="fade-in">
            <p className="text-sm text-earth-300 mb-4 text-center">
              The board is making cuts. Who gets the pink slip?
            </p>
            {playerIsImmune && (
              <div className="bg-torch/10 border border-torch rounded-lg p-2 mb-4 text-center">
                <span className="text-torch text-xs font-bold">Top performer — you're safe this week</span>
              </div>
            )}
            <div className="space-y-2">
              {voteTargets.map((c) => {
                const archetype = ARCHETYPES[c.archetype];
                const rel = player.relationships[c.id] || 0;
                return (
                  <button
                    key={c.id}
                    onClick={() => handleVote(c.id)}
                    className="w-full bg-earth-800 border border-earth-700 rounded-lg p-3 flex items-center gap-3 hover:border-ember transition-colors active:scale-[0.98]"
                  >
                    <span className="text-xl">{archetype?.emoji}</span>
                    <div className="text-left flex-1">
                      <div className="text-sm font-medium text-earth-100">{c.name}</div>
                      <div className="text-xs text-earth-600">{archetype?.label}</div>
                    </div>
                    <span className={`text-xs ${
                      rel > 0 ? 'text-jungle' : rel < 0 ? 'text-ember' : 'text-earth-600'
                    }`}>
                      {rel > 0 ? '+' : ''}{rel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Counting */}
        {phase === 'counting' && (
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="text-center">
              <div className="text-torch animate-pulse text-2xl mb-2">🔥</div>
              <p className="text-earth-300 text-sm">Counting the votes...</p>
            </div>
          </div>
        )}

        {/* Vote reveal */}
        {phase === 'reveal' && voteResult && (
          <div className="fade-in">
            <p className="text-sm text-earth-300 mb-4 text-center">The reviews are in.</p>
            <div className="space-y-2">
              {voteResult.sorted.slice(0, revealIndex).map(([id, count], i) => (
                <div
                  key={id}
                  className="vote-card bg-earth-800 border border-earth-700 rounded-lg p-3 flex items-center justify-between"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <span className={`text-sm font-medium ${
                    id === player.id ? 'text-torch' : 'text-earth-100'
                  }`}>
                    {getContestantName(id)}
                  </span>
                  <span className="text-sm font-bold text-ember">{count} complaint{count !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>

            {revealIndex >= voteResult.sorted.length && (
              <div className="mt-6 text-center">
                <p className="text-lg font-bold text-ember">
                  {getContestantName(voteResult.eliminatedId)} has been let go.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Narration */}
        {phase === 'narration' && (
          <div className="fade-in">
            <div className="text-center mb-4">
              <p className="text-lg font-bold text-ember">
                {getContestantName(voteResult.eliminatedId)}
              </p>
              <p className="text-sm text-earth-600">has been let go</p>
            </div>

            <p className="text-sm text-earth-300 italic font-serif mb-6 bg-earth-800 border border-earth-700 rounded-lg p-4">{narration}</p>

            <button
              onClick={handleContinue}
              className="w-full bg-torch hover:bg-torch-dim text-earth-900 font-bold py-3 rounded-lg transition-colors active:scale-95"
            >
              {voteResult.eliminatedId === player.id ? 'Game Over' : 'Continue'}
            </button>
          </div>
        )}

        {/* Vote exposure */}
        {phase === 'exposure' && exposureMessage && (
          <div className="fade-in">
            <div className="text-center py-4 mb-4 rounded-lg bg-ember/10 border border-ember">
              <p className="text-lg mb-1">👀</p>
              <p className="text-sm font-medium text-ember">{exposureMessage}</p>
              <p className="text-xs text-earth-600 mt-2">Relationship -2</p>
            </div>

            <button
              onClick={handleExposureContinue}
              className="w-full bg-torch hover:bg-torch-dim text-earth-900 font-bold py-3 rounded-lg transition-colors active:scale-95"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
