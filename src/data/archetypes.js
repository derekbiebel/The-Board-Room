/**
 * Each archetype defines stat weights used during NPC generation.
 * Higher weight = more points allocated to that stat on average.
 * Total budget per NPC is 45 points across 7 stats.
 */
export const ARCHETYPES = {
  schemer: {
    label: 'Corporate Shark',
    emoji: '🦈',
    weights: { ath: 0.8, soc: 1.0, snk: 1.8, lead: 0.7, cut: 1.6, res: 0.6, per: 1.2 },
    motivations: [
      'Corner office at any cost',
      'Outlast everyone through backroom deals',
      'Prove politics beats performance reviews',
    ],
  },
  loyalist: {
    label: 'Team Player',
    emoji: '🤝',
    weights: { ath: 1.0, soc: 1.2, snk: 0.5, lead: 1.4, cut: 0.4, res: 1.6, per: 1.0 },
    motivations: [
      'Protect my department to the end',
      'Get promoted with integrity intact',
      'Prove loyalty is the real KPI',
    ],
  },
  floater: {
    label: 'Quiet Quitter',
    emoji: '☕',
    weights: { ath: 0.9, soc: 1.3, snk: 1.1, lead: 0.7, cut: 0.8, res: 1.2, per: 1.3 },
    motivations: [
      'Fly under the radar until the reorg settles',
      'Let the overachievers burn each other out',
      'Stay flexible, stay employed',
    ],
  },
  bully: {
    label: 'Micromanager',
    emoji: '📋',
    weights: { ath: 1.8, soc: 0.6, snk: 0.7, lead: 1.2, cut: 1.5, res: 1.0, per: 0.5 },
    motivations: [
      'Dominate every meeting',
      'CC the entire company on everything',
      'Show everyone who really runs this floor',
    ],
  },
  wildcard: {
    label: 'Loose Cannon',
    emoji: '🎯',
    weights: { ath: 1.0, soc: 1.0, snk: 1.0, lead: 1.0, cut: 1.0, res: 1.0, per: 1.0 },
    motivations: [
      'Keep everyone guessing at the all-hands',
      'Disruption is innovation',
      'Reply-all is a strategy, not an accident',
    ],
  },
  strategist: {
    label: 'VP Material',
    emoji: '♟️',
    weights: { ath: 0.7, soc: 1.0, snk: 1.1, lead: 1.5, cut: 1.0, res: 0.9, per: 1.5 },
    motivations: [
      'Control the narrative in every 1-on-1',
      'Build the perfect org chart',
      'Outmaneuver everyone on the leadership track',
    ],
  },
  social_butterfly: {
    label: 'Office Gossip',
    emoji: '💬',
    weights: { ath: 0.7, soc: 1.8, snk: 0.6, lead: 1.0, cut: 0.5, res: 1.1, per: 1.6 },
    motivations: [
      'Be everyone\'s work bestie',
      'Climb through connections, not conflict',
      'Know every secret in the Slack channels',
    ],
  },
};

export const ARCHETYPE_KEYS = Object.keys(ARCHETYPES);
