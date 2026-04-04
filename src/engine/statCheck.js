import { randInt } from '../utils/random';

/**
 * Resolve a stat check between player and NPC.
 * Returns an outcome object with result tier and relationship delta.
 *
 * Formula: advantage = playerStat - npcStat, roll = random(-2, 2)
 * outcome_score = advantage + roll
 */
export function resolveStatCheck(playerStat, npcStat) {
  const advantage = playerStat - npcStat;
  const roll = randInt(-2, 2);
  const score = advantage + roll;

  if (score >= 2) {
    return { score, tier: 'strong_success', relationshipDelta: 2, label: 'Strong Success' };
  } else if (score >= 0) {
    return { score, tier: 'partial_success', relationshipDelta: 1, label: 'Partial Success' };
  } else if (score >= -2) {
    return { score, tier: 'neutral', relationshipDelta: 0, label: 'Neutral' };
  } else if (score >= -4) {
    return { score, tier: 'partial_fail', relationshipDelta: -1, label: 'Partial Fail' };
  } else {
    return { score, tier: 'hard_fail', relationshipDelta: -2, label: 'Hard Fail' };
  }
}

/**
 * Stat mapping: which player stat vs which NPC stat per conversation goal
 */
export const CONVERSATION_GOALS = [
  { key: 'trust', label: 'Water Cooler Chat', playerStat: 'soc', npcStat: 'soc', playerStatLabel: 'Social Skills', npcStatLabel: 'Social Skills', icon: '☕' },
  { key: 'charm', label: 'Turn on the Charm', playerStat: 'ath', npcStat: 'per', playerStatLabel: 'Hotness', npcStatLabel: 'Perception', icon: '😏' },
  { key: 'probe', label: 'Dig for Intel', playerStat: 'per', npcStat: 'snk', playerStatLabel: 'Perception', npcStatLabel: 'Sneakiness', icon: '🔍' },
  { key: 'threaten', label: 'Power Move', playerStat: 'cut', npcStat: 'res', playerStatLabel: 'Cutthroat', npcStatLabel: 'Resilience', icon: '⚡' },
  { key: 'inspire', label: 'Rally the Team', playerStat: 'lead', npcStat: 'lead', playerStatLabel: 'Leadership', npcStatLabel: 'Leadership', icon: '📈' },
  { key: 'sabotage', label: 'Throw Under Bus', playerStat: 'snk', npcStat: 'per', playerStatLabel: 'Sneakiness', npcStatLabel: 'Perception', icon: '🚌' },
];

// Recruit goal is separate — only shown when conditions are met
export const RECRUIT_GOAL = {
  key: 'recruit', label: 'Bring Into Your Circle', playerStat: 'soc', npcStat: 'soc', playerStatLabel: 'Social Skills', npcStatLabel: 'Social Skills', icon: '🤝',
};
