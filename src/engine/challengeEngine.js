import { randInt } from '../utils/random';

/**
 * Resolve a stat-check immunity challenge.
 * Player picks a stat, all active contestants compete using that same stat.
 *
 * Score = stat value + random(1, 4)
 *
 * @param {number} playerStatValue - player's chosen stat value
 * @param {string} statKey - which stat was chosen
 * @param {Array} contestants - active contestants
 * @returns {{ rankings: Array, winnerId: string|'player', playerRank: number }}
 */
export function resolveChallenge(playerStatValue, statKey, contestants, playerId) {
  const results = [];

  // Player entry
  results.push({
    id: playerId,
    name: 'You',
    score: playerStatValue + randInt(1, 4),
    isPlayer: true,
  });

  // NPC entries
  for (const c of contestants) {
    if (c.isEliminated) continue;
    results.push({
      id: c.id,
      name: c.name,
      score: (c.stats[statKey] || 1) + randInt(1, 4),
      isPlayer: false,
    });
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  const playerRank = results.findIndex((r) => r.isPlayer) + 1;

  return {
    rankings: results,
    winnerId: results[0].id,
    winnerName: results[0].name,
    playerRank,
    playerWon: results[0].isPlayer,
  };
}

/** Flavor descriptions for challenge scenarios */
export const CHALLENGE_SCENARIOS = [
  { stat: 'ath', text: 'The company headshot day. First impressions matter to the board.' },
  { stat: 'soc', text: 'A cross-department negotiation — who can close the deal?' },
  { stat: 'snk', text: 'A confidential audit. Someone left evidence in the shared drive.' },
  { stat: 'lead', text: 'The CEO wants a new initiative lead. Pitch your vision.' },
  { stat: 'cut', text: 'Budget cuts. Only the most ruthless proposal survives.' },
  { stat: 'res', text: 'Back-to-back Zoom calls for 8 hours. Last one focused wins.' },
  { stat: 'per', text: 'A forensic dive into the Q3 numbers. Find the discrepancy first.' },
];
