# The Board Room — Design & Balance Reference

## Overview
Corporate-themed Survivor game. 20 players (you + 19 NPCs). Weekly cycle: conversations → performance review (every 3 weeks) → board meeting (vote) → stat allocation. Last 3 face a jury of eliminated players.

## Tech
- React + Vite + Tailwind CSS + Zustand (persisted to localStorage)
- No backend, no API calls — all logic client-side
- Deployed: GitHub Pages (derekbiebel.github.io/The-Board-Room/)
- iOS: Capacitor wrapper, bundle ID com.derekbiebel.theboardroom
- App Store name: "Corporate Survivor" (The Board Room was taken)

## Player Stats (7 total)
Starting budget: 7 points distributed across 7 stats (each starts at 1, total 14).
Growth: +2 points/week (weeks 1-9), +1 point/week (week 10+).

| Stat | Key | Pro | Con | Rating |
|---|---|---|---|---|
| Hotness | ath | Decay every 2 weeks instead of 1 (ath≥5). Charm convo goal (+1 rel on success) | +1 vote threat at ath≥7 | 7 |
| Social Skills | soc | +floor(soc/3) bonus to trust/recruit checks | Failures hurt 1.5x at soc≥5 | 7 |
| Sneakiness | snk | Vote exposure: max(15, 70-snk*6). Betrayal hiding | -2 recruit penalty at snk≥8 | 6 |
| Leadership | lead | Vote weight 2x at lead≥8 | +1 spotlight weight at lead≥6. Circle loyalty -1/week at lead≥7 | 7 |
| Cutthroat | cut | +1 rel with 3 random NPCs when someone eliminated (cut≥4). +1 cut on undetected betrayal | Convo gains capped at +1 if cut≥8 | 5 |
| Resilience | res | Halves negative rel impacts (res≥5). +1 convo bonus when relationship negative (res≥4). Reduces jury bitterness by 1 | No offensive use | 6 |
| Perception | per | Probe +1 rel on success. -1 vote weight at per≥5. Faction visibility | +1 NPC defense if per≥5 AND npc snk≥5 | 7 |

## NPC Stats
- Starting budget: 30 points across 7 stats (avg 4.3/stat)
- Growth: +1 random stat every 2 weeks
- 7 archetypes: Shark (schemer), Loyal (loyalist), Floater, Bully, Wildcard, Strategist, Social (social_butterfly)

## Weekly Action Budget
- Conversations: max(4, 6 - floor((day-1)/3)) — starts at 6, floor at 4
- Eavesdrops: 3 per week (separate pool)
- Free circle chat: 1 per week (doesn't cost a conversation)
- Lobbying: after successful conversation, choose lobby (25% leak risk) or build trust (+1 rel)

## Conversation System
- 2 random goals shown per conversation (from 6: trust, charm, probe, threaten, inspire, sabotage)
- Recruit goal appears if relationship ≥3, circle not full, not former member
- Eavesdrop is separate action from camp screen
- Stat check: advantage = playerStat - npcStat + roll(-2,2)
- Circle members: -3 to NPC stat, can never produce fail (worst = neutral)
- Strong success on recruit = auto-accept

## Vote Formula (per NPC voter considering each target)
```
score = weakness + animosity + spotlight + lobbyBonus + circleBonus + factionBonus + threatBonus + graceBonus + noise

weakness: (3.0 - avgStat) if gap > 1, else 0
animosity: relationship * -2.5
spotlight: 1.5 if target has lowest spotlight stat (player exempt weeks 1-4)
lobbyBonus: +6 (strong) or +3 (partial)
circleBonus: if voter in player circle and target is player: -(2 + loyalty*0.5)
             if voter in circle and target matches player vote: +(3 + loyalty*0.5)
factionBonus: faction members NEVER vote for each other (hard skip)
             +4 toward faction leader's target
threatBonus: +1 if player ath≥7, +1 if lead≥6, -1 if per≥5
             +round(sqrt(circleSize)*1.5) from non-circle NPCs
graceBonus: -1 (weeks 1-2), -0.5 (weeks 3-4)
noise: randInt(-2, 2)
```

## Inner Circle
- Max size: floor(remainingPlayers / 2)
- Starting loyalty: min(6, 1 + relationship)
- Loyalty drifts toward relationship each week. -1 extra if lead≥7
- Departure: loyalty ≤3 triggers 15-60% leave chance
- Soft cap: over-cap members get -2 loyalty pressure (not instant eviction)
- Former members: can never be re-recruited, relationship hit on departure
- Circle members auto-coordinate votes (loyalty-scaled), deflect votes from player, share intel

## NPC Factions
- Form after week 3 (every 2 weeks), max 4 factions, 2-4 members each
- Discovered through eavesdropping (not passive Perception check)
- Faction members never vote for each other (hard block in vote formula)
- Faction leaders target: lowest relationship NPC, player gets extra threat from circle size
- Poaching faction leader disbands the entire faction
- Leader eliminated → faction disbands

## Events (weekly, up to 2)
- Gossip/rumors, faction aggression, power shifts, leaked votes, circle poaching, NPC meltdowns, management foreshadowing
- Chance scales: 30% + (day * 4), capped at 85%
- Start after week 3

## Performance Review (every 3 weeks)
- 3 random mini-games: Memory Match (6 pairs), Reaction Tap (5 rounds), Sequence Memory (3x3 grid)
- Player score vs NPC simulated scores (30-75 based on stats + noise)
- 1st place: immunity (can't be voted out)
- 2nd place (close loss): double vote token consolation

## Immunity Idol
- Found via eavesdrop: 8% on strong success, 3% on partial (after week 5)
- ~65% chance of finding one across a full game
- Play at board meeting: negates all votes against you. One use.

## Double Vote Token
- Earned from 2nd place in performance review
- Sets vote weight to 3 (doesn't stack with leadership — flat override)
- One use.

## Betrayal
- Voting for a circle member = betrayal
- Detection: max(15, 50 + victim.per*3 - player.snk*4)
- Detected: removed from circle permanently, relationship -10, all circle members -2 rel, reputation -2
- Undetected: +1 cut stat

## Relationship Decay
- All relationships decay 1 toward 0 per week
- Hotness ath≥5: decay every 2 weeks instead
- Zero stays zero (never pushes neutral to negative)

## Vote Exposure
- If your vote target survives: max(15, 70 - snk*6) chance they find out → -2 relationship

## Neutral NPC Q&A (before board meeting)
- Up to 3 neutral (relationship 0) NPCs ask you a question
- 15 question pool with archetype-aligned answers
- Right answer for archetype: +1 relationship. Wrong: -1.
- Archetype shown on the question card

## Tip-Off Mechanic
- If eavesdrop reveals someone targeting a person you like (rel ≥1)
- Can warn them for +2 relationship, or keep intel to yourself

## NPC Rivalries
- Discovered through strong eavesdrop success
- Voting for someone's rival earns +1 relationship with the rival
- Displayed on cards and at board meetings

## Eavesdrop Intel Confidence
- Formula: 40 + (per * 3) + (soc * 2) + 10 if strong success
- Range: 40-95%. Faction intel is 15% less certain.
- Color coded: green (75%+), sand (55-74%), grey (<55%)

## Endgame
- Triggers at 4 NPCs remaining (5 total)
- Final performance review → winner cuts down to 3 finalists
- If NPC wins and cuts player → game over
- Final tribal: jury (last 10 eliminated) asks questions
- Jury lean = respect - bitterness. Q&A shifts lean ±2 (good archetype match) or -3 (bad + bitter)
- Bitterness ≥7: good answers give 0 (words can't fix actions). Bad answers: -3.
- Lean > 0 → votes for player

## Jury Bitterness Sources
- Relationship ≤-3: +4
- Relationship ≤-1: +2
- Detected betrayal: +3
- Former circle member: +2
- Resilience ≥5: -1 (jurors respect endurance)

## Spotlight Stat Weighting by Phase
- Weeks 1-4: Social + Image (ath, soc heavy)
- Weeks 5-9: Political (snk, lead, per heavy)
- Weeks 10+: Ruthless (cut, lead, snk heavy)

## Tiebreak
- Tied votes trigger a revote with only tied candidates
- If player is in the tie, they can't vote

## Playstyle Classifications (game over)
- Backstabber, Shadow, Puppet Master, People Person, Inner Circle, Networker, Smooth Operator, Loose Cannon, Survivor, Balanced Player, Wildcard

## Key Balance Decisions Made During Development
1. Grace period prevents early game death spiral (weeks 1-4 protections)
2. Circle threat scaling is sub-linear (sqrt) so big circles aren't free wins
3. Social Skills bonus only applies to trust/recruit goals (not all conversations)
4. Eavesdrop is separate from conversations (own pool of 3) so intel doesn't compete with relationship building
5. Faction members can NEVER vote for each other (hard block, not just penalty)
6. Free circle chat (1/week) prevents circle maintenance from consuming all conversations
7. Circle members can't produce conversation fails (worst = neutral)
8. Relationship decay never pushes 0 to negative — strangers stay strangers
9. Idol finding is ~65% per game (not guaranteed, not impossible)
10. Late game stat growth slows (+1/week instead of +2 after week 10) to prevent domination
