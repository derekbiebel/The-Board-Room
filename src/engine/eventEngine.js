import { randInt, pick, shuffle } from '../utils/random';

/**
 * Weekly random events that shake up the game.
 * Returns an array of events to display + their mechanical effects.
 */
export function generateWeeklyEvents(day, contestants, player, playerCircle, npcFactions, betrayals) {
  const active = contestants.filter((c) => !c.isEliminated);
  const events = [];

  // No events in week 1-2
  if (day <= 2) return events;

  // Roll for events — chance increases as game progresses
  const eventChance = Math.min(85, 30 + (day * 4));

  // Event 1: Gossip / rumors
  if (randInt(1, 100) <= eventChance && active.length > 4) {
    const gossipEvents = [];

    // Someone is spreading rumors about you
    if (playerCircle.length >= 1) {
      gossipEvents.push(() => {
        const targets = active.filter((c) => !playerCircle.includes(c.id));
        if (targets.length < 2) return null;
        const affected = shuffle([...targets]).slice(0, 2);
        return {
          message: `Rumors are circulating about your circle. Some people are talking.`,
          effects: affected.map((c) => ({ type: 'relationship', targetId: c.id, delta: -1 })),
        };
      });
    }

    // An NPC is trash-talking you specifically
    gossipEvents.push(() => {
      const enemies = active.filter((c) => (c.relationships[player.id] || 0) <= -1);
      if (enemies.length === 0) return null;
      const enemy = pick(enemies);
      const victims = active.filter((c) => c.id !== enemy.id && !playerCircle.includes(c.id));
      if (victims.length === 0) return null;
      const victim = pick(victims);
      return {
        message: `${enemy.name} has been talking behind your back. ${victim.name} is listening.`,
        effects: [{ type: 'relationship', targetId: victim.id, delta: -1 }],
      };
    });

    // Circle member is having doubts
    if (playerCircle.length >= 2) {
      gossipEvents.push(() => {
        const member = pick(playerCircle);
        const c = contestants.find((x) => x.id === member);
        if (!c || c.isEliminated) return null;
        return {
          message: `${c.name} has been quiet lately. Something's off.`,
          effects: [{ type: 'loyalty', targetId: member, delta: -2 }],
        };
      });
    }

    const fn = pick(gossipEvents);
    const result = fn();
    if (result) events.push(result);
  }

  // Event 2: Faction aggression — factions organize against you
  if (randInt(1, 100) <= eventChance && npcFactions.length > 0 && playerCircle.length >= 2) {
    const hostileFactions = npcFactions.filter((f) => {
      const leader = active.find((c) => c.id === f.leaderId);
      return leader && (leader.relationships[player.id] || 0) <= 0;
    });

    if (hostileFactions.length > 0) {
      const faction = pick(hostileFactions);
      const factionMembers = faction.memberIds
        .map((id) => active.find((c) => c.id === id))
        .filter(Boolean);

      if (factionMembers.length >= 2) {
        events.push({
          message: `${faction.name} held a closed-door meeting. Your name came up.`,
          effects: [], // The faction targeting bonus in vote formula handles the mechanical effect
          factionTargetingPlayer: faction.id,
        });
      }
    }
  }

  // Event 3: Power shift — a strong unaligned NPC gains influence
  if (randInt(1, 100) <= Math.min(50, day * 3) && active.length > 5) {
    const unaligned = active.filter((c) =>
      !playerCircle.includes(c.id) && !c.factionId
    );
    if (unaligned.length > 0) {
      const rising = unaligned.reduce((best, c) => {
        const total = Object.values(c.stats).reduce((a, b) => a + b, 0);
        return total > (best ? Object.values(best.stats).reduce((a, b) => a + b, 0) : 0) ? c : best;
      }, null);

      if (rising) {
        const boostTargets = active
          .filter((c) => c.id !== rising.id && !playerCircle.includes(c.id))
          .slice(0, 2);

        events.push({
          message: `${rising.name} is gaining influence. People are gravitating toward them.`,
          effects: boostTargets.map((c) => ({
            type: 'npcRelationship', sourceId: rising.id, targetId: c.id, delta: 2,
          })),
        });
      }
    }
  }

  // Event 4: Leaked vote — your last vote gets exposed regardless of sneakiness
  if (randInt(1, 100) <= 15 && day > 3) {
    events.push({
      message: `Someone leaked the vote records. Everyone knows who voted for who last week.`,
      effects: [{ type: 'voteLeaked' }],
    });
  }

  // Event 5: Circle member gets approached by a faction
  if (playerCircle.length >= 1 && npcFactions.length > 0 && randInt(1, 100) <= 40) {
    const member = pick(playerCircle);
    const c = contestants.find((x) => x.id === member);
    if (c && !c.isEliminated) {
      const faction = pick(npcFactions);
      events.push({
        message: `${c.name} was seen having coffee with members of ${faction.name}. Are they being recruited?`,
        effects: [{ type: 'loyalty', targetId: member, delta: -1 }],
      });
    }
  }

  // Event 6: NPC meltdown — someone has a bad week, relationships shift
  if (randInt(1, 100) <= 35 && day >= 4) {
    const candidate = pick(active.filter((c) => !playerCircle.includes(c.id)));
    if (candidate) {
      const meltdowns = [
        { message: `${candidate.name} snapped at someone in the meeting. People are distancing themselves.`, relDelta: -1 },
        { message: `${candidate.name} got called out by management. The floor is buzzing.`, relDelta: -1 },
        { message: `${candidate.name} just landed a huge client. Suddenly everyone wants to be their friend.`, relDelta: 1 },
        { message: `${candidate.name} broke down in the break room. Some people feel bad. Others smell blood.`, relDelta: 0 },
      ];
      const m = pick(meltdowns);
      events.push({
        message: m.message,
        effects: m.relDelta !== 0 ? [{ type: 'relationship', targetId: candidate.id, delta: m.relDelta }] : [],
      });
    }
  }

  // Event 7: Management shakeup — random stat becomes critical next tribal (foreshadowing)
  if (randInt(1, 100) <= 25 && day >= 5) {
    const stats = ['ath', 'soc', 'snk', 'lead', 'cut', 'res', 'per'];
    const labels = { ath: 'image', soc: 'social skills', snk: 'discretion', lead: 'leadership', cut: 'ruthlessness', res: 'resilience', per: 'awareness' };
    const stat = pick(stats);
    events.push({
      message: `Word from upstairs: management is going to be looking at ${labels[stat]} in the next review cycle.`,
      effects: [], // no mechanical effect — just intel for the player to plan around
    });
  }

  // Cap at 2 events per week to not overwhelm
  return shuffle(events).slice(0, 2);
}

/**
 * Apply event effects to game state.
 * Returns updated contestants and player relationship changes.
 */
export function applyEventEffects(events, contestants, playerRelationships) {
  let updatedContestants = [...contestants];
  const relChanges = { ...playerRelationships };

  for (const event of events) {
    for (const effect of event.effects) {
      if (effect.type === 'relationship') {
        relChanges[effect.targetId] = Math.max(-5, Math.min(5,
          (relChanges[effect.targetId] || 0) + effect.delta
        ));
        // Also update NPC side
        updatedContestants = updatedContestants.map((c) => {
          if (c.id !== effect.targetId) return c;
          const cur = c.relationships?.['player'] || c.relationships?.[Object.keys(c.relationships)[0]] || 0;
          return {
            ...c,
            relationships: {
              ...c.relationships,
              player: Math.max(-5, Math.min(5, (c.relationships.player || 0) + effect.delta)),
            },
          };
        });
      } else if (effect.type === 'loyalty') {
        updatedContestants = updatedContestants.map((c) => {
          if (c.id !== effect.targetId) return c;
          return {
            ...c,
            circleLoyalty: Math.max(0, Math.min(10, (c.circleLoyalty || 0) + effect.delta)),
          };
        });
      } else if (effect.type === 'npcRelationship') {
        updatedContestants = updatedContestants.map((c) => {
          if (c.id !== effect.sourceId) return c;
          return {
            ...c,
            relationships: {
              ...c.relationships,
              [effect.targetId]: Math.max(-5, Math.min(5, (c.relationships[effect.targetId] || 0) + effect.delta)),
            },
          };
        });
      }
    }
  }

  return { updatedContestants, relChanges };
}
