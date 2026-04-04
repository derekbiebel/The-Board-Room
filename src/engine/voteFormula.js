import { randInt, pick } from '../utils/random';
import { getFactionLeaderTarget } from './factionEngine';

const STAT_KEYS = ['ath', 'soc', 'snk', 'lead', 'cut', 'res', 'per'];

/**
 * Tribal spotlight: pick a stat weighted by game phase.
 * Early game = social/image. Mid game = political/sneaky. Late game = ruthless.
 */
export function pickTribalSpotlight(day = 1) {
  let pool;
  if (day <= 4) {
    // Early: social and image focused
    pool = ['ath', 'soc', 'ath', 'soc', 'lead', 'per', 'res'];
  } else if (day <= 9) {
    // Mid: political maneuvering, sneakiness matters
    pool = ['snk', 'lead', 'per', 'snk', 'lead', 'soc', 'cut'];
  } else {
    // Late: ruthless, survival of the fittest
    pool = ['cut', 'lead', 'snk', 'cut', 'res', 'ath', 'per'];
  }
  return pick(pool);
}

export const SPOTLIGHT_DESCRIPTIONS = {
  ath: 'The board is paying attention to optics. Image matters this week.',
  soc: 'Office politics are heating up — alliances are under the microscope.',
  snk: 'Rumors about leaked emails have the whole floor on edge.',
  lead: 'The board wants someone who can actually step up and lead.',
  cut: 'People are watching for who might be coasting on their title.',
  res: 'After a brutal quarter, leadership is weeding out the weak.',
  per: 'Someone\'s been sloppy — and HR is paying attention.',
};

/**
 * Calculate NPC vote targets.
 * Returns an array of { voterId, targetId } for each active NPC.
 *
 * @param {Array} contestants - all contestants (active + eliminated)
 * @param {string} playerId - the player's id
 * @param {object} playerStats - player's stat object
 * @param {Record<string, number>} playerRelationships - player's relationships
 * @param {string|null} immuneId - id of immune contestant (or 'player')
 * @param {string} spotlightStat - the stat being spotlighted
 * @param {object} lobbyedVotes - { [npcId]: { targetId, strength } }
 * @param {string[]} playerCircle - ids of player's inner circle members
 * @param {Array} npcFactions - NPC faction objects
 * @param {string|null} playerVoteTarget - who the player voted for (for circle coordination)
 */
export function simulateVotes(contestants, playerId, playerStats, playerRelationships, immuneId, spotlightStat, lobbyedVotes = {}, playerCircle = [], npcFactions = [], playerVoteTarget = null, day = 1) {
  const active = contestants.filter((c) => !c.isEliminated);
  const votes = [];

  // Build list of valid vote targets (everyone active + player, minus immune)
  const allTargets = [
    ...active.map((c) => ({
      id: c.id,
      stats: c.stats,
      relationshipGetter: (voterId) => c.relationships[voterId] || 0,
    })),
    {
      id: playerId,
      stats: playerStats,
      relationshipGetter: (voterId) => {
        const c = contestants.find((x) => x.id === voterId);
        return c ? (c.relationships[playerId] || 0) : 0;
      },
    },
  ].filter((t) => t.id !== immuneId && (immuneId !== 'player' || t.id !== playerId));

  // Find lowest spotlight stat holder for +2 bonus
  // Player exempt from spotlight targeting during grace period (weeks 1-2)
  let lowestSpotlightId = null;
  let lowestSpotlightVal = Infinity;
  for (const t of allTargets) {
    if (t.id === playerId && day <= 2) continue; // grace period: can't be spotlighted
    const val = t.stats[spotlightStat] || 1;
    if (val < lowestSpotlightVal) {
      lowestSpotlightVal = val;
      lowestSpotlightId = t.id;
    }
  }

  // Precompute faction leader targets
  const factionTargets = {};
  const circleSet = new Set(playerCircle);
  for (const faction of npcFactions) {
    const target = getFactionLeaderTarget(faction, contestants, playerId, playerCircle.length);
    if (target) factionTargets[faction.id] = target;
  }

  // Each active NPC casts a vote
  for (const voter of active) {
    let bestTarget = null;
    let bestScore = -Infinity;

    for (const target of allTargets) {
      if (target.id === voter.id) continue; // can't vote for self

      // Weakness score: normalized per-stat average so player isn't penalized for lower budget
      const statSum = Object.values(target.stats).reduce((a, b) => a + b, 0);
      const statCount = Object.keys(target.stats).length;
      const avgStat = statSum / statCount;
      const weakness = Math.max(0, (3.0 - avgStat)); // only significantly below-average targets get weakness penalty

      // Relationship: negative = more likely to vote against, positive = protective
      // Stronger multiplier makes relationships the primary driver of votes
      const rel = target.id === playerId
        ? (voter.relationships[playerId] || 0)
        : target.relationshipGetter(voter.id);
      const animosity = rel * -2.5;

      // Spotlight bonus
      const spotlight = target.id === lowestSpotlightId ? 2 : 0;

      // Lobby bonus: if the player convinced this NPC to vote for this target
      let lobbyBonus = 0;
      const lobby = lobbyedVotes[voter.id];
      if (lobby && lobby.targetId === target.id) {
        // Strong success = very likely to follow, partial = moderate influence
        lobbyBonus = lobby.strength === 'strong' ? 6 : 3;
      }

      // Circle coordination: circle members tend to vote with player, BUT can resist
      let circleBonus = 0;
      if (circleSet.has(voter.id) && playerVoteTarget) {
        const voterData = contestants.find((c) => c.id === voter.id);
        const loyalty = voterData?.circleLoyalty || 3;

        if (playerVoteTarget === target.id) {
          // Pull toward player's target, scaled by loyalty
          circleBonus = 2 + (loyalty * 0.5); // 2.5 to 7 depending on loyalty

          // Resistance: if circle member likes the target, they push back
          const voterRelWithTarget = voterData?.relationships?.[target.id] || 0;
          if (voterRelWithTarget >= 2) {
            circleBonus -= voterRelWithTarget * 1.5; // strong friendships override weak loyalty
          }
        }

        // Counter-pull: if a faction is pressuring this circle member
        if (voterData?.factionId) {
          // Shouldn't happen (circle members aren't in factions), but guard it
        } else {
          // Check if any faction leader has positive relationship with this circle member
          for (const faction of npcFactions) {
            const leaderTarget = factionTargets[faction.id];
            if (!leaderTarget) continue;
            const leader = contestants.find((c) => c.id === faction.leaderId);
            if (!leader) continue;
            const leaderRelWithMember = leader.relationships?.[voter.id] || 0;
            if (leaderRelWithMember >= 2 && leaderTarget === target.id) {
              // Faction leader is lobbying your circle member
              circleBonus += (leaderRelWithMember - 1); // faction influence competes
            }
          }
        }
      }

      // Faction protection: faction members are less likely to vote for each other
      let factionBonus = 0;
      const voterFaction = voter.factionId;
      if (voterFaction) {
        const targetContestant = contestants.find((c) => c.id === target.id);
        // Protect faction-mates
        if (targetContestant?.factionId === voterFaction) {
          factionBonus = -4;
        }
        // Follow faction leader's target
        if (factionTargets[voterFaction] === target.id) {
          factionBonus += 4;
        }
      }

      // New hire grace period
      let graceBonus = 0;
      if (target.id === playerId) {
        if (day <= 2) graceBonus = -3;
        else if (day <= 4) graceBonus = -1;
      }

      // Trait effects and circle threat on voting
      let threatBonus = 0;
      if (target.id === playerId) {
        if (playerStats.ath >= 7) threatBonus += 1; // Hotness con: threat
        if (playerStats.lead >= 6) threatBonus += 1; // Leadership con: threat
        if (playerStats.per >= 5) threatBonus -= 1; // Perception pro: harder to blindside

        // Circle threat: bigger circles make you a target, but scales sub-linearly
        if (!circleSet.has(voter.id) && playerCircle.length >= 2) {
          threatBonus += Math.round(Math.sqrt(playerCircle.length) * 1.5); // 2=+2, 3=+3, 4=+3, 6=+4
        }
      }

      // Noise — wider range adds more unpredictability
      const noise = randInt(-2, 2);

      const score = weakness + animosity + spotlight + lobbyBonus + circleBonus + factionBonus + threatBonus + graceBonus + noise;

      if (score > bestScore) {
        bestScore = score;
        bestTarget = target.id;
      }
    }

    votes.push({ voterId: voter.id, targetId: bestTarget });
  }

  return votes;
}

/**
 * Tally votes and determine who is eliminated.
 * Player vote is weighted by their lead stat.
 */
export function tallyVotes(npcVotes, playerVote, playerLeadStat) {
  const tally = {};

  // Player vote weight: 1 normally, 2 if strong leader (threshold 7)
  let playerWeight = 1;
  if (playerLeadStat >= 7) playerWeight = 2;

  // Count NPC votes
  for (const { targetId } of npcVotes) {
    tally[targetId] = (tally[targetId] || 0) + 1;
  }

  // Add player vote
  if (playerVote) {
    tally[playerVote] = (tally[playerVote] || 0) + playerWeight;
  }

  // Sort by votes descending
  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);

  return {
    tally,
    sorted,
    eliminatedId: sorted[0]?.[0] || null,
    totalVotes: sorted,
  };
}
