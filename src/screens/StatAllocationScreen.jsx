import useGameStore from '../stores/gameStore';
import { STAT_LABELS, STAT_ICONS } from '../components/StatBar';
import StatBar from '../components/StatBar';

const STAT_ORDER = ['ath', 'soc', 'snk', 'lead', 'cut', 'res', 'per'];

export default function StatAllocationScreen() {
  const { player, allocateStatPoint, advanceDay } = useGameStore();
  const remaining = player.statPointsToAllocate;

  const handleAllocate = (stat) => {
    allocateStatPoint(stat);
  };

  const canContinue = remaining === 0;

  return (
    <div className="flex-1 flex flex-col p-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-earth-100">Still Employed</h1>
        <p className="text-sm text-earth-600 mt-1">
          {remaining > 0
            ? `Allocate ${remaining} stat point${remaining > 1 ? 's' : ''}`
            : 'Ready to continue'
          }
        </p>
      </div>

      <div className="space-y-2 flex-1">
        {STAT_ORDER.map((stat) => (
          <div key={stat} className="bg-earth-800 border border-earth-700 rounded-lg p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-earth-100">
                {STAT_ICONS[stat]} {STAT_LABELS[stat]}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-earth-100">{player.stats[stat]}</span>
                {remaining > 0 && (
                  <button
                    onClick={() => handleAllocate(stat)}
                    className="w-7 h-7 rounded-full bg-torch text-earth-900 font-bold text-sm flex items-center justify-center hover:bg-torch-dim active:scale-90 transition-all"
                  >
                    +
                  </button>
                )}
              </div>
            </div>
            <StatBar stat={stat} value={player.stats[stat]} showNumber compact />
          </div>
        ))}
      </div>

      <button
        onClick={advanceDay}
        disabled={!canContinue}
        className="w-full mt-4 bg-torch hover:bg-torch-dim text-earth-900 font-bold py-3 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
      >
        Next Week →
      </button>
    </div>
  );
}
