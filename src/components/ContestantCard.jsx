import { ARCHETYPES } from '../data/archetypes';

const STAT_ORDER = ['ath', 'soc', 'snk', 'lead', 'cut', 'res', 'per'];
const STAT_ABBREV = {
  ath: 'HOT', soc: 'SOC', snk: 'SNK', lead: 'LDR', cut: 'CUT', res: 'RES', per: 'PER',
};

function barColor(value) {
  if (value <= 2) return 'bg-ember';
  if (value <= 4) return 'bg-red-400';
  if (value <= 6) return 'bg-sand';
  if (value <= 8) return 'bg-jungle';
  return 'bg-jungle-light';
}

function relColor(value) {
  if (value >= 3) return 'text-jungle-light';
  if (value >= 1) return 'text-jungle';
  if (value <= -3) return 'text-ember';
  if (value <= -1) return 'text-red-400';
  return 'text-earth-600';
}

export default function ContestantCard({
  contestant, relationship = 0, onApproach, disabled = false,
  isImmune = false, isCircleMember = false, knownStats = {},
  factionName = null,
}) {
  const archetype = ARCHETYPES[contestant.archetype];

  if (contestant.isEliminated) {
    return (
      <div className="relative p-3 rounded-lg border border-earth-700 bg-earth-900 opacity-30 w-full">
        <div className="flex items-center gap-2">
          <span className="text-lg">{archetype?.emoji || '👤'}</span>
          <div>
            <div className="text-sm font-bold text-earth-100">{contestant.name}</div>
            <div className="text-xs text-ember">Week {contestant.eliminatedDay}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => onApproach?.(contestant.id)}
      disabled={disabled}
      className={`
        relative rounded-lg border text-left transition-all w-full
        ${disabled
          ? `${isCircleMember ? 'border-torch/40' : 'border-earth-700'} bg-earth-800 cursor-not-allowed opacity-60`
          : `${isCircleMember ? 'border-torch/40' : 'border-earth-700'} bg-earth-800 hover:border-torch hover:torch-glow cursor-pointer active:scale-[0.98]`
        }
      `}
    >
      {/* Top section: avatar, name, relationship */}
      <div className="flex items-center gap-2 p-3 pb-2">
        <span className="text-xl">{archetype?.emoji || '👤'}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold text-earth-100 truncate">{contestant.name}</span>
            {isCircleMember && <span className="text-[10px]">🤝</span>}
            {isImmune && (
              <span className="text-[10px] bg-torch text-earth-900 px-1 rounded-full font-bold">SAFE</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-earth-600">{archetype?.label}</span>
            {factionName && (
              <span className="text-[10px] text-sand truncate">· {factionName}</span>
            )}
          </div>
        </div>
        <div className="text-right shrink-0">
          <span className={`text-sm font-bold ${relColor(relationship)}`}>
            {relationship > 0 ? '+' : ''}{relationship}
          </span>
          <div className="text-[10px] text-earth-600">rel</div>
        </div>
      </div>

      {/* Stat bars */}
      <div className="px-3 pb-2.5 space-y-0.5">
        {STAT_ORDER.map((stat) => {
          const known = knownStats[stat];
          const value = known ? (typeof known === 'object' ? known.value : known) : null;
          const label = known ? (typeof known === 'object' ? known.label : null) : null;

          return (
            <div key={stat} className="flex items-center gap-1">
              <span className="text-[10px] text-earth-600 w-6 font-mono">{STAT_ABBREV[stat]}</span>
              <div className="flex-1 h-1.5 bg-earth-700 rounded-full overflow-hidden relative">
                {value != null ? (
                  <div
                    className={`h-full rounded-full ${barColor(value)} opacity-70`}
                    style={{
                      marginLeft: `${(Math.max(0, value - 2) / 10) * 100}%`,
                      width: `${(Math.min(10, value + 1) - Math.max(0, value - 2)) / 10 * 100}%`,
                    }}
                  />
                ) : (
                  <div className="h-full rounded-full bg-earth-600/30" style={{ width: '100%' }} />
                )}
              </div>
              <span className="text-[10px] w-8 text-right">
                {value != null ? (
                  <span className={`${barColor(value).replace('bg-', 'text-')}`}>{Math.max(1, value - 1)}-{Math.min(10, value + 1)}</span>
                ) : (
                  <span className="text-earth-600">???</span>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </button>
  );
}
