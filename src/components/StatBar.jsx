const STAT_LABELS = {
  ath: 'Hotness',
  soc: 'Social Skills',
  snk: 'Sneakiness',
  lead: 'Leadership',
  cut: 'Cutthroat',
  res: 'Resilience',
  per: 'Perception',
};

const STAT_ICONS = {
  ath: '🔥',
  soc: '💬',
  snk: '🐍',
  lead: '👑',
  cut: '🗡️',
  res: '🛡️',
  per: '👁️',
};

/** Fuzzy label for NPC stats (never show raw numbers) */
function fuzzyLabel(value) {
  if (value <= 2) return 'Weak';
  if (value <= 4) return 'Low';
  if (value <= 6) return 'Moderate';
  if (value <= 8) return 'Strong';
  return 'Exceptional';
}

export default function StatBar({ stat, value, showNumber = false, compact = false }) {
  const pct = (value / 10) * 100;
  const label = STAT_LABELS[stat] || stat;
  const icon = STAT_ICONS[stat] || '';

  return (
    <div className={compact ? 'mb-1' : 'mb-2'}>
      <div className="flex justify-between items-center mb-0.5">
        <span className="text-xs text-earth-300">
          {icon} {label}
        </span>
        <span className="text-xs text-earth-600">
          {showNumber ? value : fuzzyLabel(value)}
        </span>
      </div>
      <div className="w-full h-1.5 bg-earth-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-torch rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export { STAT_LABELS, STAT_ICONS, fuzzyLabel };
