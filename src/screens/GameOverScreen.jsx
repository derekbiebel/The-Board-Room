import useGameStore from '../stores/gameStore';
import { STAT_LABELS } from '../components/StatBar';
import { ARCHETYPES } from '../data/archetypes';

export default function GameOverScreen() {
  const { player, day, eliminationLog, contestants, betrayals, playerCircle, resetGame } = useGameStore();

  const active = contestants.filter((c) => !c.isEliminated);
  const totalEliminated = eliminationLog.length;
  const madeItToEnd = active.length <= 3; // made it to final tribal
  const statGrowth = Object.values(player.stats).reduce((a, b) => a + b, 0) - 17;
  const detectedBetrayals = betrayals.filter((b) => b.detected).length;
  const hiddenBetrayals = betrayals.filter((b) => !b.detected).length;

  return (
    <div className="flex-1 flex flex-col p-6 overflow-y-auto">
      <div className="max-w-sm mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">{madeItToEnd ? '🏢' : '📦'}</div>
          <h1 className="text-2xl font-bold text-earth-100 mb-1">
            {madeItToEnd ? 'Game Complete' : 'You\'ve Been Let Go'}
          </h1>
          <p className="text-sm text-earth-600">
            {madeItToEnd
              ? `${day} weeks. ${totalEliminated} colleagues downsized.`
              : `Let go in Week ${day}. ${totalEliminated} fell before you.`
            }
          </p>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-earth-800 border border-earth-700 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-torch">{day}</div>
            <div className="text-[10px] text-earth-600">Weeks Survived</div>
          </div>
          <div className="bg-earth-800 border border-earth-700 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-earth-100">+{statGrowth}</div>
            <div className="text-[10px] text-earth-600">Stat Growth</div>
          </div>
          <div className="bg-earth-800 border border-earth-700 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-ember">{betrayals.length}</div>
            <div className="text-[10px] text-earth-600">Betrayals</div>
          </div>
        </div>

        {/* Final Stats */}
        <div className="bg-earth-800 border border-earth-700 rounded-lg p-4 mb-4">
          <h3 className="text-xs font-bold text-earth-100 mb-2">Final Profile</h3>
          <div className="space-y-1">
            {Object.entries(player.stats).map(([key, val]) => (
              <div key={key} className="flex items-center gap-2">
                <span className="text-xs text-earth-600 w-20">{STAT_LABELS[key]}</span>
                <div className="flex-1 h-1.5 bg-earth-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-torch rounded-full"
                    style={{ width: `${(val / 10) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-earth-100 font-bold w-4 text-right">{val}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Game highlights */}
        <div className="bg-earth-800 border border-earth-700 rounded-lg p-4 mb-4">
          <h3 className="text-xs font-bold text-earth-100 mb-2">Game Highlights</h3>
          <div className="space-y-1.5 text-xs text-earth-300">
            {detectedBetrayals > 0 && (
              <p className="text-ember">You were caught betraying {detectedBetrayals} circle member{detectedBetrayals > 1 ? 's' : ''}.</p>
            )}
            {hiddenBetrayals > 0 && (
              <p className="text-sand">You secretly betrayed {hiddenBetrayals} and got away with it.</p>
            )}
            {betrayals.length === 0 && (
              <p className="text-jungle">You never betrayed anyone in your circle.</p>
            )}
            <p>Circle reputation: <span className={player.circleReputation >= 0 ? 'text-jungle' : 'text-ember'}>
              {player.circleReputation > 0 ? '+' : ''}{player.circleReputation}
            </span></p>
            <p>Total stat points gained: <span className="text-torch">+{statGrowth}</span></p>
          </div>
        </div>

        {/* Elimination timeline */}
        <div className="bg-earth-800 border border-earth-700 rounded-lg p-4 mb-6">
          <h3 className="text-xs font-bold text-earth-100 mb-2">Layoff Order</h3>
          <div className="space-y-1">
            {eliminationLog.map((entry, i) => {
              const c = contestants.find((x) => x.id === entry.contestantId);
              const arch = c ? ARCHETYPES[c.archetype] : null;
              const wasBetrayedByPlayer = betrayals.some((b) => b.victimId === entry.contestantId && b.detected);
              return (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="text-earth-600 w-10">Wk {entry.day}</span>
                  <span className="text-sm">{arch?.emoji || '👤'}</span>
                  <span className={`flex-1 ${wasBetrayedByPlayer ? 'text-ember' : 'text-earth-300'}`}>
                    {c?.name || 'Unknown'}
                    {wasBetrayedByPlayer && ' 🗡️'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <button
          onClick={resetGame}
          className="w-full bg-torch hover:bg-torch-dim text-earth-900 font-bold py-3 rounded-lg transition-colors active:scale-95"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}
