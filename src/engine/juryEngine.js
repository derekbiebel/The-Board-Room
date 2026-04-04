import { randInt, pick } from '../utils/random';

/**
 * Build jury from the last 10 eliminated contestants.
 */
export function buildJury(eliminationLog, contestants, player, betrayals) {
  const juryEntries = eliminationLog.slice(-10);

  return juryEntries.map((entry) => {
    const c = contestants.find((x) => x.id === entry.contestantId);
    if (!c) return null;

    const relationship = c.relationships[player.id] || 0;
    const wasBetrayedByPlayer = betrayals.some((b) => b.victimId === c.id && b.detected);
    const hiddenBetrayal = betrayals.some((b) => b.victimId === c.id && !b.detected);
    const wasInCircle = c.circleStatus === 'former';
    const neverSpoke = relationship === 0 && !wasInCircle && !wasBetrayedByPlayer;

    let bitterness = 0;
    if (relationship <= -3) bitterness += 4;
    else if (relationship <= -1) bitterness += 2;
    if (wasBetrayedByPlayer) bitterness += 4;
    if (wasInCircle) bitterness += 2;
    bitterness = Math.min(10, Math.max(0, bitterness + randInt(-1, 1)));

    const playerStatGrowth = Object.values(player.stats).reduce((a, b) => a + b, 0) - 17;
    let respect = 0;
    respect += Math.min(4, Math.floor(playerStatGrowth / 3));
    respect += Math.min(3, Math.floor(entry.day / 4));
    if (relationship >= 2) respect += 2;
    else if (relationship >= 0) respect += 1;
    if (c.archetype === 'loyalist' && !wasBetrayedByPlayer) respect += 1;
    if (c.archetype === 'schemer' && playerStatGrowth > 10) respect += 1;
    respect = Math.min(10, Math.max(0, respect + randInt(-1, 1)));

    // Resilience pro: jurors respect endurance — reduces bitterness slightly
    if (player.stats.res >= 5) bitterness = Math.max(0, bitterness - 1);

    // Starting lean: positive = leaning toward player, negative = leaning away
    let lean = respect - bitterness;

    return {
      id: c.id,
      name: c.name,
      archetype: c.archetype,
      eliminatedDay: entry.day,
      bitterness,
      respect,
      relationship,
      lean,
      wasBetrayedByPlayer,
      hiddenBetrayal,
      wasInCircle,
      neverSpoke,
    };
  }).filter(Boolean);
}

/**
 * Generate jury questions grounded in actual game history.
 * Every juror who has a question gets one. Answers shift their lean.
 */
export function generateJuryQuestions(jury, player, betrayals) {
  const questions = [];

  for (const juror of jury) {
    let question;
    let options;

    // Priority 1: Betrayal — the most dramatic moment
    if (juror.wasBetrayedByPlayer) {
      question = `${juror.name} stands. "Week ${juror.eliminatedDay}. You voted me out. I was in your circle. I want to hear you say why."`;
      options = [
        {
          text: "I had no choice. The votes were already against you and I had to protect myself.",
          // Loyalists/Team Players respect honesty about survival. Schemers see weakness.
          goodFor: ['loyalist', 'floater', 'social_butterfly'],
          badFor: ['schemer', 'bully'],
          shift: 0, // neutral default
        },
        {
          text: "Because you were the biggest threat left. I'd do it again.",
          // Schemers/Strategists respect cold logic. Loyalists hate it.
          goodFor: ['schemer', 'strategist', 'bully'],
          badFor: ['loyalist', 'social_butterfly'],
          shift: 0,
        },
        {
          text: "It was wrong. I know that now. I'm not proud of how I played.",
          // Social butterflies/Loyalists appreciate humility. Cutthroat types see it as weak.
          goodFor: ['social_butterfly', 'loyalist', 'floater'],
          badFor: ['bully', 'schemer', 'strategist'],
          shift: 0,
        },
      ];
    }
    // Priority 2: Former circle member (not betrayed — left or was pushed out)
    else if (juror.wasInCircle) {
      question = `${juror.name}: "I was part of your inner circle. Then I wasn't. Did I ever actually matter to you, or was I just a number?"`;
      options = [
        {
          text: "You mattered. The game just moved faster than I could protect everyone.",
          goodFor: ['loyalist', 'social_butterfly', 'floater'],
          badFor: ['strategist', 'schemer'],
          shift: 0,
        },
        {
          text: "I won't lie — I built the circle to win. But the relationships were real.",
          goodFor: ['strategist', 'schemer', 'wildcard'],
          badFor: ['loyalist'],
          shift: 0,
        },
        {
          text: "You left on your own. Don't rewrite history.",
          goodFor: ['bully', 'schemer'],
          badFor: ['loyalist', 'social_butterfly', 'floater'],
          shift: 0,
        },
      ];
    }
    // Priority 3: Extremely bitter — hates the player
    else if (juror.bitterness >= 6) {
      question = `${juror.name} won't look at you. "You know what you did to me. Week ${juror.eliminatedDay}, I was gone. Convince me you're not just a snake who got lucky."`;
      options = [
        {
          text: "I'm not going to apologize for surviving. This was a game and I played it.",
          goodFor: ['schemer', 'strategist', 'bully'],
          badFor: ['loyalist', 'social_butterfly'],
          shift: 0,
        },
        {
          text: "I understand why you're angry. If our positions were reversed, I'd feel the same way.",
          goodFor: ['loyalist', 'social_butterfly', 'floater'],
          badFor: ['bully', 'schemer'],
          shift: 0,
        },
        {
          text: "Look at who's sitting here and who's sitting there. The results speak for themselves.",
          goodFor: ['bully', 'wildcard'],
          badFor: ['loyalist', 'social_butterfly', 'floater', 'strategist'],
          shift: 0,
        },
      ];
    }
    // Priority 4: Never interacted — the stranger
    else if (juror.neverSpoke) {
      question = `${juror.name}: "We never once had a real conversation. ${juror.eliminatedDay > 5 ? 'I was here for ' + juror.eliminatedDay + ' weeks and you never even looked my way.' : 'I was gone before you even learned my name.'} Why should I vote for someone who didn't know I existed?"`;
      options = [
        {
          text: "You're right. I should have made the time. That's on me.",
          goodFor: ['loyalist', 'social_butterfly', 'floater'],
          badFor: ['schemer', 'bully'],
          shift: 0,
        },
        {
          text: "I had to be strategic about who I invested in. Nothing personal.",
          goodFor: ['strategist', 'schemer'],
          badFor: ['social_butterfly', 'loyalist'],
          shift: 0,
        },
        {
          text: "I didn't need to talk to everyone to play a winning game.",
          goodFor: ['bully'],
          badFor: ['loyalist', 'social_butterfly', 'floater', 'wildcard'],
          shift: 0,
        },
      ];
    }
    // Priority 5: Respected the player
    else if (juror.respect >= 5) {
      question = `${juror.name} nods slowly. "Credit where it's due — you made it. But making it and deserving it are different things. What was the move that got you here?"`;
      options = [
        {
          text: "Building real relationships. The people I trusted carried me through.",
          goodFor: ['loyalist', 'social_butterfly'],
          badFor: ['schemer', 'bully'],
          shift: 0,
        },
        {
          text: "Knowing when to cut ties and when to hold on. Timing won this game.",
          goodFor: ['strategist', 'schemer', 'wildcard'],
          badFor: ['loyalist'],
          shift: 0,
        },
        {
          text: "I never stopped adapting. Every week I had a new plan.",
          goodFor: ['floater', 'wildcard', 'strategist'],
          badFor: ['bully'],
          shift: 0,
        },
      ];
    }
    // Priority 6: Mild feelings — generic but still personal
    else {
      question = `${juror.name}: "I've been watching from the jury bench since week ${juror.eliminatedDay}. Tell me — why you and not one of them?"`;
      options = [
        {
          text: "I outplayed them. Every conversation, every vote — I was one step ahead.",
          goodFor: ['strategist', 'schemer', 'bully'],
          badFor: ['loyalist', 'floater'],
          shift: 0,
        },
        {
          text: "Because I played with integrity. I can look everyone in the eye.",
          goodFor: ['loyalist', 'social_butterfly'],
          badFor: ['schemer', 'bully', 'strategist'],
          shift: 0,
        },
        {
          text: "Honestly? I don't know if I deserve it more. But I'm here and I fought for it.",
          goodFor: ['floater', 'social_butterfly', 'wildcard', 'loyalist'],
          badFor: ['bully'],
          shift: 0,
        },
      ];
    }

    questions.push({ juror, question, options });
  }

  return questions;
}

/**
 * Resolve a jury answer. Matches answer tone to juror archetype.
 * Returns a lean shift: +2 (won them over), 0 (no change), -2 (pushed them away)
 */
export function resolveJuryAnswer(juror, option) {
  const archetype = juror.archetype;

  const isGood = option.goodFor.includes(archetype);
  const isBad = option.badFor.includes(archetype);

  // Bitterness caps how much a good answer can help.
  // High bitterness = even perfect words barely move them.
  // Bad answers always hit full force — salt in the wound.
  if (isGood) {
    let shift = 2;
    if (juror.bitterness >= 7) shift = 0; // too far gone
    else if (juror.bitterness >= 4) shift = 1; // grudging at best

    const messages = shift > 0 ? [
      `${juror.name} exhales. Something shifted. That answer landed.`,
      `${juror.name} nods slowly. "...Alright. I hear you."`,
      `For the first time, ${juror.name} looks at you without hostility.`,
    ] : [
      `${juror.name} listens but the anger is still there. Words aren't enough.`,
      `${juror.name}'s eyes narrow. "Easy for you to say that from up there."`,
      `The right words. But ${juror.name} remembers what you did, not what you said.`,
    ];

    return { shift, message: pick(messages) };
  }

  if (isBad) {
    // Bad answers hit harder when they're already bitter
    const shift = juror.bitterness >= 4 ? -3 : -2;

    return {
      shift,
      message: pick([
        `${juror.name}'s jaw tightens. Wrong answer.`,
        `${juror.name} scoffs. "That's exactly what I expected you to say."`,
        `You can feel it — you just lost ${juror.name}.`,
        `${juror.name} turns away. That door just closed.`,
      ]),
    };
  }

  return {
    shift: 0,
    message: pick([
      `${juror.name} gives you nothing. Unreadable.`,
      `${juror.name} shrugs. "Okay." Not moved, not offended.`,
      `A neutral response from ${juror.name}. Could go either way.`,
    ]),
  };
}

/**
 * Simulate jury votes using accumulated leans (base + Q&A shifts).
 * Lean > 0 = vote for player. Lean <= 0 = vote for best NPC.
 */
export function simulateJuryVote(jury, finalists, player, contestants) {
  const votes = [];
  const breakdown = {};

  for (const f of finalists) {
    breakdown[f.id] = { votes: 0, voters: [] };
  }

  // Find best NPC finalist for jury members who don't vote player
  const npcFinalists = finalists.filter((f) => !f.isPlayer);

  for (const juror of jury) {
    let votedFor;

    // Add noise to lean
    const finalLean = juror.lean + randInt(-1, 1);

    if (finalLean > 0 && finalists.some((f) => f.isPlayer)) {
      // Vote for player
      votedFor = player.id;
    } else {
      // Vote for the NPC they like most (or least hate)
      let bestNpc = null;
      let bestScore = -Infinity;
      for (const nf of npcFinalists) {
        const npc = contestants.find((c) => c.id === nf.id);
        if (!npc) continue;
        const rel = npc.relationships?.[juror.id] || 0;
        const archMatch = juror.archetype === npc.archetype ? 2 : 0;
        const score = rel + archMatch + randInt(0, 2);
        if (score > bestScore) {
          bestScore = score;
          bestNpc = nf.id;
        }
      }
      votedFor = bestNpc || npcFinalists[0]?.id;
    }

    votes.push({ jurorId: juror.id, jurorName: juror.name, votedFor });
    if (votedFor && breakdown[votedFor]) {
      breakdown[votedFor].votes++;
      breakdown[votedFor].voters.push(juror.name);
    }
  }

  const sorted = Object.entries(breakdown).sort((a, b) => b[1].votes - a[1].votes);
  const winnerId = sorted[0][0];
  const winner = finalists.find((f) => f.id === winnerId);

  return { votes, winner, breakdown, sorted };
}
