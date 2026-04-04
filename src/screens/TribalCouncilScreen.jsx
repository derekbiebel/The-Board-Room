import { useState, useEffect } from 'react';
import useGameStore from '../stores/gameStore';
import { ARCHETYPES } from '../data/archetypes';
import { simulateVotes, tallyVotes, pickTribalSpotlight, SPOTLIGHT_DESCRIPTIONS } from '../engine/voteFormula';
import { processBetrayal } from '../engine/allianceEngine';
import { pick, randInt, shuffle } from '../utils/random';
import { NEUTRAL_QUESTIONS } from '../data/neutralQuestions';

export default function TribalCouncilScreen() {
  const {
    day, contestants, player, immunePlayerId, lobbyedVotes,
    playerCircle, npcFactions,
    setSpotlightStat, setTribalResult, eliminateContestant, setScreen, checkGameOver,
  } = useGameStore();

  const [phase, setPhase] = useState('neutral_qa'); // neutral_qa | vote | counting | reveal | narration | elimination_recap
  const [spotlight] = useState(() => pickTribalSpotlight(day));
  const [playerVote, setPlayerVote] = useState(null);
  const [npcVoteDetails, setNpcVoteDetails] = useState([]);
  const [voteResult, setVoteResult] = useState(null);
  const [revealIndex, setRevealIndex] = useState(0);
  const [narration, setNarration] = useState('');

  // Neutral Q&A state
  const [neutralQuestions, setNeutralQuestions] = useState(null);
  const [neutralQIndex, setNeutralQIndex] = useState(0);
  const [neutralResults, setNeutralResults] = useState([]);

  const active = contestants.filter((c) => !c.isEliminated);
  const voteTargets = active.filter((c) => c.id !== immunePlayerId);

  // Generate neutral questions on mount
  useEffect(() => {
    const neutrals = active.filter((c) => {
      const rel = player.relationships[c.id] || 0;
      return rel === 0 && !playerCircle.includes(c.id);
    });
    const askers = shuffle([...neutrals]).slice(0, Math.min(3, neutrals.length));

    const questions = askers.map((npc) => {
      const q = pick(NEUTRAL_QUESTIONS);
      return {
        npc,
        archetype: npc.archetype,
        question: q.question.replace('{NAME}', npc.name),
        options: q.options,
      };
    });

    if (questions.length === 0) {
      setPhase('vote');
      setNeutralQuestions([]);
    } else {
      setNeutralQuestions(questions);
    }
  }, []);

  // Check if player is immune
  const playerIsImmune = immunePlayerId === 'player';

  const handleNeutralAnswer = (option) => {
    const q = neutralQuestions[neutralQIndex];
    const isGood = option.goodFor.includes(q.archetype);
    const isBad = option.badFor.includes(q.archetype);
    const store = useGameStore.getState();

    let resultText;
    if (isGood) {
      store.updateRelationship(q.npc.id, 1);
      resultText = pick([
        `${q.npc.name} nods. You made an impression.`,
        `${q.npc.name} seems satisfied. That bought you some goodwill.`,
        `Something shifted. ${q.npc.name} is on your side — for now.`,
      ]);
    } else if (isBad) {
      store.updateRelationship(q.npc.id, -1);
      resultText = pick([
        `${q.npc.name} looks away. Wrong answer.`,
        `${q.npc.name}'s expression closes off. You just made an enemy.`,
        `That landed badly. ${q.npc.name} has made up their mind.`,
      ]);
    } else {
      resultText = pick([
        `${q.npc.name} shrugs. Noncommittal.`,
        `${q.npc.name} gives you nothing. Could go either way.`,
      ]);
    }

    setNeutralResults([...neutralResults, { npc: q.npc.name, good: isGood, bad: isBad, text: resultText }]);

    if (neutralQIndex < neutralQuestions.length - 1) {
      setNeutralQIndex(neutralQIndex + 1);
    } else {
      setPhase('vote');
    }
  };

  const handleVote = async (targetId) => {
    setPlayerVote(targetId);
    setPhase('counting');

    // Simulate NPC votes
    const npcVotes = simulateVotes(
      contestants, player.id, player.stats,
      player.relationships, immunePlayerId, spotlight, lobbyedVotes,
      playerCircle, npcFactions, targetId, day
    );

    // Save NPC vote details for potential elimination recap
    setNpcVoteDetails(npcVotes);

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
      setPhase('elimination_recap');
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
        {/* Neutral Q&A — work the room before the vote */}
        {phase === 'neutral_qa' && neutralQuestions && neutralQuestions.length > 0 && neutralQuestions[neutralQIndex] && (
          <div className="fade-in">
            <p className="text-xs text-earth-600 text-center mb-4">
              Before the vote — {neutralQuestions.length - neutralQIndex} question{neutralQuestions.length - neutralQIndex !== 1 ? 's' : ''} remaining
            </p>

            {/* Previous result */}
            {neutralResults.length > 0 && (
              <div className={`text-center py-2 mb-4 rounded-lg text-sm ${
                neutralResults[neutralResults.length - 1].good ? 'bg-jungle/10 text-jungle-light' :
                neutralResults[neutralResults.length - 1].bad ? 'bg-ember/10 text-ember' :
                'bg-earth-800 text-earth-600'
              }`}>
                {neutralResults[neutralResults.length - 1].text}
              </div>
            )}

            <div className="bg-earth-800 border border-earth-700 rounded-lg p-4 mb-4">
              <p className="text-sm text-earth-100 font-serif italic">
                {neutralQuestions[neutralQIndex].question}
              </p>
            </div>

            <div className="space-y-2">
              {neutralQuestions[neutralQIndex].options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleNeutralAnswer(opt)}
                  className="w-full bg-earth-800 border border-earth-700 rounded-lg p-4 text-left hover:border-torch transition-colors active:scale-[0.98]"
                >
                  <p className="text-sm text-earth-100">"{opt.text}"</p>
                </button>
              ))}
            </div>
          </div>
        )}

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

        {/* Elimination recap — who voted against you and why */}
        {phase === 'elimination_recap' && (
          <div className="fade-in">
            <div className="text-center mb-4">
              <p className="text-4xl mb-2">📦</p>
              <h2 className="text-lg font-bold text-ember">You've Been Let Go</h2>
              <p className="text-sm text-earth-600 mt-1">Here's who put your name down — and why.</p>
            </div>

            <div className="space-y-2 mb-6">
              {npcVoteDetails
                .filter((v) => v.targetId === player.id)
                .map((v, i) => {
                  const voter = contestants.find((c) => c.id === v.voterId);
                  if (!voter) return null;
                  const rel = voter.relationships[player.id] || 0;
                  const arch = ARCHETYPES[voter.archetype];
                  const inCircle = playerCircle.includes(voter.id);
                  const wasBetrayedByPlayer = useGameStore.getState().betrayals.some(
                    (b) => b.victimId === voter.id && b.detected
                  );

                  let reason;
                  if (wasBetrayedByPlayer) {
                    reason = 'You betrayed them. They never forgot.';
                  } else if (rel <= -3) {
                    reason = 'They despised you. This was personal.';
                  } else if (rel <= -1) {
                    reason = 'They didn\'t trust you. Bad history.';
                  } else if (inCircle) {
                    reason = 'Even your own circle turned on you.';
                  } else if (voter.factionId) {
                    const faction = npcFactions.find((f) => f.id === voter.factionId);
                    reason = faction ? `${faction.name} coordinated against you.` : 'Faction coordination.';
                  } else if (rel === 0) {
                    reason = 'You never built a relationship. You were expendable.';
                  } else {
                    reason = 'Strategic vote. Nothing personal.';
                  }

                  return (
                    <div key={i} className="bg-earth-800 border border-earth-700 rounded-lg p-3 flex items-center gap-3">
                      <span className="text-lg">{arch?.emoji || '👤'}</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-earth-100">{voter.name}</div>
                        <div className="text-xs text-earth-600 italic">{reason}</div>
                      </div>
                      <span className={`text-xs font-medium ${
                        rel <= -2 ? 'text-ember' : rel <= -1 ? 'text-red-400' : 'text-earth-600'
                      }`}>
                        {rel > 0 ? '+' : ''}{rel}
                      </span>
                    </div>
                  );
                })}
            </div>

            {/* Who didn't vote for you */}
            {npcVoteDetails.filter((v) => v.targetId !== player.id).length > 0 && (
              <div className="mb-6">
                <p className="text-xs text-earth-600 mb-2">Didn't vote against you:</p>
                <div className="flex flex-wrap gap-1">
                  {npcVoteDetails
                    .filter((v) => v.targetId !== player.id)
                    .map((v) => {
                      const voter = contestants.find((c) => c.id === v.voterId);
                      const inCircle = playerCircle.includes(v.voterId);
                      return (
                        <span key={v.voterId} className={`text-xs px-2 py-0.5 rounded-full ${
                          inCircle ? 'bg-torch/20 text-torch' : 'bg-earth-700 text-earth-300'
                        }`}>
                          {voter?.name}
                        </span>
                      );
                    })}
                </div>
              </div>
            )}

            <button
              onClick={() => setScreen('gameOver')}
              className="w-full bg-torch hover:bg-torch-dim text-earth-900 font-bold py-3 rounded-lg transition-colors active:scale-95"
            >
              See Full Summary
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
