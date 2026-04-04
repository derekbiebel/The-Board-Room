import useGameStore from '../stores/gameStore';
import { STAT_LABELS } from '../components/StatBar';
import { ARCHETYPES } from '../data/archetypes';

function classifyPlaystyle(gameLog, betrayals, playerCircle, contestants, player, day) {
  const lobbies = gameLog.filter((e) => e.type === 'lobby').length;
  const trusts = gameLog.filter((e) => e.type === 'trust').length;
  const recruits = gameLog.filter((e) => e.type === 'recruited').length;
  const badConvos = gameLog.filter((e) => e.type === 'bad_convo').length;
  const greatConvos = gameLog.filter((e) => e.type === 'great_convo').length;
  const leaks = gameLog.filter((e) => e.type === 'lobby_leaked').length;
  const totalConvos = lobbies + trusts + badConvos + greatConvos;

  // Count unique people talked to
  const uniqueNpcs = new Set(gameLog.filter((e) => e.npc).map((e) => e.npc)).size;

  const detectedBetrayals = betrayals.filter((b) => b.detected).length;
  const hiddenBetrayals = betrayals.filter((b) => !b.detected).length;

  // Classify
  if (detectedBetrayals >= 2) {
    return { title: 'The Backstabber', emoji: '🗡️', desc: 'You burned bridges and everyone knew it. Bold, reckless, unforgettable.' };
  }
  if (hiddenBetrayals >= 2 && detectedBetrayals === 0) {
    return { title: 'The Shadow', emoji: '🌑', desc: 'You played dirty and nobody ever caught on. The most dangerous player in the office.' };
  }
  if (lobbies > trusts * 2 && lobbies >= 8) {
    return { title: 'The Puppet Master', emoji: '🎭', desc: 'Every conversation was a chess move. You pushed votes harder than anyone.' };
  }
  if (trusts > lobbies * 2 && trusts >= 6) {
    return { title: 'The People Person', emoji: '☕', desc: 'You invested in relationships over politics. People genuinely liked you.' };
  }
  if (uniqueNpcs <= 5 && recruits >= 2) {
    return { title: 'The Inner Circle', emoji: '🤝', desc: 'You kept it tight. A small, loyal crew was all you needed.' };
  }
  if (uniqueNpcs >= 12) {
    return { title: 'The Networker', emoji: '🌐', desc: 'You talked to everyone. No stranger in the office, no corner unexplored.' };
  }
  if (greatConvos >= 10 && badConvos <= 2) {
    return { title: 'The Smooth Operator', emoji: '😎', desc: 'Almost every conversation went your way. Natural charm, impeccable instincts.' };
  }
  if (badConvos >= 5) {
    return { title: 'The Loose Cannon', emoji: '💥', desc: 'A lot of swings, a lot of misses. Unpredictable, chaotic, and somehow still standing.' };
  }
  if (day >= 12 && betrayals.length === 0) {
    return { title: 'The Survivor', emoji: '🛡️', desc: 'Clean hands, clear conscience. You made it through on grit and good relationships.' };
  }
  if (lobbies >= 5 && trusts >= 5) {
    return { title: 'The Balanced Player', emoji: '⚖️', desc: 'Push when you need to, connect when you can. A pragmatic game from start to finish.' };
  }
  return { title: 'The Wildcard', emoji: '🎲', desc: 'Hard to categorize. You kept everyone guessing — maybe even yourself.' };
}

function findKeyMoments(gameLog, betrayals, eliminationLog, contestants, player) {
  const moments = [];

  // Detected betrayals are always key moments
  for (const b of betrayals.filter((x) => x.detected)) {
    const victim = contestants.find((c) => c.id === b.victimId);
    moments.push({
      day: b.day,
      type: 'disaster',
      text: `You betrayed ${victim?.name || 'someone'} and got caught. Your circle never fully recovered.`,
    });
  }

  // Lobby leaks
  for (const e of gameLog.filter((x) => x.type === 'lobby_leaked')) {
    moments.push({
      day: e.day,
      type: 'mistake',
      text: `You lobbied against ${e.target}, and word got back to them.`,
    });
  }

  // Hard fail conversations
  for (const e of gameLog.filter((x) => x.type === 'bad_convo')) {
    moments.push({
      day: e.day,
      type: 'mistake',
      text: `A conversation with ${e.npc} went badly. It cost you.`,
    });
  }

  // Successful recruitments
  for (const e of gameLog.filter((x) => x.type === 'recruited')) {
    moments.push({
      day: e.day,
      type: 'win',
      text: `You brought ${e.npc} into your circle. A key alliance.`,
    });
  }

  // Hidden betrayals are calculated risks
  for (const b of betrayals.filter((x) => !x.detected)) {
    const victim = contestants.find((c) => c.id === b.victimId);
    moments.push({
      day: b.day,
      type: 'win',
      text: `You betrayed ${victim?.name || 'someone'} and got away with it. Cold-blooded.`,
    });
  }

  // Idol found/played
  for (const e of gameLog.filter((x) => x.type === 'idol_found')) {
    moments.push({ day: e.day, type: 'win', text: `You found an immunity idol hidden in the office.` });
  }
  for (const e of gameLog.filter((x) => x.type === 'idol_played')) {
    moments.push({ day: e.day, type: 'win', text: `You played your immunity idol. All votes against you were negated.` });
  }

  // Double vote
  for (const e of gameLog.filter((x) => x.type === 'double_vote_used')) {
    moments.push({ day: e.day, type: 'win', text: `You used your double vote token to swing the board meeting.` });
  }

  // Eavesdrop discoveries
  for (const e of gameLog.filter((x) => x.type === 'eavesdrop')) {
    moments.push({ day: e.day, type: 'win', text: `You eavesdropped on ${e.npc} and learned they were targeting ${e.learned}.` });
  }

  // Rivalry discoveries
  for (const e of gameLog.filter((x) => x.type === 'rivalry_found')) {
    moments.push({ day: e.day, type: 'win', text: `You discovered a rivalry between ${e.npc1} and ${e.npc2}.` });
  }

  // Tip-offs
  for (const e of gameLog.filter((x) => x.type === 'tip_off')) {
    moments.push({ day: e.day, type: 'win', text: `You warned ${e.npc} that ${e.about} was coming for them.` });
  }

  // Sort by day, take top 6
  moments.sort((a, b) => a.day - b.day);
  return moments.slice(0, 6);
}

export default function GameOverScreen() {
  const { player, day, eliminationLog, contestants, betrayals, playerCircle, gameLog, resetGame } = useGameStore();

  const active = contestants.filter((c) => !c.isEliminated);
  const totalEliminated = eliminationLog.length;
  const madeItToEnd = active.length <= 3;
  const statGrowth = Object.values(player.stats).reduce((a, b) => a + b, 0) - 17;
  const detectedBetrayals = betrayals.filter((b) => b.detected).length;
  const hiddenBetrayals = betrayals.filter((b) => !b.detected).length;

  const playstyle = classifyPlaystyle(gameLog, betrayals, playerCircle, contestants, player, day);
  const keyMoments = findKeyMoments(gameLog, betrayals, eliminationLog, contestants, player);

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

        {/* Playstyle */}
        <div className="bg-earth-800 border border-torch/30 rounded-lg p-4 mb-4 text-center">
          <div className="text-3xl mb-2">{playstyle.emoji}</div>
          <h2 className="text-lg font-bold text-torch mb-1">{playstyle.title}</h2>
          <p className="text-xs text-earth-300 italic">{playstyle.desc}</p>
        </div>

        {/* Key stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-earth-800 border border-earth-700 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-torch">{day}</div>
            <div className="text-[10px] text-earth-600">Weeks</div>
          </div>
          <div className="bg-earth-800 border border-earth-700 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-earth-100">+{statGrowth}</div>
            <div className="text-[10px] text-earth-600">Growth</div>
          </div>
          <div className="bg-earth-800 border border-earth-700 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-ember">{betrayals.length}</div>
            <div className="text-[10px] text-earth-600">Betrayals</div>
          </div>
        </div>

        {/* Key Moments */}
        {keyMoments.length > 0 && (
          <div className="bg-earth-800 border border-earth-700 rounded-lg p-4 mb-4">
            <h3 className="text-xs font-bold text-earth-100 mb-3">Key Moments</h3>
            <div className="space-y-2">
              {keyMoments.map((m, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[10px] text-earth-600 w-10 shrink-0 pt-0.5">Wk {m.day}</span>
                  <span className={`text-[10px] ${
                    m.type === 'disaster' ? 'text-ember' :
                    m.type === 'mistake' ? 'text-sand' :
                    'text-jungle-light'
                  }`}>
                    {m.type === 'disaster' ? '💀' : m.type === 'mistake' ? '⚠️' : '✓'}
                  </span>
                  <p className="text-xs text-earth-300 flex-1">{m.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

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
              <p className="text-ember">Caught betraying {detectedBetrayals} circle member{detectedBetrayals > 1 ? 's' : ''}.</p>
            )}
            {hiddenBetrayals > 0 && (
              <p className="text-sand">Secretly betrayed {hiddenBetrayals} and got away with it.</p>
            )}
            {betrayals.length === 0 && (
              <p className="text-jungle">Never betrayed anyone in your circle.</p>
            )}
            <p>Circle reputation: <span className={player.circleReputation >= 0 ? 'text-jungle' : 'text-ember'}>
              {player.circleReputation > 0 ? '+' : ''}{player.circleReputation}
            </span></p>
            <p>Conversations lobbied: <span className="text-earth-100">{gameLog.filter((e) => e.type === 'lobby').length}</span></p>
            <p>Bonds deepened: <span className="text-earth-100">{gameLog.filter((e) => e.type === 'trust').length}</span></p>
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
