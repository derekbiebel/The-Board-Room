import { useState } from 'react';
import useGameStore, { getMaxConversations } from '../stores/gameStore';
import ContestantCard from '../components/ContestantCard';
import StatBar from '../components/StatBar';
import { STAT_LABELS, STAT_ICONS } from '../components/StatBar';
import { ARCHETYPES } from '../data/archetypes';
import { getMaxCircleSize } from '../engine/allianceEngine';

const STAT_ORDER = ['ath', 'soc', 'snk', 'lead', 'cut', 'res', 'per'];

export default function CampScreen() {
  const {
    day, contestants, player, conversationsToday,
    immunePlayerId, eliminationLog,
    playerCircle, npcFactions, weeklyIntel, weeklyWarnings, weeklyEvents,
    startConversation, setScreen,
  } = useGameStore();

  const [tab, setTab] = useState('camp');
  const [dismissedNotifs, setDismissedNotifs] = useState(false);

  const active = contestants.filter((c) => !c.isEliminated);
  const maxConversations = getMaxConversations(day);
  const conversationsLeft = maxConversations - conversationsToday;
  const isChallengeDay = day % 3 === 0;

  const handleEndDay = () => {
    if (isChallengeDay) {
      setScreen('challenge');
    } else {
      setScreen('tribal');
    }
  };

  const handleApproach = (contestantId) => {
    if (conversationsLeft <= 0) return;
    startConversation(contestantId);
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-earth-900/95 backdrop-blur-sm border-b border-earth-700 p-4 z-10">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-earth-100">Week {day}</h1>
            <p className="text-xs text-earth-600">
              {active.length + 1} employees remain
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (confirm('Start a new game? Progress will be lost.')) useGameStore.getState().resetGame(); }}
              className="w-7 h-7 rounded-full border border-earth-700 text-earth-600 hover:text-earth-300 hover:border-earth-600 text-xs flex items-center justify-center transition-colors"
              title="New Game"
            >
              ↺
            </button>
            <button
              onClick={() => setScreen('help')}
              className="w-7 h-7 rounded-full border border-earth-700 text-earth-600 hover:text-earth-300 hover:border-earth-600 text-xs font-bold flex items-center justify-center transition-colors"
            >
              ?
            </button>
          <div className="text-right">
            <p className={`text-sm font-medium ${conversationsLeft > 0 ? 'text-torch' : 'text-earth-600'}`}>
              {conversationsLeft} conversation{conversationsLeft !== 1 ? 's' : ''} left
            </p>
            {isChallengeDay && (
              <p className="text-xs text-sand">📊 Performance review week</p>
            )}
          </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mt-3">
          {['camp', 'circle', 'stats', 'log', 'help'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-colors ${
                tab === t
                  ? 'bg-earth-700 text-earth-100'
                  : 'text-earth-600 hover:text-earth-300'
              }`}
            >
              {t === 'camp' ? '🏢 Office' : t === 'circle' ? `🤝 Circle${playerCircle.length > 0 ? ` (${playerCircle.length})` : ''}` : t === 'stats' ? '📊 Stats' : t === 'log' ? '📜 Log' : '❓ Help'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {/* Weekly notifications */}
        {tab === 'camp' && !dismissedNotifs && (weeklyIntel.length > 0 || weeklyWarnings.length > 0 || weeklyEvents.length > 0) && (
          <div className="mb-4 space-y-2 fade-in">
            {weeklyWarnings.map((w, i) => (
              <div key={`w${i}`} className="bg-ember/10 border border-ember rounded-lg p-3 text-sm text-ember">
                ⚠️ {w.message}
              </div>
            ))}
            {weeklyEvents.map((e, i) => (
              <div key={`e${i}`} className="bg-earth-800 border border-sand/30 rounded-lg p-3 text-sm text-sand">
                📢 {e}
              </div>
            ))}
            {weeklyIntel.map((intel, i) => (
              <div key={`i${i}`} className="bg-earth-800 border border-earth-700 rounded-lg p-3 text-sm text-earth-300">
                🔍 <span className="text-earth-100">{intel.fromName}</span> tells you: {intel.aboutName}'s {STAT_LABELS[intel.stat]} is <span className="text-torch">{intel.label}</span>
              </div>
            ))}
            <button
              onClick={() => setDismissedNotifs(true)}
              className="text-xs text-earth-600 hover:text-earth-300"
            >
              Dismiss
            </button>
          </div>
        )}

        {tab === 'camp' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              {active.map((c) => {
                const faction = npcFactions.find((f) => f.memberIds.includes(c.id));
                const showFaction = faction && player.stats.per >= 2;
                return (
                  <ContestantCard
                    key={c.id}
                    contestant={c}
                    relationship={player.relationships[c.id] || 0}
                    onApproach={handleApproach}
                    disabled={conversationsLeft <= 0}
                    isImmune={immunePlayerId === c.id}
                    isCircleMember={playerCircle.includes(c.id)}
                    knownStats={player.knownInfo[c.id] || {}}
                    factionName={showFaction ? faction.name : null}
                  />
                );
              })}
            </div>
          </>
        )}

        {tab === 'circle' && (
          <div className="space-y-4 fade-in">
            {/* Your Inner Circle */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-sm font-bold text-earth-100">Your Inner Circle</h2>
                <span className="text-xs text-earth-600">
                  {playerCircle.length}/{getMaxCircleSize(active.length + 1)} seats
                </span>
              </div>
              {playerCircle.length === 0 ? (
                <p className="text-earth-600 text-sm">No one in your circle yet. Recruit through conversations.</p>
              ) : (
                <div className="space-y-2">
                  {playerCircle.map((id) => {
                    const c = contestants.find((x) => x.id === id);
                    if (!c || c.isEliminated) return null;
                    const arch = ARCHETYPES[c.archetype];
                    const rel = player.relationships[id] || 0;
                    return (
                      <div key={id} className="bg-earth-800 border border-earth-700 rounded-lg p-3 flex items-center gap-3">
                        <span className="text-lg">{arch?.emoji}</span>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-earth-100">{c.name}</div>
                          <div className="text-xs text-earth-600">{arch?.label}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-earth-600">Trust</div>
                          <div className="flex gap-0.5 justify-end">
                            {Array.from({ length: 10 }, (_, i) => (
                              <div
                                key={i}
                                className={`w-1 h-3 rounded-full ${i < (c.circleLoyalty || 0) ? 'bg-torch' : 'bg-earth-700'}`}
                              />
                            ))}
                          </div>
                          <div className={`text-xs mt-0.5 ${rel >= 1 ? 'text-jungle' : rel <= -1 ? 'text-ember' : 'text-earth-600'}`}>
                            {rel > 0 ? '+' : ''}{rel} rel
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Known Factions */}
            {npcFactions.length > 0 && player.stats.per >= 2 && (
              <div>
                <h2 className="text-sm font-bold text-earth-100 mb-3">Known Factions</h2>
                <div className="space-y-2">
                  {npcFactions.map((f) => {
                    const members = f.memberIds
                      .map((id) => contestants.find((c) => c.id === id))
                      .filter((c) => c && !c.isEliminated);
                    if (members.length === 0) return null;
                    return (
                      <div key={f.id} className="bg-earth-800 border border-earth-700 rounded-lg p-3">
                        <div className="text-sm font-medium text-sand mb-1">{f.name}</div>
                        <div className="flex flex-wrap gap-1">
                          {members.map((m) => (
                            <span key={m.id} className="text-xs bg-earth-700 px-2 py-0.5 rounded-full text-earth-300">
                              {m.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {npcFactions.length > 0 && player.stats.per < 2 && (
              <p className="text-earth-600 text-xs italic">Your Perception isn't high enough to detect office factions yet. (Need 2+)</p>
            )}
          </div>
        )}

        {tab === 'stats' && (
          <div className="space-y-2 fade-in">
            <h2 className="text-sm font-bold text-earth-100 mb-3">
              {player.name}'s Stats
            </h2>
            {STAT_ORDER.map((stat) => (
              <StatBar key={stat} stat={stat} value={player.stats[stat]} showNumber />
            ))}
          </div>
        )}

        {tab === 'log' && (
          <div className="space-y-2 fade-in">
            <h2 className="text-sm font-bold text-earth-100 mb-3">Layoff Log</h2>
            {eliminationLog.length === 0 ? (
              <p className="text-earth-600 text-sm">No one has been let go yet.</p>
            ) : (
              eliminationLog.map((entry, i) => {
                const c = contestants.find((x) => x.id === entry.contestantId);
                return (
                  <div key={i} className="bg-earth-800 border border-earth-700 rounded-lg p-3 flex items-center gap-3">
                    <span className="text-earth-600 text-xs">Week {entry.day}</span>
                    <span className="text-earth-100 text-sm font-medium">{c?.name || 'Unknown'}</span>
                    <span className="text-ember text-xs ml-auto">Let Go</span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {tab === 'help' && (
          <div className="space-y-3 fade-in">
            <h2 className="text-sm font-bold text-earth-100 mb-3">How Things Work</h2>

            <div className="bg-earth-800 border border-earth-700 rounded-lg p-3">
              <div className="text-sm font-medium text-earth-100 mb-1">🔥 Hotness</div>
              <p className="text-xs text-earth-300">People want to be around you. Relationships stick longer, and you can charm your way through conversations. But being the one everyone notices? That paints a target on your back.</p>
            </div>

            <div className="bg-earth-800 border border-earth-700 rounded-lg p-3">
              <div className="text-sm font-medium text-earth-100 mb-1">💬 Social Skills</div>
              <p className="text-xs text-earth-300">You read a room better than anyone. Conversations go your way more often. But when you miss? People expected more — and they remember.</p>
            </div>

            <div className="bg-earth-800 border border-earth-700 rounded-lg p-3">
              <div className="text-sm font-medium text-earth-100 mb-1">🐍 Sneakiness</div>
              <p className="text-xs text-earth-300">Your votes stay secret. Your betrayals stay hidden. But people can sense it — the sneaky ones have a harder time earning real trust.</p>
            </div>

            <div className="bg-earth-800 border border-earth-700 rounded-lg p-3">
              <div className="text-sm font-medium text-earth-100 mb-1">👑 Leadership</div>
              <p className="text-xs text-earth-300">Your voice carries weight in every vote. People follow your lead. But anyone who looks like they're running the show becomes the next target.</p>
            </div>

            <div className="bg-earth-800 border border-earth-700 rounded-lg p-3">
              <div className="text-sm font-medium text-earth-100 mb-1">🗡️ Cutthroat</div>
              <p className="text-xs text-earth-300">When someone falls, you come out stronger. The ruthless climb faster. But people keep you at arm's length — good luck getting close to anyone.</p>
            </div>

            <div className="bg-earth-800 border border-earth-700 rounded-lg p-3">
              <div className="text-sm font-medium text-earth-100 mb-1">🛡️ Resilience</div>
              <p className="text-xs text-earth-300">Nothing sticks to you. Bad blood rolls off and setbacks barely register. The downside? You're a wall — solid, but not a weapon. Resilience won't help you make moves, only survive them.</p>
            </div>

            <div className="bg-earth-800 border border-earth-700 rounded-lg p-3">
              <div className="text-sm font-medium text-earth-100 mb-1">👁️ Perception</div>
              <p className="text-xs text-earth-300">You see what others miss — factions forming, people scheming, danger coming. Digging for intel builds real respect. People find it harder to move against you. But the slippery ones? They can feel your eyes on them, and they clam up.</p>
            </div>

            <div className="border-t border-earth-700 pt-3 mt-3">
              <h2 className="text-sm font-bold text-earth-100 mb-2">General Tips</h2>
              <div className="space-y-2 text-xs text-earth-300">
                <p>Every conversation is a gamble. Choose who you talk to — and what you say — carefully.</p>
                <p>Your inner circle votes with you, but loyalty fades if you don't maintain it.</p>
                <p>Voting for someone who survives is risky. They might find out.</p>
                <p>Voting against someone in your own circle? That's betrayal. And betrayal has consequences.</p>
                <p>Office factions form on their own. They protect each other — and they coordinate against outsiders.</p>
                <p>As the restructuring continues, your conversations get fewer. Use them wisely.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* End Day button */}
      {tab === 'camp' && (
        <div className="p-4 border-t border-earth-700">
          <button
            onClick={handleEndDay}
            className="w-full bg-earth-800 hover:bg-earth-700 text-earth-100 font-bold py-3 rounded-lg border border-earth-700 transition-colors active:scale-95"
          >
            {isChallengeDay ? '📊 Head to Performance Review' : '🏛️ Head to Board Meeting'}
          </button>
        </div>
      )}
    </div>
  );
}
