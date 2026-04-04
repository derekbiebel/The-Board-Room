import { useState } from 'react';
import useGameStore from '../stores/gameStore';
import StatBar from '../components/StatBar';
import { STAT_LABELS, STAT_ICONS } from '../components/StatBar';

const STAT_DESCRIPTIONS = {
  ath: '+ Charm convos, slower decay · - Makes you a target',
  soc: '+ Better conversations · - Failures hurt double',
  snk: '+ Hide your votes · - Harder to recruit allies',
  lead: '+ Vote counts double · - Spotlight + circle feels your grip',
  cut: '+ Gain rep when someone is ousted · - Very high cut limits charm',
  res: '+ Thrives under pressure, softens jury · - No direct offense',
  per: '+ Intel builds respect, harder to blindside · - Sneaky NPCs dodge you',
};

const STAT_ORDER = ['ath', 'soc', 'snk', 'lead', 'cut', 'res', 'per'];

export default function CharacterCreateScreen() {
  const player = useGameStore((s) => s.player);
  const setPlayerName = useGameStore((s) => s.setPlayerName);
  const allocateCreationPoint = useGameStore((s) => s.allocateCreationPoint);
  const startGame = useGameStore((s) => s.startGame);

  const totalSpent = Object.values(player.stats).reduce((a, b) => a + b, 0) - 7;
  const remaining = 10 - totalSpent;
  const canStart = player.name.trim().length > 0 && remaining === 0;

  return (
    <div className="flex-1 flex flex-col p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-earth-100">New Hire Onboarding</h1>
        <p className="text-earth-600 text-sm mt-1">
          Distribute 10 points across your employee profile
        </p>
      </div>

      {/* Name */}
      <div className="mb-6">
        <label className="block text-xs text-earth-300 mb-1.5">Your Name</label>
        <input
          type="text"
          value={player.name}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter your name..."
          maxLength={20}
          className="w-full bg-earth-800 border border-earth-700 rounded-lg px-4 py-3 text-earth-100 text-sm placeholder-earth-600 focus:outline-none focus:border-torch transition-colors"
        />
      </div>

      {/* Points remaining */}
      <div className="text-center mb-4">
        <span className={`text-lg font-bold ${remaining > 0 ? 'text-torch' : 'text-jungle-light'}`}>
          {remaining}
        </span>
        <span className="text-earth-600 text-sm ml-1.5">points remaining</span>
      </div>

      {/* Stats */}
      <div className="space-y-3 flex-1">
        {STAT_ORDER.map((stat) => (
          <div key={stat} className="bg-earth-800 rounded-lg p-3 border border-earth-700">
            <div className="flex items-center justify-between mb-1">
              <div>
                <span className="text-sm font-medium text-earth-100">
                  {STAT_ICONS[stat]} {STAT_LABELS[stat]}
                </span>
                <p className="text-xs text-earth-600">{STAT_DESCRIPTIONS[stat]}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => allocateCreationPoint(stat, -1)}
                  disabled={player.stats[stat] <= 1}
                  className="w-8 h-8 rounded-full bg-earth-700 text-earth-300 font-bold text-lg flex items-center justify-center disabled:opacity-30 hover:bg-earth-600 active:scale-90 transition-all"
                >
                  -
                </button>
                <span className="text-lg font-bold text-earth-100 w-6 text-center">
                  {player.stats[stat]}
                </span>
                <button
                  onClick={() => allocateCreationPoint(stat, 1)}
                  disabled={remaining <= 0 || player.stats[stat] >= 10}
                  className="w-8 h-8 rounded-full bg-torch text-earth-900 font-bold text-lg flex items-center justify-center disabled:opacity-30 hover:bg-torch-dim active:scale-90 transition-all"
                >
                  +
                </button>
              </div>
            </div>
            <StatBar stat={stat} value={player.stats[stat]} showNumber compact />
          </div>
        ))}
      </div>

      {/* Start button */}
      <button
        onClick={startGame}
        disabled={!canStart}
        className="w-full mt-6 bg-torch hover:bg-torch-dim text-earth-900 font-bold py-4 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
      >
        Start Your First Day
      </button>
    </div>
  );
}
