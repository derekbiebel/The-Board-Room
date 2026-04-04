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
    immunePlayerId, eliminationLog, gameLog,
    playerCircle, npcFactions, weeklyIntel, weeklyWarnings, weeklyEvents,
    eavesdropIntel, discoveredFactions,
    startConversation, updateRelationship, logEvent, setScreen,
  } = useGameStore();

  const tippedOff = useGameStore((s) => s.tippedOff);
  const [tab, setTab] = useState('camp');
  const [dismissedNotifs, setDismissedNotifs] = useState(false);

  const eavesdropsToday = useGameStore((s) => s.eavesdropsToday);
  const active = contestants.filter((c) => !c.isEliminated);
  const maxConversations = getMaxConversations(day);
  const conversationsLeft = maxConversations - conversationsToday;
  const maxEavesdrops = useGameStore((s) => s.maxEavesdrops) || 2;
  const eavesdropsLeft = maxEavesdrops - eavesdropsToday;
  const isChallengeDay = day % 3 === 0;
  const [actionMenu, setActionMenu] = useState(null); // contestantId or null

  const handleEndDay = () => {
    if (isChallengeDay) {
      setScreen('challenge');
    } else {
      setScreen('tribal');
    }
  };

  const handleApproach = (contestantId) => {
    if (conversationsLeft <= 0 && eavesdropsLeft <= 0) return;
    setActionMenu(contestantId);
  };

  const handleTalk = () => {
    if (conversationsLeft <= 0 || !actionMenu) return;
    startConversation(actionMenu);
    setActionMenu(null);
  };

  const handleEavesdrop = () => {
    if (eavesdropsLeft <= 0 || !actionMenu) return;
    // Set conversation goal to eavesdrop directly
    useGameStore.getState().startConversation(actionMenu);
    useGameStore.getState().setConversationGoal('eavesdrop');
    setActionMenu(null);
    setScreen('conversation');
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
              {conversationsLeft} chat{conversationsLeft !== 1 ? 's' : ''} · {eavesdropsLeft} spy
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

        {/* Tip-off option: share eavesdrop intel with the target */}
        {tab === 'camp' && eavesdropIntel.length > 0 && !tippedOff && (() => {
          // Find the first intel where the target has positive relationship with player
          const tipIntel = eavesdropIntel.find((ei) => !ei.isFactionIntel && (player.relationships[ei.votingForId] || 0) >= 1);
          if (!tipIntel) return null;
          const target = contestants.find((c) => c.id === tipIntel.votingForId);
          if (!target || target.isEliminated) return null;
          return (
            <div className="mb-3 bg-earth-800 border border-sand/30 rounded-lg p-3 fade-in">
              <p className="text-xs text-sand mb-2">
                👂 You know {tipIntel.targetName} is gunning for <span className="text-earth-100 font-medium">{target.name}</span>. Tip them off?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    updateRelationship(target.id, 2);
                    logEvent({ type: 'tip_off', npc: target.name, about: tipIntel.targetName });
                    useGameStore.setState({ tippedOff: true });
                  }}
                  className="flex-1 bg-jungle/10 border border-jungle/30 rounded-lg py-2 text-xs text-jungle-light font-medium hover:bg-jungle/20 transition-colors active:scale-95"
                >
                  Warn {target.name} (+2 rel)
                </button>
                <button
                  onClick={() => setTippedOff(true)}
                  className="flex-1 bg-earth-700 rounded-lg py-2 text-xs text-earth-600 hover:text-earth-300 transition-colors active:scale-95"
                >
                  Keep it to yourself
                </button>
              </div>
            </div>
          );
        })()}

        {tab === 'camp' && (() => {
          const FACTION_COLORS = ['#8B5CF6', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899'];

          // Group NPCs: circle first, then discovered factions, then unaffiliated
          const circleNpcs = active.filter((c) => playerCircle.includes(c.id));
          const discoveredFactionGroups = discoveredFactions
            .map((fid) => npcFactions.find((f) => f.id === fid))
            .filter(Boolean)
            .map((f, i) => ({
              ...f,
              color: FACTION_COLORS[i % FACTION_COLORS.length],
              members: f.memberIds
                .map((id) => active.find((c) => c.id === id))
                .filter((c) => c && !playerCircle.includes(c.id)),
            }))
            .filter((f) => f.members.length > 0);

          const factionMemberIds = new Set(discoveredFactionGroups.flatMap((f) => f.members.map((m) => m.id)));
          const unaffiliated = active.filter((c) =>
            !playerCircle.includes(c.id) && !factionMemberIds.has(c.id)
          );

          const renderCard = (c, factionColor = null) => {
            const faction = npcFactions.find((f) => f.memberIds.includes(c.id));
            const isDiscovered = faction && discoveredFactions.includes(faction.id);
            const convoCount = gameLog.filter((e) => e.npc === c.name).length;
            const vtIntel = eavesdropIntel.find((ei) => ei.targetId === c.id);
            const vt = vtIntel ? vtIntel.votingForName : null;
            return (
              <ContestantCard
                key={c.id}
                contestant={c}
                relationship={player.relationships[c.id] || 0}
                onApproach={handleApproach}
                disabled={conversationsLeft <= 0 && eavesdropsLeft <= 0}
                isImmune={immunePlayerId === c.id}
                isCircleMember={playerCircle.includes(c.id)}
                knownStats={player.knownInfo[c.id] || {}}
                factionName={isDiscovered ? faction.name : null}
                convoCount={convoCount}
                voteTarget={vt}
                factionColor={factionColor}
              />
            );
          };

          return (
            <>
              {/* Your Circle */}
              {circleNpcs.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-torch font-medium mb-2">🤝 Your Inner Circle</p>
                  <div className="grid grid-cols-2 gap-2">
                    {circleNpcs.map((c) => renderCard(c))}
                  </div>
                </div>
              )}

              {/* Discovered Factions */}
              {discoveredFactionGroups.map((f) => (
                <div key={f.id} className="mb-4">
                  <p className="text-xs font-medium mb-2" style={{ color: f.color }}>
                    ⚔️ {f.name}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {f.members.map((c) => renderCard(c, f.color))}
                  </div>
                </div>
              ))}

              {/* Unaffiliated */}
              {unaffiliated.length > 0 && (
                <div className="mb-4">
                  {(circleNpcs.length > 0 || discoveredFactionGroups.length > 0) && (
                    <p className="text-xs text-earth-600 font-medium mb-2">Others</p>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    {unaffiliated.map((c) => renderCard(c))}
                  </div>
                </div>
              )}
            </>
          );
        })()}

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
            {discoveredFactions.length > 0 && (
              <div>
                <h2 className="text-sm font-bold text-earth-100 mb-3">Known Factions</h2>
                <div className="space-y-2">
                  {npcFactions.filter((f) => discoveredFactions.includes(f.id)).map((f) => {
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
            {discoveredFactions.length === 0 && (
              <p className="text-earth-600 text-xs italic">No factions discovered yet. Eavesdrop on people to uncover office cliques.</p>
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

      {/* Action menu — Talk or Eavesdrop */}
      {actionMenu && (
        <div className="fixed inset-0 bg-black/60 flex items-end justify-center z-50" onClick={() => setActionMenu(null)}>
          <div className="w-full max-w-[480px] bg-earth-800 border-t border-earth-700 rounded-t-xl p-4 space-y-2" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const c = contestants.find((x) => x.id === actionMenu);
              const arch = c ? ARCHETYPES[c.archetype] : null;
              return (
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{arch?.emoji}</span>
                  <span className="text-sm font-bold text-earth-100">{c?.name}</span>
                  <span className="text-xs text-earth-600">{arch?.label}</span>
                </div>
              );
            })()}
            <button
              onClick={handleTalk}
              disabled={conversationsLeft <= 0}
              className="w-full bg-earth-700 hover:bg-earth-600 text-earth-100 font-medium py-3 rounded-lg transition-colors active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              💬 Talk
              <span className="block text-[10px] text-earth-400 mt-0.5">{conversationsLeft} remaining</span>
            </button>
            <button
              onClick={handleEavesdrop}
              disabled={eavesdropsLeft <= 0}
              className="w-full bg-earth-700 hover:bg-earth-600 text-earth-100 font-medium py-3 rounded-lg transition-colors active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              👂 Eavesdrop
              <span className="block text-[10px] text-earth-400 mt-0.5">{eavesdropsLeft} remaining · no relationship gain</span>
            </button>
            <button
              onClick={() => setActionMenu(null)}
              className="w-full text-earth-600 text-xs py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
