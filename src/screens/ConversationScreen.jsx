import { useState, useMemo } from 'react';
import useGameStore from '../stores/gameStore';
import { ARCHETYPES } from '../data/archetypes';
import { CONVERSATION_GOALS, RECRUIT_GOAL, resolveStatCheck } from '../engine/statCheck';
import { checkRecruitAcceptance, getMaxCircleSize } from '../engine/allianceEngine';
import { shuffle, pick, randInt } from '../utils/random';

const OPTION_POOLS = {
  trust: [
    { text: "Hey, got a sec? Thought we could grab coffee.", tone: "friendly", risk: "low" },
    { text: "I've got your back this week. Just wanted you to know.", tone: "sincere", risk: "low" },
    { text: "Between us — I think we'd make a good team.", tone: "direct", risk: "medium" },
    { text: "I know things are tense. But I'm not your enemy here.", tone: "cautious", risk: "low" },
    { text: "Let's be real — we both need allies right now.", tone: "bold", risk: "medium" },
  ],
  charm: [
    { text: "You know, I don't think this office appreciates you enough.", tone: "flattering", risk: "low" },
    { text: "I couldn't help noticing you handled that meeting like a pro.", tone: "smooth", risk: "low" },
    { text: "I have to be honest — you're the most interesting person on this floor.", tone: "bold", risk: "medium" },
    { text: "Walk with me? I could use the company of someone who actually gets it.", tone: "charming", risk: "medium" },
    { text: "I don't usually do this, but... can I buy you a coffee?", tone: "forward", risk: "high" },
  ],
  probe: [
    { text: "So... what's your read on things around here?", tone: "casual", risk: "low" },
    { text: "I heard some interesting things about the board's plans.", tone: "probing", risk: "medium" },
    { text: "Who do you think is really pulling strings around here?", tone: "direct", risk: "medium" },
    { text: "I've been paying attention. I think you have too.", tone: "knowing", risk: "high" },
    { text: "Something doesn't add up with the last review. What do you know?", tone: "probing", risk: "high" },
  ],
  threaten: [
    { text: "I'd think very carefully about your next move.", tone: "cold", risk: "high" },
    { text: "I know things. Things that would interest HR.", tone: "threatening", risk: "high" },
    { text: "You're either with me or you're on the list. Your call.", tone: "aggressive", risk: "high" },
    { text: "I'd hate for certain emails to surface. Wouldn't you?", tone: "menacing", risk: "high" },
    { text: "Let's just say I have leverage. And I'm not afraid to use it.", tone: "cold", risk: "medium" },
  ],
  inspire: [
    { text: "We can turn this around. But we need to stick together.", tone: "motivating", risk: "low" },
    { text: "I have a plan. It's bold, but it could save both of us.", tone: "bold", risk: "medium" },
    { text: "Everyone's scared. That's exactly why we need to lead.", tone: "confident", risk: "medium" },
    { text: "The people who survive restructurings are the ones who act.", tone: "inspiring", risk: "low" },
    { text: "I see something in you that management doesn't. Yet.", tone: "supportive", risk: "low" },
  ],
  sabotage: [
    { text: "Did you hear what they said about you in the meeting?", tone: "gossipy", risk: "medium" },
    { text: "I'd watch out — someone's been talking to HR about your team.", tone: "deceptive", risk: "medium" },
    { text: "Interesting that their project numbers don't quite add up...", tone: "insinuating", risk: "high" },
    { text: "I'm just saying — not everyone here is who they pretend to be.", tone: "sly", risk: "medium" },
    { text: "I wouldn't trust them if I were you. I've seen the emails.", tone: "conspiratorial", risk: "high" },
  ],
  recruit: [
    { text: "I think we should be looking out for each other. Seriously.", tone: "earnest", risk: "medium" },
    { text: "There's a group of us. We watch each other's backs. Interested?", tone: "direct", risk: "medium" },
    { text: "This place eats people alive. But not if we stick together.", tone: "conspiratorial", risk: "low" },
    { text: "I'm building something. A real team. You should be part of it.", tone: "bold", risk: "high" },
    { text: "Between us — I have a plan. But I need people I can trust.", tone: "hushed", risk: "medium" },
  ],
};

function generateLocalOptions(goal, npcName) {
  const pool = OPTION_POOLS[goal.key] || OPTION_POOLS.trust;
  return shuffle([...pool]).slice(0, 3);
}

export default function ConversationScreen() {
  const {
    currentConversation, contestants, player,
    playerCircle,
    setConversationGoal, setConversationOptions, setConversationOutcome,
    updateRelationship, lobbyNpc, recruitToCircle, setScreen,
  } = useGameStore();

  const [phase, setPhase] = useState('goal');
  const [outcomeNarration, setOutcomeNarration] = useState('');
  const [outcomeResult, setOutcomeResult] = useState(null);
  const [recruitResult, setRecruitResult] = useState(null);

  const contestant = contestants.find((c) => c.id === currentConversation?.contestantId);
  if (!contestant) return null;

  const archetype = ARCHETYPES[contestant.archetype];
  const relationship = player.relationships[contestant.id] || 0;
  const active = contestants.filter((c) => !c.isEliminated);
  const isCircleMember = playerCircle.includes(contestant.id);

  // Check if recruit goal should be available
  const activeCount = active.length + 1;
  const maxCircle = getMaxCircleSize(activeCount);
  const canRecruit = relationship >= 3
    && playerCircle.length < maxCircle
    && !isCircleMember
    && contestant.circleStatus !== 'former';

  // Pick 2 random conversation goals, potentially including recruit as a 3rd
  const availableGoals = useMemo(() => {
    const goals = shuffle([...CONVERSATION_GOALS]).slice(0, 2);
    if (canRecruit) goals.push(RECRUIT_GOAL);
    return goals;
  }, [canRecruit]);
  const handleGoalSelect = (goal) => {
    setConversationGoal(goal.key);
    const options = generateLocalOptions(goal, contestant.name);
    setConversationOptions(options, null);
    setPhase('options');
  };

  const handleOptionSelect = (option) => {
    // Find the goal to get stat mappings
    const goal = currentConversation.goal === 'recruit'
      ? RECRUIT_GOAL
      : CONVERSATION_GOALS.find((g) => g.key === currentConversation.goal);
    // Social Skills bonus: only applies to social goals (trust + recruit)
    const isSocialGoal = goal.key === 'trust' || goal.key === 'recruit';
    const socBonus = isSocialGoal ? Math.floor(player.stats.soc / 3) : 0;
    const playerStat = player.stats[goal.playerStat] + socBonus;

    // Circle members are slightly easier to talk to (+1 bonus)
    // Perception con: sneaky NPCs are extra guarded against perceptive players
    // Resilience pro: +1 bonus when relationship is negative (best under pressure)
    let npcStat = contestant.stats[goal.npcStat];
    if (isCircleMember) npcStat = Math.max(1, npcStat - 1);
    if (player.stats.per >= 5 && contestant.stats.snk >= 5) npcStat += 1;
    if (player.stats.res >= 4 && relationship < 0) npcStat = Math.max(1, npcStat - 1); // res pro

    // Resolve the stat check
    const result = resolveStatCheck(playerStat, npcStat);
    setOutcomeResult(result);

    // Apply relationship delta with trait modifiers
    let relDelta = result.relationshipDelta;

    // Perception pro: successful probes grant +1 extra relationship
    if (currentConversation.goal === 'probe' && relDelta > 0) relDelta += 1;

    // Hotness pro: successful charms grant +1 extra relationship
    if (currentConversation.goal === 'charm' && relDelta > 0) relDelta += 1;

    // Cutthroat con: conversation relationship gains capped at +1 (only at very high cut)
    if (relDelta > 1 && player.stats.cut >= 8) relDelta = 1;

    // Social Skills con: failures hurt double
    if (relDelta < 0 && player.stats.soc >= 5) relDelta *= 2;

    // Resilience: halves negative impacts only (pure damage reduction)
    if (player.stats.res >= 5 && relDelta < 0) relDelta = Math.ceil(relDelta / 2);

    updateRelationship(contestant.id, relDelta);
    result.relationshipDelta = relDelta; // update for display
    setConversationOutcome(result);

    // Local outcome narration
    const outcomeLines = {
      strong_success: [
        `${contestant.name} lights up. You've clearly struck a chord.`,
        `${contestant.name} leans in — you've got their full attention now.`,
        `${contestant.name} nods slowly. "I like how you think."`,
      ],
      partial_success: [
        `${contestant.name} seems receptive, if a little guarded.`,
        `${contestant.name} nods along — they're buying what you're selling.`,
        `A small smile from ${contestant.name}. Progress.`,
      ],
      neutral: [
        `${contestant.name} gives you a polite but noncommittal response.`,
        `${contestant.name} shrugs. "Sure, yeah. Anyway..."`,
        `The conversation fizzles into small talk about the weather.`,
      ],
      partial_fail: [
        `${contestant.name} gives you the corporate smile and turns back to their screen.`,
        `${contestant.name}'s expression hardens. That didn't land well.`,
        `Awkward silence. ${contestant.name} suddenly has a "meeting to get to."`,
      ],
      hard_fail: [
        `${contestant.name} stares at you coldly. "Are you serious right now?"`,
        `${contestant.name} walks away mid-sentence. That's going to cost you.`,
        `${contestant.name} laughs — not with you. People nearby noticed.`,
      ],
    };

    // Ripple effect: hard fails spread — someone nearby overheard
    if (result.tier === 'hard_fail') {
      const bystanders = active.filter((c) => c.id !== contestant.id && !playerCircle.includes(c.id));
      if (bystanders.length > 0) {
        const bystander = pick(bystanders);
        updateRelationship(bystander.id, -1);
        outcomeLines.hard_fail = [
          `${contestant.name} walks away. ${bystander.name} saw the whole thing.`,
          `${contestant.name} raises their voice. ${bystander.name} looks up from their desk, taking notes.`,
          `It went badly. And ${bystander.name} was standing right there.`,
        ];
      }
    }

    // Special handling for recruitment — no free relationship gain
    if (currentConversation.goal === 'recruit') {
      // Undo the normal relationship update — recruitment is all-or-nothing
      updateRelationship(contestant.id, -relDelta);

      if (result.tier === 'strong_success') {
        // Strong success = auto-accept. You nailed the pitch.
        recruitToCircle(contestant.id);
        updateRelationship(contestant.id, 1);
        setRecruitResult({ accepted: true, message: pick([
          `They extend a hand. "I'm in. Let's do this."`,
          `A nod. "About time someone asked. Count me in."`,
          `"You had me at 'watching each other's backs.' Deal."`,
        ])});
      } else if (result.tier === 'partial_success') {
        // Partial success = depends on NPC personality
        const acceptance = checkRecruitAcceptance({
          relationship,
          outcomeTier: result.tier,
          npcStats: contestant.stats,
          npcArchetype: contestant.archetype,
          circleSize: playerCircle.length,
          npcFactionId: contestant.factionId,
          npcCircleStatus: contestant.circleStatus,
          playerCircleReputation: player.circleReputation || 0,
          playerSnk: player.stats.snk,
        });

        if (acceptance.accepted) {
          recruitToCircle(contestant.id);
          updateRelationship(contestant.id, 1);
          setRecruitResult({ accepted: true, message: acceptance.reason });
        } else {
          updateRelationship(contestant.id, -1);
          setRecruitResult({ accepted: false, message: acceptance.reason });
        }
      } else if (result.tier === 'neutral') {
        updateRelationship(contestant.id, -1);
        setRecruitResult({ accepted: false, message: `The conversation didn't go well enough to pop the question.` });
      } else {
        // Partial or hard fail — they're offended you even tried
        const penalty = result.tier === 'hard_fail' ? -3 : -2;
        updateRelationship(contestant.id, penalty);
        setRecruitResult({ accepted: false, message: pick([
          `That went badly. ${contestant.name} looks uncomfortable and walks away.`,
          `${contestant.name} stares at you. "Did you really just ask me that?" This will be remembered.`,
          `Wrong read. Wrong time. ${contestant.name} won't forget this.`,
        ])});
      }
      result.relationshipDelta = 0; // don't show misleading delta on result screen
      setOutcomeNarration(pick(outcomeLines[result.tier]));
      setPhase('recruitResult');
      return;
    }

    setOutcomeNarration(pick(outcomeLines[result.tier]));
    setPhase('outcome');
  };

  const tierColors = {
    strong_success: 'text-jungle-light',
    partial_success: 'text-jungle',
    neutral: 'text-earth-300',
    partial_fail: 'text-red-400',
    hard_fail: 'text-ember',
  };

  return (
    <div className="flex-1 flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => setScreen('camp')}
          className="text-earth-600 hover:text-earth-300 text-sm"
        >
          ← Back
        </button>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-earth-100">{contestant.name}</h2>
          <p className="text-xs text-earth-600">
            {archetype.emoji} {archetype.label} · Relationship: {relationship > 0 ? '+' : ''}{relationship}
          </p>
        </div>
      </div>

      {/* Goal selection */}
      {phase === 'goal' && (
        <div className="flex-1 fade-in">
          <p className="text-sm text-earth-300 mb-4">What's your approach?</p>
          <div className="space-y-2">
            {availableGoals.map((goal) => (
              <button
                key={goal.key}
                onClick={() => handleGoalSelect(goal)}
                className="w-full bg-earth-800 border border-earth-700 rounded-lg p-4 text-left hover:border-torch transition-colors active:scale-[0.98]"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{goal.icon}</span>
                  <div>
                    <div className="text-sm font-medium text-earth-100">{goal.label}</div>
                    <div className="text-xs text-earth-600">
                      Your {goal.playerStatLabel} vs their {goal.npcStatLabel}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dialogue options */}
      {phase === 'options' && currentConversation.options && (
        <div className="flex-1 fade-in">
          <p className="text-xs text-earth-600 mb-3">Choose your words carefully.</p>

          <div className="space-y-2">
            {currentConversation.options.map((option, i) => (
              <button
                key={i}
                onClick={() => handleOptionSelect(option)}
                className="w-full bg-earth-800 border border-earth-700 rounded-lg p-4 text-left hover:border-torch transition-colors active:scale-[0.98]"
              >
                <p className="text-sm text-earth-100 mb-1">"{option.text}"</p>
                <div className="flex gap-2">
                  <span className="text-xs text-earth-600">{option.tone}</span>
                  <span className={`text-xs ${
                    option.risk === 'high' ? 'text-ember' :
                    option.risk === 'medium' ? 'text-sand' :
                    'text-jungle'
                  }`}>
                    {option.risk} risk
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Outcome */}
      {phase === 'outcome' && outcomeResult && (
        <div className="flex-1 fade-in">
          {/* Result banner */}
          <div className={`text-center py-3 mb-4 rounded-lg bg-earth-800 border border-earth-700`}>
            <p className={`text-lg font-bold ${tierColors[outcomeResult.tier]}`}>
              {outcomeResult.label}
            </p>
            <p className="text-xs text-earth-600 mt-1">
              Relationship {outcomeResult.relationshipDelta > 0 ? '+' : ''}{outcomeResult.relationshipDelta}
            </p>
          </div>

          <p className="text-sm text-earth-300 italic font-serif mb-4 bg-earth-800 border border-earth-700 rounded-lg p-4">{outcomeNarration}</p>

          {/* Lobby option on success */}
          {(outcomeResult.tier === 'strong_success' || outcomeResult.tier === 'partial_success') ? (
            <div className="space-y-2">
              <button
                onClick={() => setPhase('lobby')}
                className="w-full bg-earth-800 hover:bg-earth-700 text-earth-100 font-bold py-3 rounded-lg border border-earth-700 transition-colors active:scale-95"
              >
                🗳️ Suggest who to vote out
                <span className="block text-[10px] text-earth-600 font-normal mt-0.5">Risk: your target might find out</span>
              </button>
              <button
                onClick={() => {
                  // Skip lobbying = genuine connection, +1 bonus relationship
                  updateRelationship(contestant.id, 1);
                  setScreen('camp');
                }}
                className="w-full bg-torch hover:bg-torch-dim text-earth-900 font-bold py-3 rounded-lg transition-colors active:scale-95"
              >
                Just talk — Build trust
                <span className="block text-[10px] text-earth-900/60 font-normal mt-0.5">+1 bonus relationship</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setScreen('camp')}
              className="w-full bg-earth-800 hover:bg-earth-700 text-earth-100 font-medium py-3 rounded-lg border border-earth-700 transition-colors active:scale-95"
            >
              Return to Office
            </button>
          )}
        </div>
      )}

      {/* Lobby — pick a vote target */}
      {phase === 'lobby' && (
        <div className="flex-1 fade-in">
          <p className="text-sm text-earth-300 mb-2">
            {contestant.name} is listening. Who should get the axe?
          </p>
          <p className="text-xs text-earth-600 mb-4">
            {outcomeResult.tier === 'strong_success'
              ? 'They trust you — high chance they\'ll follow through.'
              : 'They\'re open to it — decent chance they\'ll go along.'}
          </p>
          <div className="space-y-2">
            {active
              .filter((c) => c.id !== contestant.id)
              .map((c) => {
                const arch = ARCHETYPES[c.archetype];
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      lobbyNpc(
                        contestant.id,
                        c.id,
                        outcomeResult.tier === 'strong_success' ? 'strong' : 'partial'
                      );
                      // Lobby leak risk: 25% chance your target finds out
                      if (randInt(1, 100) <= 25) {
                        updateRelationship(c.id, -2);
                      }
                      setScreen('camp');
                    }}
                    className="w-full bg-earth-800 border border-earth-700 rounded-lg p-3 flex items-center gap-3 hover:border-torch transition-colors active:scale-[0.98]"
                  >
                    <span className="text-lg">{arch?.emoji}</span>
                    <div className="text-left flex-1">
                      <div className="text-sm font-medium text-earth-100">{c.name}</div>
                      <div className="text-xs text-earth-600">{arch?.label}</div>
                    </div>
                    <span className={`text-xs font-medium ${
                      (player.relationships[c.id] || 0) >= 2 ? 'text-jungle-light' :
                      (player.relationships[c.id] || 0) >= 1 ? 'text-jungle' :
                      (player.relationships[c.id] || 0) <= -2 ? 'text-ember' :
                      (player.relationships[c.id] || 0) <= -1 ? 'text-red-400' :
                      'text-earth-600'
                    }`}>
                      {(player.relationships[c.id] || 0) > 0 ? '+' : ''}{player.relationships[c.id] || 0}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Recruit result */}
      {phase === 'recruitResult' && recruitResult && (
        <div className="flex-1 fade-in">
          {/* Stat check result */}
          <div className={`text-center py-3 mb-4 rounded-lg bg-earth-800 border border-earth-700`}>
            <p className={`text-lg font-bold ${tierColors[outcomeResult.tier]}`}>
              {outcomeResult.label}
            </p>
          </div>

          <p className="text-sm text-earth-300 italic font-serif mb-4 bg-earth-800 border border-earth-700 rounded-lg p-4">
            {outcomeNarration}
          </p>

          {/* Recruitment outcome */}
          <div className={`text-center py-4 mb-4 rounded-lg border ${
            recruitResult.accepted
              ? 'bg-torch/10 border-torch'
              : 'bg-earth-800 border-earth-700'
          }`}>
            <p className="text-lg font-bold text-earth-100 mb-1">
              {recruitResult.accepted ? '🤝 Welcome to the Circle' : 'Not Interested'}
            </p>
            <p className="text-sm text-earth-300">{recruitResult.message}</p>
          </div>

          <button
            onClick={() => setScreen('camp')}
            className="w-full bg-earth-800 hover:bg-earth-700 text-earth-100 font-medium py-3 rounded-lg border border-earth-700 transition-colors active:scale-95"
          >
            Return to Office
          </button>
        </div>
      )}
    </div>
  );
}
