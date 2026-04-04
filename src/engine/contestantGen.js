import { ARCHETYPES, ARCHETYPE_KEYS } from '../data/archetypes';
import { FIRST_NAMES } from '../data/names';
import { randInt, pick, shuffle, uuid } from '../utils/random';

const STAT_KEYS = ['ath', 'soc', 'snk', 'lead', 'cut', 'res', 'per'];
const TOTAL_BUDGET = 30;
const MIN_STAT = 1;
const MAX_STAT = 10;

/**
 * Distribute `budget` points across stats using archetype weights.
 * Every stat starts at 1 (costs 7 of the 45), leaving 38 to distribute.
 */
function distributeStats(weights) {
  const stats = {};
  STAT_KEYS.forEach((k) => (stats[k] = MIN_STAT));
  let remaining = TOTAL_BUDGET - STAT_KEYS.length * MIN_STAT;

  // Weighted random distribution
  const totalWeight = STAT_KEYS.reduce((sum, k) => sum + weights[k], 0);

  // Distribute in rounds to avoid clumping
  while (remaining > 0) {
    const key = weightedPick(STAT_KEYS, weights, totalWeight);
    if (stats[key] < MAX_STAT) {
      stats[key]++;
      remaining--;
    }
  }

  return stats;
}

function weightedPick(keys, weights, totalWeight) {
  let r = Math.random() * totalWeight;
  for (const k of keys) {
    r -= weights[k];
    if (r <= 0) return k;
  }
  return keys[keys.length - 1];
}

/**
 * Generate `count` NPC contestants with diverse archetypes.
 */
export function generateContestants(count = 19) {
  const names = shuffle([...FIRST_NAMES]).slice(0, count);

  // Ensure at least 2 of each archetype, fill the rest randomly
  const archetypePool = [];
  ARCHETYPE_KEYS.forEach((key) => {
    archetypePool.push(key, key);
  });
  // 14 assigned, need 5 more random
  while (archetypePool.length < count) {
    archetypePool.push(pick(ARCHETYPE_KEYS));
  }
  shuffle(archetypePool);

  return names.map((name, i) => {
    const archetypeKey = archetypePool[i];
    const archetype = ARCHETYPES[archetypeKey];
    const stats = distributeStats(archetype.weights);

    return {
      id: uuid(),
      name,
      archetype: archetypeKey,
      stats,
      hiddenStats: pickHiddenStats(),
      motivation: pick(archetype.motivations),
      motivationRevealed: false,
      isEliminated: false,
      eliminatedDay: null,
      relationships: {}, // keyed by other contestant/player id
      factionId: null,
      circleStatus: null, // null | 'member' | 'former'
      circleLoyalty: 0,
      circleJoinedDay: null,
      suspicion: 0,
    };
  });
}

/** Pick 2 random stats to hide from the player initially */
function pickHiddenStats() {
  const candidates = shuffle([...STAT_KEYS]);
  return candidates.slice(0, 2);
}
