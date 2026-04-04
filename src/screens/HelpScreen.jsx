import useGameStore from '../stores/gameStore';

export default function HelpScreen() {
  const setScreen = useGameStore((s) => s.setScreen);
  const previousScreen = useGameStore((s) => s.previousScreen);

  const handleClose = () => {
    setScreen(previousScreen || 'create');
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="sticky top-0 bg-earth-900/95 backdrop-blur-sm border-b border-earth-700 p-4 z-10 flex items-center justify-between">
        <h1 className="text-lg font-bold text-earth-100">How to Play</h1>
        <button
          onClick={handleClose}
          className="text-earth-600 hover:text-earth-300 text-sm"
        >
          Close
        </button>
      </div>

      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* Premise */}
        <div className="bg-earth-800 border border-earth-700 rounded-lg p-4">
          <h2 className="text-sm font-bold text-torch mb-2">The Restructuring</h2>
          <p className="text-xs text-earth-300 leading-relaxed">
            Your company is restructuring. 20 employees remain — including you. Every week, one person gets let go. The last ones standing face a jury of former coworkers who decide who keeps their job.
          </p>
        </div>

        {/* Weekly flow */}
        <div className="bg-earth-800 border border-earth-700 rounded-lg p-4">
          <h2 className="text-sm font-bold text-torch mb-2">Each Week</h2>
          <div className="space-y-2 text-xs text-earth-300 leading-relaxed">
            <p><span className="text-earth-100 font-medium">1. Office Floor</span> — Talk to coworkers. You get a limited number of conversations each week (starts at 6, decreases over time).</p>
            <p><span className="text-earth-100 font-medium">2. Conversations</span> — Each conversation offers 2 random approaches. Outcomes depend on your stats vs theirs. Good conversations build relationships. Bad ones hurt.</p>
            <p><span className="text-earth-100 font-medium">3. Board Meeting</span> — Everyone votes. The person with the most complaints gets let go. Your vote is one of many.</p>
            <p><span className="text-earth-100 font-medium">4. Stat Point</span> — If you survive, you earn a point to improve one stat.</p>
          </div>
        </div>

        {/* Performance reviews */}
        <div className="bg-earth-800 border border-earth-700 rounded-lg p-4">
          <h2 className="text-sm font-bold text-torch mb-2">Performance Reviews</h2>
          <p className="text-xs text-earth-300 leading-relaxed">
            Every 3 weeks, there's a performance review before the board meeting. You pick a stat to compete with — winner is safe from elimination that week.
          </p>
        </div>

        {/* Conversations */}
        <div className="bg-earth-800 border border-earth-700 rounded-lg p-4">
          <h2 className="text-sm font-bold text-torch mb-2">Conversations</h2>
          <div className="space-y-2 text-xs text-earth-300 leading-relaxed">
            <p>Each conversation gives you 2 random approaches. You won't always get the one you want — adapt.</p>
            <p><span className="text-earth-100">After a successful conversation</span>, you can suggest who to vote out. The better the outcome, the more likely they'll follow your lead.</p>
            <p><span className="text-ember">Bad conversations ripple.</span> Someone nearby might overhear. Word gets around.</p>
          </div>
        </div>

        {/* Inner Circle */}
        <div className="bg-earth-800 border border-earth-700 rounded-lg p-4">
          <h2 className="text-sm font-bold text-torch mb-2">Your Inner Circle</h2>
          <div className="space-y-2 text-xs text-earth-300 leading-relaxed">
            <p>Build your relationship to +3 with someone and you can ask them to join your circle. Strong success = auto-accept. Partial success depends on their personality.</p>
            <p><span className="text-earth-100">Circle members help you</span> — they tend to vote with you, share intel about other people's stats, and warn you when you're being targeted.</p>
            <p><span className="text-ember">But circles need maintenance.</span> Loyalty fades if you don't keep talking to them. Neglect your people and they'll leave — or get poached by a faction.</p>
            <p><span className="text-ember">Big circles are dangerous.</span> The more people in your circle, the bigger a target you become. Everyone outside your circle sees you as a threat.</p>
            <p>Your circle can never be more than half the remaining players.</p>
          </div>
        </div>

        {/* Factions */}
        <div className="bg-earth-800 border border-earth-700 rounded-lg p-4">
          <h2 className="text-sm font-bold text-torch mb-2">NPC Factions</h2>
          <div className="space-y-2 text-xs text-earth-300 leading-relaxed">
            <p>Other employees form their own cliques. Factions protect each other in votes and coordinate targets.</p>
            <p>If your Perception is high enough, you can see which factions exist in the Circle tab.</p>
            <p>Factions will try to poach your circle members — especially the ones with low loyalty.</p>
          </div>
        </div>

        {/* Betrayal */}
        <div className="bg-earth-800 border border-earth-700 rounded-lg p-4">
          <h2 className="text-sm font-bold text-torch mb-2">Betrayal</h2>
          <div className="space-y-2 text-xs text-earth-300 leading-relaxed">
            <p>Voting against a circle member is betrayal. There's a chance they find out (your Sneakiness vs their Perception).</p>
            <p><span className="text-ember">If caught:</span> They leave your circle permanently. Relationship drops to rock bottom. Everyone else in your circle loses trust.</p>
            <p><span className="text-sand">If hidden:</span> You gain +1 Cutthroat. But they're still in your circle, watching.</p>
            <p>The jury remembers everything. Betrayals are the hardest thing to overcome at the final board meeting.</p>
          </div>
        </div>

        {/* Voting */}
        <div className="bg-earth-800 border border-earth-700 rounded-lg p-4">
          <h2 className="text-sm font-bold text-torch mb-2">How Voting Works</h2>
          <div className="space-y-2 text-xs text-earth-300 leading-relaxed">
            <p>Each week a spotlight stat is announced. The person weakest in that stat gets extra votes against them.</p>
            <p>NPCs vote based on: how much they like the target, faction coordination, circle loyalty, and randomness.</p>
            <p>Your vote counts as 1 normally. At Leadership 7+, it counts as 2.</p>
            <p><span className="text-ember">If someone you voted for survives</span>, there's a chance they find out. Higher Sneakiness = lower chance of exposure.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="bg-earth-800 border border-earth-700 rounded-lg p-4">
          <h2 className="text-sm font-bold text-torch mb-2">Stats — Every Edge Has a Cost</h2>
          <div className="space-y-2 text-xs text-earth-300 leading-relaxed">
            <p>🔥 <span className="text-earth-100">Hotness</span> — People want to be around you. But being noticed makes you a target.</p>
            <p>💬 <span className="text-earth-100">Social Skills</span> — Better at building trust. But when you fail, people expected more.</p>
            <p>🐍 <span className="text-earth-100">Sneakiness</span> — Your votes stay secret. But the sneaky ones struggle to earn real trust.</p>
            <p>👑 <span className="text-earth-100">Leadership</span> — Your vote carries double weight. But leaders are the first ones targeted, and your circle feels your grip.</p>
            <p>🗡️ <span className="text-earth-100">Cutthroat</span> — You gain influence when others fall. But too much edge keeps people at arm's length.</p>
            <p>🛡️ <span className="text-earth-100">Resilience</span> — Bad blood rolls off you. You're best when your back is against the wall. Even the jury respects endurance.</p>
            <p>👁️ <span className="text-earth-100">Perception</span> — You see factions forming, threats coming. Digging for intel builds real respect. But the slippery ones clam up around you.</p>
          </div>
        </div>

        {/* Endgame */}
        <div className="bg-earth-800 border border-earth-700 rounded-lg p-4">
          <h2 className="text-sm font-bold text-torch mb-2">The Endgame</h2>
          <div className="space-y-2 text-xs text-earth-300 leading-relaxed">
            <p>When 4-5 employees remain, there's a final performance review. The winner chooses who to cut.</p>
            <p>The last 3 face the jury — the people you eliminated. They ask you questions about your game. Your answers matter.</p>
            <p><span className="text-earth-100">Each juror has an archetype.</span> Match your answer to who they are — not who you are. A Loyalist wants honesty. A Schemer respects cold logic. Read the room.</p>
            <p><span className="text-ember">Bitter jurors are nearly impossible to win over.</span> If you betrayed them, even the perfect answer barely moves the needle.</p>
            <p>You win the jury during the game, not at the final meeting. The Q&A is your last chance — not your only one.</p>
          </div>
        </div>

        <div className="text-center py-4">
          <button
            onClick={handleClose}
            className="bg-torch hover:bg-torch-dim text-earth-900 font-bold py-3 px-8 rounded-lg transition-colors active:scale-95"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
}
