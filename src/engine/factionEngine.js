import { FACTION_NAMES } from '../data/factions';
import { randInt, pick, shuffle, uuid } from '../utils/random';

/**
 * Simulate NPC faction formation and evolution.
 * Runs every 2 weeks after week 3.
 */
export function simulateNpcFactions(contestants, npcFactions, day, playerCircle) {
  // Only evolve factions every 2 weeks, starting after week 3
  if (day < 3 || day % 2 !== 0) return npcFactions;

  const active = contestants.filter((c) => !c.isEliminated);
  let factions = [...npcFactions];

  // Remove dead factions (1 or fewer active members) and leaderless factions
  factions = factions.filter((f) => {
    const aliveMembers = f.memberIds.filter((id) =>
      active.some((c) => c.id === id)
    );
    if (aliveMembers.length < 2) return false;
    // If leader was eliminated, faction disbands
    if (!active.some((c) => c.id === f.leaderId)) return false;
    return true;
  }).map((f) => ({
    ...f,
    memberIds: f.memberIds.filter((id) => active.some((c) => c.id === id)),
  }));

  // Find unaligned NPCs (not in a faction, not in player's circle)
  const allFactionIds = new Set(factions.flatMap((f) => f.memberIds));
  const circleSet = new Set(playerCircle);
  const unaligned = active.filter((c) =>
    !allFactionIds.has(c.id) && !circleSet.has(c.id)
  );

  // Formation: high soc/lead NPCs try to start factions (cap at 4 total factions)
  if (factions.length < 4) {
    const leaders = unaligned.filter((c) => c.stats.soc >= 6 || c.stats.lead >= 6);
    for (const leader of shuffle([...leaders]).slice(0, 1)) {
      // Find compatible unaligned NPCs
      const candidates = unaligned.filter((c) => {
        if (c.id === leader.id) return false;
        const rel = leader.relationships[c.id] || 0;
        return rel >= 0 || c.archetype === leader.archetype;
      });

      if (candidates.length >= 1) {
        const recruits = shuffle([...candidates]).slice(0, randInt(1, 2));
        const usedNames = new Set(factions.map((f) => f.name));
        const availableNames = FACTION_NAMES.filter((n) => !usedNames.has(n));
        const name = availableNames.length > 0 ? pick(availableNames) : `Faction ${factions.length + 1}`;

        factions.push({
          id: uuid(),
          name,
          memberIds: [leader.id, ...recruits.map((r) => r.id)],
          foundedDay: day,
          leaderId: leader.id,
        });

        // Remove recruited NPCs from unaligned pool
        const recruitedSet = new Set([leader.id, ...recruits.map((r) => r.id)]);
        // Update allFactionIds
        recruitedSet.forEach((id) => allFactionIds.add(id));
      }
    }
  }

  // Existing factions try to recruit unaligned NPCs (max faction size 4)
  const stillUnaligned = active.filter((c) =>
    !allFactionIds.has(c.id) && !circleSet.has(c.id)
  );

  for (const faction of factions) {
    if (faction.memberIds.length >= 4) continue;
    if (stillUnaligned.length === 0) break;

    const candidates = stillUnaligned.filter((c) => {
      return faction.memberIds.some((mid) => {
        const member = active.find((x) => x.id === mid);
        return member && (member.relationships[c.id] || 0) >= 0;
      });
    });

    if (candidates.length > 0 && randInt(1, 100) <= 30) {
      const recruit = pick(candidates);
      faction.memberIds.push(recruit.id);
      allFactionIds.add(recruit.id);
      // Remove from stillUnaligned
      const idx = stillUnaligned.indexOf(recruit);
      if (idx >= 0) stillUnaligned.splice(idx, 1);
    }
  }

  return factions;
}

/**
 * Get the vote target chosen by a faction's leader.
 * The highest-lead member picks the weakest non-faction NPC to target.
 */
export function getFactionLeaderTarget(faction, contestants, playerId, playerCircleSize = 0) {
  const active = contestants.filter((c) => !c.isEliminated);
  const factionSet = new Set(faction.memberIds);

  // Find faction leader (highest lead stat)
  let leader = null;
  let highestLead = -1;
  for (const id of faction.memberIds) {
    const c = active.find((x) => x.id === id);
    if (c && c.stats.lead > highestLead) {
      highestLead = c.stats.lead;
      leader = c;
    }
  }

  if (!leader) return null;

  // Leader picks target — player gets extra threat from large circle
  const targets = active.filter((c) => !factionSet.has(c.id));
  let bestTarget = null;
  let worstScore = Infinity;

  for (const t of targets) {
    const rel = leader.relationships[t.id] || 0;
    if (rel < worstScore) {
      worstScore = rel;
      bestTarget = t.id;
    }
  }

  // Player as target — circle size makes player a bigger threat to factions
  const playerRel = leader.relationships[playerId] || 0;
  const playerThreat = playerRel - (playerCircleSize * 1.5); // big circle = big threat
  if (playerThreat < worstScore) {
    bestTarget = playerId;
  }

  return bestTarget;
}

/**
 * Attempt to poach a player's circle member into an NPC faction.
 * Returns array of poach attempts: { factionId, targetId, success }
 */
export function attemptPoaching(npcFactions, contestants, playerCircle, playerRelationships) {
  const attempts = [];
  const active = contestants.filter((c) => !c.isEliminated);

  for (const faction of npcFactions) {
    if (faction.memberIds.length >= 4) continue;

    // Find faction members with decent soc who could recruit
    const recruiters = faction.memberIds
      .map((id) => active.find((c) => c.id === id))
      .filter((c) => c && c.stats.soc >= 4);

    for (const recruiter of recruiters) {
      for (const circleId of playerCircle) {
        const target = active.find((c) => c.id === circleId);
        if (!target) continue;

        const recruiterRel = recruiter.relationships[circleId] || 0;
        const playerRel = playerRelationships[circleId] || 0;
        const loyalty = target.circleLoyalty || 3;

        // Attempt if recruiter has decent relationship OR target has low loyalty
        if ((recruiterRel >= 1 && loyalty <= 5) || loyalty <= 3) {
          const poachChance = 10 + (recruiterRel * 5) + ((6 - loyalty) * 8);
          if (randInt(1, 100) <= poachChance) {
            attempts.push({
              factionId: faction.id,
              factionName: faction.name,
              targetId: circleId,
              targetName: target.name,
              recruiterName: recruiter.name,
              success: true,
            });
          }
        }
      }
    }
  }

  return attempts;
}
