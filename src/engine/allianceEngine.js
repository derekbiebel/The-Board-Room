import { randInt, pick } from '../utils/random';

/**
 * Get max circle size: half of remaining players (rounded down), min 1
 */
export function getMaxCircleSize(activeCount) {
  return Math.max(1, Math.floor(activeCount / 2));
}

/**
 * Check if an NPC will accept a circle recruitment.
 * Called after a successful stat check (partial or strong success).
 *
 * @returns {{ accepted: boolean, reason: string }}
 */
export function checkRecruitAcceptance({
  relationship,
  outcomeTier,
  npcStats,
  npcArchetype,
  circleSize,
  npcFactionId,
  npcCircleStatus,
  playerCircleReputation,
  playerSnk = 1,
}) {
  // Former members never rejoin
  if (npcCircleStatus === 'former') {
    return { accepted: false, reason: 'They remember what happened last time. No chance.' };
  }

  let score = 0;

  // Relationship is the biggest factor
  score += relationship * 2;

  // Conversation outcome
  if (outcomeTier === 'strong_success') score += 4;
  else if (outcomeTier === 'partial_success') score += 2;

  // Archetype personality
  const archetypeBonus = {
    loyalist: 3,
    floater: 1,
    social_butterfly: 2,
    wildcard: 0,
    strategist: -1,
    schemer: -2,
    bully: -2,
  };
  score += archetypeBonus[npcArchetype] || 0;

  // Cutthroat NPCs are harder to recruit
  score -= (npcStats.cut || 1) * 0.5;

  // Bigger circles are harder to join
  score -= circleSize * 1.5;

  // Unaligned NPCs are easier
  score += npcFactionId ? -2 : 1;

  // Player reputation matters
  score += playerCircleReputation;

  // Sneakiness con: people don't trust the sneaky one
  if (playerSnk >= 8) score -= 2;

  const threshold = 5;
  const accepted = score >= threshold;

  if (!accepted) {
    const reasons = [
      `They don't trust the politics of your circle right now.`,
      `They smile politely but change the subject. Not interested.`,
      `"I appreciate the offer, but I need to keep my options open."`,
      `They glance around nervously. "Maybe later."`,
    ];
    return { accepted: false, reason: pick(reasons) };
  }

  const acceptReasons = [
    `They extend a hand. "I'm in. Let's do this."`,
    `A nod. "About time someone asked. Count me in."`,
    `"You had me at 'watching each other's backs.' Deal."`,
    `They look relieved. "I was hoping you'd ask."`,
  ];
  return { accepted: true, reason: pick(acceptReasons) };
}

/**
 * Process weekly circle benefits: intel from allies and loyalty drift.
 * Returns { intel, warnings, circleChanges }
 */
export function processCircleBenefits(playerCircle, contestants, player) {
  const intel = [];
  const warnings = [];
  const active = contestants.filter((c) => !c.isEliminated);
  const nonCircle = active.filter((c) => !playerCircle.includes(c.id));

  for (const memberId of playerCircle) {
    const member = contestants.find((c) => c.id === memberId);
    if (!member || member.isEliminated) continue;

    // Intel: share a fuzzy stat about a random non-circle NPC
    if (nonCircle.length > 0) {
      const target = pick(nonCircle);
      const statKeys = Object.keys(target.stats);
      const stat = pick(statKeys);
      const actual = target.stats[stat];
      const fuzz = randInt(-1, 1);
      const fuzzyVal = Math.max(1, Math.min(10, actual + fuzz));
      const label = fuzzyLabel(fuzzyVal);

      intel.push({
        fromId: memberId,
        fromName: member.name,
        aboutId: target.id,
        aboutName: target.name,
        stat,
        label,
        fuzzyVal,
      });
    }

    // Warnings: sneaky allies can detect if player is being targeted
    if (member.stats.snk >= 5) {
      const warningChance = member.stats.snk * 10;
      if (randInt(1, 100) <= warningChance) {
        // Check if any NPC has high animosity toward player
        const threats = active.filter((c) =>
          c.id !== memberId &&
          !playerCircle.includes(c.id) &&
          (c.relationships[player.id] || 0) <= -2
        );
        if (threats.length > 0) {
          const threat = pick(threats);
          warnings.push({
            fromId: memberId,
            fromName: member.name,
            message: `${member.name} pulls you aside: "Watch out for ${threat.name}. They've been talking."`,
          });
        }
      }
    }
  }

  return { intel, warnings };
}

/**
 * Update circle loyalty for all members. Called each week.
 * Loyalty drifts toward relationship. Low loyalty members may leave.
 *
 * @returns {{ updated: Array, departures: Array }}
 */
export function updateCircleLoyalty(playerCircle, contestants, playerRelationships, playerStats = {}) {
  const departures = [];
  const updated = [];

  for (const memberId of playerCircle) {
    const member = contestants.find((c) => c.id === memberId);
    if (!member || member.isEliminated) {
      departures.push({ id: memberId, reason: 'eliminated' });
      continue;
    }

    let loyalty = member.circleLoyalty || 3;
    const relationship = playerRelationships[memberId] || 0;

    // Loyalty drifts directly toward relationship each week (no buffer)
    if (loyalty > relationship) loyalty -= 1;
    else if (loyalty < relationship) loyalty += 1;

    // Leadership con: high lead makes circle members feel like pawns
    if ((playerStats.lead || 1) >= 7) loyalty -= 1;

    loyalty = Math.max(0, Math.min(10, loyalty));

    // Members with low loyalty may leave (threshold 3)
    if (loyalty <= 3) {
      const leaveChance = (4 - loyalty) * 15; // loyalty 3=15%, 2=30%, 1=45%, 0=60%
      if (randInt(1, 100) <= leaveChance) {
        departures.push({
          id: memberId,
          name: member.name,
          reason: 'low_loyalty',
        });
        continue;
      }
    }

    updated.push({ id: memberId, loyalty });
  }

  return { updated, departures };
}

/**
 * Process a betrayal (player voted for a circle member).
 *
 * @returns {{ detected: boolean, message: string }}
 */
export function processBetrayal(playerSnk, victimPer) {
  const detectionChance = Math.max(15, 50 + (victimPer * 3) - (playerSnk * 4));
  const roll = randInt(1, 100);
  const detected = roll <= detectionChance;

  return {
    detected,
    detectionChance,
  };
}

/**
 * Enforce circle cap: if circle exceeds max, lowest loyalty member leaves.
 */
export function enforceCircleCap(playerCircle, contestants, maxSize) {
  if (playerCircle.length <= maxSize) return { newCircle: playerCircle, removed: null };

  // Find lowest loyalty member
  let lowestId = null;
  let lowestLoyalty = Infinity;

  for (const id of playerCircle) {
    const c = contestants.find((x) => x.id === id);
    if (!c) continue;
    const loyalty = c.circleLoyalty || 0;
    if (loyalty < lowestLoyalty) {
      lowestLoyalty = loyalty;
      lowestId = id;
    }
  }

  if (lowestId) {
    return {
      newCircle: playerCircle.filter((id) => id !== lowestId),
      removed: contestants.find((c) => c.id === lowestId),
    };
  }

  return { newCircle: playerCircle, removed: null };
}

function fuzzyLabel(value) {
  if (value <= 2) return 'Weak';
  if (value <= 4) return 'Low';
  if (value <= 6) return 'Moderate';
  if (value <= 8) return 'Strong';
  return 'Exceptional';
}
