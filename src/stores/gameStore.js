import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { generateContestants } from '../engine/contestantGen';
import { uuid, pick, shuffle, randInt } from '../utils/random';
import { getMaxCircleSize, processCircleBenefits, updateCircleLoyalty, enforceCircleCap } from '../engine/allianceEngine';
import { simulateNpcFactions, attemptPoaching } from '../engine/factionEngine';
import { generateWeeklyEvents, applyEventEffects } from '../engine/eventEngine';

const INITIAL_STATS = { ath: 1, soc: 1, snk: 1, lead: 1, cut: 1, res: 1, per: 1 };

/** Max conversations per week: starts at 6, decreases by 1 every 2 weeks, min 2 */
export function getMaxConversations(day) {
  return Math.max(4, 6 - Math.floor((day - 1) / 3));
}

const useGameStore = create(
  persist(
    (set, get) => ({
      // Meta
      screen: 'create',

      // Game state
      day: 1,
      phase: 'morning',
      conversationsToday: 0,
      eavesdropsToday: 0,
      maxEavesdrops: 3,
      circleChatsToday: 0,
      immunePlayerId: null,
      spotlightStat: null,
      gameOver: false,

      // Player
      player: {
        id: 'player',
        name: '',
        stats: { ...INITIAL_STATS },
        statPointsToAllocate: 0,
        relationships: {},
        knownInfo: {},
        circleReputation: 0, // -5 to +5
      },

      // NPCs
      contestants: [],

      // Inner Circle (player's alliance)
      playerCircle: [], // array of NPC ids

      // NPC Factions
      npcFactions: [], // { id, name, memberIds, foundedDay, leaderId }

      // Weekly intel and warnings from circle
      weeklyIntel: [],
      weeklyWarnings: [],
      weeklyEvents: [], // departure notices, poaching, etc.

      // Betrayal log
      betrayals: [],

      // Lobbying
      lobbyedVotes: {},

      // Immunity idol
      hasIdol: false,
      idolPlayed: false, // set true on the week it's used

      // Double vote token
      hasDoubleVote: false,

      // Eavesdrop intel from this week — array of { targetId, targetName, votingForId, votingForName }
      eavesdropIntel: [],
      tippedOff: false,

      // NPC rivalries discovered
      knownRivalries: [], // { npc1Id, npc1Name, npc2Id, npc2Name }

      // Discovered faction IDs (through eavesdropping)
      discoveredFactions: [],

      // Game log — tracks key decisions for endgame recap
      gameLog: [],

      // History
      eliminationLog: [],
      currentConversation: null,
      lastTribalResult: null,
      lastChallengeResult: null,

      // ──── Actions ────

      previousScreen: null,

      setScreen: (screen) => set((s) => ({ screen, previousScreen: s.screen })),

      // Character creation
      setPlayerName: (name) => set((s) => ({
        player: { ...s.player, name },
      })),

      allocateCreationPoint: (stat, delta) => set((s) => {
        const current = s.player.stats[stat];
        const newVal = current + delta;
        if (newVal < 1 || newVal > 10) return s;
        const totalSpent = Object.values(s.player.stats).reduce((a, b) => a + b, 0) - 7;
        if (delta > 0 && totalSpent >= 7) return s;
        return {
          player: { ...s.player, stats: { ...s.player.stats, [stat]: newVal } },
        };
      }),

      startGame: () => {
        const state = get();
        const contestants = generateContestants(19);
        contestants.forEach((c) => { c.relationships[state.player.id] = 0; });
        const playerRelationships = {};
        const knownInfo = {};
        const STAT_KEYS = ['ath', 'soc', 'snk', 'lead', 'cut', 'res', 'per'];

        contestants.forEach((c) => {
          playerRelationships[c.id] = 0;

          // Reveal ~2 random stats per NPC (1/3 of 7) as "reputation"
          const revealedStats = shuffle([...STAT_KEYS]).slice(0, 2);
          knownInfo[c.id] = {};
          for (const stat of revealedStats) {
            const actual = c.stats[stat];
            const fuzz = randInt(-1, 1);
            const fuzzyVal = Math.max(1, Math.min(10, actual + fuzz));
            const label = fuzzyVal <= 2 ? 'Weak' : fuzzyVal <= 4 ? 'Low' : fuzzyVal <= 6 ? 'Moderate' : fuzzyVal <= 8 ? 'Strong' : 'Exceptional';
            knownInfo[c.id][stat] = { label, value: fuzzyVal };
          }
        });

        set({
          contestants,
          player: { ...state.player, relationships: playerRelationships, circleReputation: 0, knownInfo },
          playerCircle: [],
          npcFactions: [],
          weeklyIntel: [],
          weeklyWarnings: [],
          weeklyEvents: [],
          betrayals: [],
          screen: 'camp',
          day: 1,
          conversationsToday: 0,
          eavesdropsToday: 0,
          circleChatsToday: 0,
        });
      },

      // Conversations
      startConversation: (contestantId) => set({
        currentConversation: { contestantId, goal: null, options: null, outcome: null },
        screen: 'conversation',
      }),

      setConversationGoal: (goal) => set((s) => ({
        currentConversation: { ...s.currentConversation, goal },
      })),

      setConversationOptions: (options, narration) => set((s) => ({
        currentConversation: { ...s.currentConversation, options, narration },
      })),

      setConversationOutcome: (outcome) => set((s) => {
        const isEavesdrop = s.currentConversation?.goal === 'eavesdrop';
        const contestantId = s.currentConversation?.contestantId;
        const isCircleChat = !isEavesdrop && s.playerCircle.includes(contestantId) && s.circleChatsToday < 1;
        return {
          currentConversation: { ...s.currentConversation, outcome },
          conversationsToday: s.conversationsToday + (isEavesdrop || isCircleChat ? 0 : 1),
          eavesdropsToday: s.eavesdropsToday + (isEavesdrop ? 1 : 0),
          circleChatsToday: s.circleChatsToday + (isCircleChat ? 1 : 0),
        };
      }),

      updateRelationship: (contestantId, delta) => set((s) => {
        const currentPlayerRel = s.player.relationships[contestantId] || 0;
        const newPlayerRel = Math.max(-5, Math.min(5, currentPlayerRel + delta));
        const contestants = s.contestants.map((c) => {
          if (c.id !== contestantId) return c;
          const currentNpcRel = c.relationships[s.player.id] || 0;
          return {
            ...c,
            relationships: {
              ...c.relationships,
              [s.player.id]: Math.max(-5, Math.min(5, currentNpcRel + delta)),
            },
          };
        });
        return {
          player: { ...s.player, relationships: { ...s.player.relationships, [contestantId]: newPlayerRel } },
          contestants,
        };
      }),

      // ──── Inner Circle ────

      recruitToCircle: (npcId) => set((s) => {
        const c = s.contestants.find((x) => x.id === npcId);
        if (!c) return s;
        const relationship = s.player.relationships[npcId] || 0;

        // Remove from faction if they were in one. If they were the leader, disband entirely.
        const npcFactions = s.npcFactions
          .filter((f) => f.leaderId !== npcId) // disband if leader was poached
          .map((f) => ({
            ...f,
            memberIds: f.memberIds.filter((id) => id !== npcId),
          }))
          .filter((f) => f.memberIds.length >= 2); // dissolve tiny factions

        // Find which factions were disbanded (leader poached or too small)
        const survivingFactionIds = new Set(npcFactions.map((f) => f.id));
        const disbandedMembers = new Set();
        for (const f of s.npcFactions) {
          if (!survivingFactionIds.has(f.id)) {
            f.memberIds.forEach((id) => disbandedMembers.add(id));
          }
        }

        const contestants = s.contestants.map((x) => {
          if (x.id === npcId) {
            return {
              ...x,
              circleStatus: 'member',
              circleLoyalty: Math.min(6, 1 + relationship),
              circleJoinedDay: s.day,
              factionId: null,
            };
          }
          // Clear factionId for members of disbanded factions
          if (disbandedMembers.has(x.id)) {
            return { ...x, factionId: null };
          }
          return x;
        });
        return {
          playerCircle: [...s.playerCircle, npcId],
          npcFactions,
          contestants,
        };
      }),

      removeFromCircle: (npcId, reason) => set((s) => {
        const contestants = s.contestants.map((c) => {
          if (c.id !== npcId) return c;
          return { ...c, circleStatus: reason === 'betrayal' ? 'former' : null, circleLoyalty: 0, circleJoinedDay: null };
        });
        return {
          playerCircle: s.playerCircle.filter((id) => id !== npcId),
          contestants,
        };
      }),

      recordBetrayal: (victimId, type, detected) => set((s) => ({
        betrayals: [...s.betrayals, { victimId, type, detected, day: s.day }],
        player: {
          ...s.player,
          circleReputation: detected
            ? Math.max(-5, s.player.circleReputation - 2)
            : s.player.circleReputation,
          // Undetected betrayal: +1 cut
          stats: !detected
            ? { ...s.player.stats, cut: Math.min(10, s.player.stats.cut + 1) }
            : s.player.stats,
        },
      })),

      // Idol
      findIdol: () => set({ hasIdol: true }),
      playIdol: () => set({ hasIdol: false, idolPlayed: true }),

      // Double vote
      grantDoubleVote: () => set({ hasDoubleVote: true }),
      useDoubleVote: () => set({ hasDoubleVote: false }),

      // Eavesdrop
      addEavesdropIntel: (intel) => set((s) => ({
        eavesdropIntel: [...s.eavesdropIntel, intel],
      })),

      // Rivalries
      addRivalry: (rivalry) => set((s) => ({
        knownRivalries: [...s.knownRivalries, rivalry],
      })),

      // Faction discovery
      discoverFaction: (factionId) => set((s) => ({
        discoveredFactions: s.discoveredFactions.includes(factionId) ? s.discoveredFactions : [...s.discoveredFactions, factionId],
      })),

      // Game log
      logEvent: (event) => set((s) => ({
        gameLog: [...s.gameLog, { ...event, day: s.day }],
      })),

      // Lobbying
      lobbyNpc: (npcId, targetId, strength) => set((s) => ({
        lobbyedVotes: { ...s.lobbyedVotes, [npcId]: { targetId, strength } },
      })),

      // Challenge
      setImmunity: (id) => set({ immunePlayerId: id }),
      setChallengeResult: (result) => set({ lastChallengeResult: result }),

      // Tribal
      setSpotlightStat: (stat) => set({ spotlightStat: stat }),
      setTribalResult: (result) => set({ lastTribalResult: result }),

      eliminateContestant: (contestantId) => set((s) => {
        const contestants = s.contestants.map((c) => {
          if (c.id !== contestantId) return c;
          return { ...c, isEliminated: true, eliminatedDay: s.day };
        });
        // Remove from circle if they were a member
        const playerCircle = s.playerCircle.filter((id) => id !== contestantId);
        return {
          contestants,
          playerCircle,
          eliminationLog: [...s.eliminationLog, { contestantId, day: s.day }],
        };
      }),

      // Day progression
      advanceDay: () => set((s) => {
        const nextDay = s.day + 1;
        const STAT_KEYS = ['ath', 'soc', 'snk', 'lead', 'cut', 'res', 'per'];
        const events = [];

        let contestants = s.contestants.map((c) => {
          if (c.isEliminated) return c;

          // NPC stat growth every 2 weeks
          let stats = c.stats;
          if (nextDay % 2 === 0) {
            const stat = pick(STAT_KEYS);
            stats = { ...stats, [stat]: Math.min(10, stats[stat] + 1) };
          }

          // Relationship decay — everyone decays every week
          // Hotness pro: decay every 2 weeks instead of every week if ath >= 5
          const playerRel = c.relationships[s.player.id] || 0;
          let newPlayerRel = playerRel;
          const hotProtection = s.player.stats.ath >= 5;
          const shouldDecay = hotProtection ? (nextDay % 2 === 0) : true;

          if (shouldDecay) {
            if (playerRel > 0) newPlayerRel = playerRel - 1;
            else if (playerRel < 0) newPlayerRel = playerRel + 1;
          }

          return {
            ...c,
            stats,
            relationships: { ...c.relationships, [s.player.id]: newPlayerRel },
          };
        });

        // Player relationship decay (Hotness pro applies here too)
        const newPlayerRelationships = { ...s.player.relationships };
        const hotProt = s.player.stats.ath >= 5;
        for (const id in newPlayerRelationships) {
          const shouldDecay = hotProt ? (nextDay % 2 === 0) : true;
          if (shouldDecay) {
            const val = newPlayerRelationships[id];
            if (val > 0) newPlayerRelationships[id] = val - 1;
            else if (val < 0) newPlayerRelationships[id] = val + 1;
          }
        }

        // Circle loyalty updates
        let playerCircle = [...s.playerCircle];
        const loyaltyResult = updateCircleLoyalty(playerCircle, contestants, newPlayerRelationships, s.player.stats);

        // Apply loyalty updates
        for (const { id, loyalty } of loyaltyResult.updated) {
          contestants = contestants.map((c) =>
            c.id === id ? { ...c, circleLoyalty: loyalty } : c
          );
        }

        // Process departures — leaving the circle creates bad blood
        for (const dep of loyaltyResult.departures) {
          if (dep.reason === 'low_loyalty') {
            events.push(`${dep.name} has left your inner circle. They know your secrets — and they're not happy.`);
            contestants = contestants.map((c) =>
              c.id === dep.id ? { ...c, circleStatus: 'former', circleLoyalty: 0, circleJoinedDay: null } : c
            );
            // Relationship tanks — they feel burned
            newPlayerRelationships[dep.id] = Math.max(-5, (newPlayerRelationships[dep.id] || 0) - 3);
            contestants = contestants.map((c) =>
              c.id === dep.id ? { ...c, relationships: { ...c.relationships, [s.player.id]: Math.max(-5, (c.relationships[s.player.id] || 0) - 3) } } : c
            );
          }
          playerCircle = playerCircle.filter((id) => id !== dep.id);
        }

        // Enforce circle cap (half of remaining players)
        const activeCount = contestants.filter((c) => !c.isEliminated).length;
        const maxSize = getMaxCircleSize(activeCount + 1); // +1 for player
        const capResult = enforceCircleCap(playerCircle, contestants, maxSize);
        // Soft cap: over-cap members get loyalty pressure instead of instant eviction
        if (capResult.overCapPenalties && capResult.overCapPenalties.length > 0) {
          for (const penId of capResult.overCapPenalties) {
            const penNpc = contestants.find((c) => c.id === penId);
            contestants = contestants.map((c) =>
              c.id === penId ? { ...c, circleLoyalty: Math.max(0, (c.circleLoyalty || 0) - 2) } : c
            );
            if (penNpc) {
              events.push(`${penNpc.name} is feeling squeezed in your circle. The restructuring is tightening.`);
            }
          }
        }

        // NPC faction simulation
        const npcFactions = simulateNpcFactions(contestants, s.npcFactions, nextDay, playerCircle);

        // Update contestant factionIds
        const factionMap = {};
        for (const f of npcFactions) {
          for (const mid of f.memberIds) {
            factionMap[mid] = f.id;
          }
        }
        contestants = contestants.map((c) => ({
          ...c,
          factionId: factionMap[c.id] || null,
        }));

        // Poaching attempts
        const poachAttempts = attemptPoaching(npcFactions, contestants, playerCircle, newPlayerRelationships);
        for (const poach of poachAttempts) {
          if (poach.success) {
            events.push(`${poach.targetName} has been poached by ${poach.factionName}. ${poach.recruiterName} got to them first. They chose a side — and it wasn't yours.`);
            playerCircle = playerCircle.filter((id) => id !== poach.targetId);
            // Relationship hit — they picked someone else over you
            newPlayerRelationships[poach.targetId] = Math.max(-5, (newPlayerRelationships[poach.targetId] || 0) - 2);
            contestants = contestants.map((c) => {
              if (c.id !== poach.targetId) return c;
              return { ...c, circleStatus: 'former', circleLoyalty: 0, circleJoinedDay: null, factionId: poach.factionId,
                relationships: { ...c.relationships, [s.player.id]: Math.max(-5, (c.relationships[s.player.id] || 0) - 2) } };
            });
            // Add to faction
            const faction = npcFactions.find((f) => f.id === poach.factionId);
            if (faction && !faction.memberIds.includes(poach.targetId)) {
              faction.memberIds.push(poach.targetId);
            }
          }
        }

        // Circle benefits (intel + warnings)
        const benefits = processCircleBenefits(playerCircle, contestants, s.player);

        // Persist intel into knownInfo (accumulates over time)
        const knownInfo = { ...s.player.knownInfo };
        for (const intel of benefits.intel) {
          if (!knownInfo[intel.aboutId]) knownInfo[intel.aboutId] = {};
          knownInfo[intel.aboutId][intel.stat] = { label: intel.label, value: intel.fuzzyVal };
        }

        // Generate random weekly events (drama!)
        const weeklyDrama = generateWeeklyEvents(
          nextDay, contestants, s.player, playerCircle, npcFactions, s.betrayals
        );
        const { updatedContestants: postEventContestants, relChanges } =
          applyEventEffects(weeklyDrama, contestants, newPlayerRelationships);

        // Merge event relationship changes
        for (const id in relChanges) {
          newPlayerRelationships[id] = relChanges[id];
        }

        // Add event messages to weekly events
        for (const drama of weeklyDrama) {
          events.push(drama.message);
        }

        return {
          day: nextDay,
          conversationsToday: 0,
          eavesdropsToday: 0,
          circleChatsToday: 0,
          immunePlayerId: null,
          spotlightStat: null,
          currentConversation: null,
          lastTribalResult: null,
          lastChallengeResult: null,
          lobbyedVotes: {},
          idolPlayed: false,
          eavesdropIntel: [],
          tippedOff: false,
          contestants: postEventContestants,
          npcFactions,
          playerCircle,
          player: { ...s.player, relationships: newPlayerRelationships, knownInfo },
          weeklyIntel: benefits.intel,
          weeklyWarnings: benefits.warnings,
          weeklyEvents: events,
          screen: 'camp',
        };
      }),

      // Stat allocation post-tribal
      grantStatPoint: (count = 1) => set((s) => ({
        player: { ...s.player, statPointsToAllocate: s.player.statPointsToAllocate + count },
      })),

      allocateStatPoint: (stat) => set((s) => {
        if (s.player.statPointsToAllocate <= 0) return s;
        return {
          player: {
            ...s.player,
            stats: { ...s.player.stats, [stat]: s.player.stats[stat] + 1 },
            statPointsToAllocate: s.player.statPointsToAllocate - 1,
          },
        };
      }),

      checkGameOver: () => {
        const s = get();
        const activeCount = s.contestants.filter((c) => !c.isEliminated).length;
        // At 4 NPCs remaining (5 total with player), trigger final challenge
        // Final challenge cuts 1, leaving 3 NPCs + player for jury... wait
        // Actually: 4 NPCs + player = 5. Final challenge cuts 1 = 3 NPCs + player = 4.
        // That's too many for final tribal. We need 3 finalists total.
        // So trigger at 3 NPCs (4 total). Cut 1 → 2 NPCs + player = 3 finalists. Correct.
        // BUT also catch if we somehow get to 2 or fewer without triggering
        if (activeCount <= 4) {
          if (activeCount <= 1) {
            set({ gameOver: true, screen: 'gameOver' });
            return true;
          }
          // 4 NPCs + player = 5. Final challenge cuts 2 to get to 3 finalists.
          // 3 NPCs + player = 4. Final challenge cuts 1 to get to 3 finalists.
          // 2 NPCs + player = 3. Skip straight to final tribal.
          if (activeCount <= 2) {
            set({ screen: 'finalTribal' });
          } else {
            set({ screen: 'finalChallenge' });
          }
          return true;
        }
        return false;
      },

      // Reset
      resetGame: () => set({
        screen: 'create',
        day: 1,
        phase: 'morning',
        conversationsToday: 0,
        eavesdropsToday: 0,
        immunePlayerId: null,
        spotlightStat: null,
        gameOver: false,
        player: {
          id: 'player',
          name: '',
          stats: { ...INITIAL_STATS },
          statPointsToAllocate: 0,
          relationships: {},
          knownInfo: {},
          circleReputation: 0,
        },
        contestants: [],
        playerCircle: [],
        npcFactions: [],
        weeklyIntel: [],
        weeklyWarnings: [],
        weeklyEvents: [],
        betrayals: [],
        gameLog: [],
        eliminationLog: [],
        currentConversation: null,
        lastTribalResult: null,
        lastChallengeResult: null,
        lobbyedVotes: {},
        hasIdol: false,
        idolPlayed: false,
        hasDoubleVote: false,
        eavesdropIntel: [],
        tippedOff: false,
        knownRivalries: [],
        discoveredFactions: [],
      }),
    }),
    {
      name: 'survivor-game-save',
      version: 2,
      migrate: (state, version) => {
        if (version < 2) {
          return {
            ...state,
            playerCircle: [],
            npcFactions: [],
            weeklyIntel: [],
            weeklyWarnings: [],
            weeklyEvents: [],
            betrayals: [],
            player: { ...state.player, circleReputation: 0 },
          };
        }
        return state;
      },
    }
  )
);

export default useGameStore;
