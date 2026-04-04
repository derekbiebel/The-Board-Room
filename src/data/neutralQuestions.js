/**
 * Question bank for neutral NPCs at board meetings.
 * Each question has 3 answers with archetype alignment.
 * {NAME} is replaced with the NPC's name at runtime.
 */
export const NEUTRAL_QUESTIONS = [
  // --- "Why should I keep you" variants ---
  {
    question: `{NAME} glances at you. "We've never really talked. Why should I keep you around?"`,
    options: [
      { text: "Because I'm not coming for you. I can't say that about everyone here.", goodFor: ['floater', 'loyalist', 'social_butterfly'], badFor: ['schemer', 'bully'] },
      { text: "Because I'm useful. Stick with me and you'll see.", goodFor: ['strategist', 'schemer'], badFor: ['loyalist', 'social_butterfly'] },
      { text: "You shouldn't need a reason. I haven't done anything to you.", goodFor: ['wildcard', 'floater'], badFor: ['bully', 'strategist'] },
    ],
  },
  {
    question: `{NAME}: "Give me one good reason not to write your name down tonight."`,
    options: [
      { text: "Because if you come for me, I'll remember. And I have a long memory.", goodFor: ['schemer', 'bully', 'strategist'], badFor: ['loyalist', 'social_butterfly'] },
      { text: "Because I'm more valuable to you alive than gone. Think about next week.", goodFor: ['strategist', 'floater'], badFor: ['bully', 'wildcard'] },
      { text: "Because we could actually help each other if you'd give me a chance.", goodFor: ['social_butterfly', 'loyalist'], badFor: ['schemer'] },
    ],
  },
  {
    question: `{NAME} corners you by the elevator. "Sell me. Why you?"`,
    options: [
      { text: "I'm not the biggest threat here and you know it. Vote smart.", goodFor: ['strategist', 'floater', 'schemer'], badFor: ['bully', 'loyalist'] },
      { text: "I've been playing clean. No backstabbing, no drama. That should count.", goodFor: ['loyalist', 'social_butterfly'], badFor: ['schemer', 'wildcard'] },
      { text: "Because while everyone else is scheming, I'm actually working.", goodFor: ['bully', 'wildcard'], badFor: ['floater', 'strategist'] },
    ],
  },

  // --- "I don't know you" variants ---
  {
    question: `{NAME}: "I don't know you. And in this office, that makes me nervous."`,
    options: [
      { text: "Fair. Let me fix that — what do you need from me?", goodFor: ['social_butterfly', 'loyalist', 'floater'], badFor: ['bully', 'schemer'] },
      { text: "I've been busy surviving. But I see you. And I respect your game.", goodFor: ['strategist', 'schemer', 'wildcard'], badFor: ['loyalist'] },
      { text: "Nervous is smart. It means you're paying attention.", goodFor: ['bully', 'wildcard'], badFor: ['social_butterfly', 'floater'] },
    ],
  },
  {
    question: `{NAME}: "You've been flying under my radar. Is that on purpose?"`,
    options: [
      { text: "Not on purpose. I just had other fires to put out first.", goodFor: ['loyalist', 'floater', 'social_butterfly'], badFor: ['schemer'] },
      { text: "Maybe. Sometimes the best move is to not be seen.", goodFor: ['schemer', 'strategist', 'wildcard'], badFor: ['bully', 'loyalist'] },
      { text: "I don't play the 'be seen' game. I play the 'be here at the end' game.", goodFor: ['floater', 'strategist'], badFor: ['social_butterfly', 'bully'] },
    ],
  },
  {
    question: `{NAME} leans against the wall. "I realized today I couldn't tell you three things about you. That's a problem."`,
    options: [
      { text: "You're right, and that's my fault. I should have made the effort.", goodFor: ['loyalist', 'social_butterfly'], badFor: ['bully', 'schemer'] },
      { text: "You don't need to know me to know I'm not your enemy.", goodFor: ['floater', 'wildcard', 'strategist'], badFor: ['loyalist'] },
      { text: "Maybe you should have paid closer attention.", goodFor: ['bully', 'schemer'], badFor: ['social_butterfly', 'floater', 'loyalist'] },
    ],
  },

  // --- "Trust" variants ---
  {
    question: `{NAME}: "Everyone's got their people. Who are yours? And why aren't I one of them?"`,
    options: [
      { text: "Honestly? I wish you were. I should have reached out sooner.", goodFor: ['loyalist', 'social_butterfly'], badFor: ['schemer', 'strategist'] },
      { text: "I keep my circle small on purpose. But that doesn't make you my enemy.", goodFor: ['strategist', 'floater', 'wildcard'], badFor: ['bully'] },
      { text: "I don't owe you an explanation for who I spend my time with.", goodFor: ['bully', 'schemer'], badFor: ['loyalist', 'social_butterfly', 'floater'] },
    ],
  },
  {
    question: `{NAME}: "I've watched you work the room all week. Should I be worried?"`,
    options: [
      { text: "Only if you're planning to come after me.", goodFor: ['schemer', 'bully', 'strategist'], badFor: ['floater', 'loyalist'] },
      { text: "I talk to people. That's not a crime. I'd talk to you too if you let me.", goodFor: ['social_butterfly', 'loyalist', 'floater'], badFor: ['schemer'] },
      { text: "Worried? No. Paying attention? You should be.", goodFor: ['wildcard', 'bully'], badFor: ['social_butterfly', 'loyalist'] },
    ],
  },
  {
    question: `{NAME} catches your eye across the room. "Can I trust you? Straight answer."`,
    options: [
      { text: "Yes. I have no reason to come for you.", goodFor: ['loyalist', 'social_butterfly', 'floater'], badFor: ['schemer'] },
      { text: "Trust is earned. I'm willing to start if you are.", goodFor: ['strategist', 'wildcard', 'schemer'], badFor: ['bully'] },
      { text: "In this office? You can't fully trust anyone. But I'm not your problem.", goodFor: ['floater', 'schemer', 'bully'], badFor: ['loyalist', 'social_butterfly'] },
    ],
  },

  // --- "What's your game" variants ---
  {
    question: `{NAME}: "I can't figure out your angle. What are you actually playing at?"`,
    options: [
      { text: "Survival. Same as you. I'm not trying to run the show.", goodFor: ['floater', 'loyalist'], badFor: ['schemer', 'strategist'] },
      { text: "If I told you my angle, it wouldn't be much of an angle, would it?", goodFor: ['schemer', 'wildcard'], badFor: ['loyalist', 'social_butterfly'] },
      { text: "I'm playing it straight. Build relationships, earn my spot. That's it.", goodFor: ['social_butterfly', 'loyalist'], badFor: ['bully', 'wildcard'] },
    ],
  },
  {
    question: `{NAME}: "People talk about you, you know. What do you think they say?"`,
    options: [
      { text: "Probably that I'm quiet. But quiet isn't the same as harmless.", goodFor: ['schemer', 'strategist', 'floater'], badFor: ['bully'] },
      { text: "I hope they say I'm someone they can count on.", goodFor: ['loyalist', 'social_butterfly'], badFor: ['schemer', 'bully'] },
      { text: "I don't waste energy worrying about gossip.", goodFor: ['bully', 'wildcard', 'floater'], badFor: ['social_butterfly'] },
    ],
  },
  {
    question: `{NAME} pulls you aside. "Level with me. Am I on your list?"`,
    options: [
      { text: "No. You're not even close to being on my radar.", goodFor: ['floater', 'loyalist', 'social_butterfly'], badFor: ['strategist'] },
      { text: "Not today. But I won't make promises I can't keep.", goodFor: ['strategist', 'schemer', 'wildcard'], badFor: ['loyalist'] },
      { text: "If you were, would I tell you?", goodFor: ['schemer', 'bully'], badFor: ['loyalist', 'social_butterfly', 'floater'] },
    ],
  },

  // --- "Prove yourself" variants ---
  {
    question: `{NAME}: "The last few people who got cut — they all had one thing in common. They were forgettable. Make me remember you."`,
    options: [
      { text: "I've been building something behind the scenes. You'll see the results soon.", goodFor: ['strategist', 'schemer'], badFor: ['loyalist', 'floater'] },
      { text: "I'd rather be underestimated than overexposed. The flashy ones go home first.", goodFor: ['floater', 'wildcard', 'schemer'], badFor: ['bully'] },
      { text: "I'm still here, aren't I? That should tell you something.", goodFor: ['bully', 'loyalist', 'wildcard'], badFor: ['strategist'] },
    ],
  },
  {
    question: `{NAME}: "Everyone says they're playing fair. Nobody actually is. At least be honest about it."`,
    options: [
      { text: "You're right. I've made moves. But I've never pretended otherwise.", goodFor: ['schemer', 'strategist', 'bully'], badFor: ['loyalist'] },
      { text: "I actually have been playing fair. I know that's hard to believe in here.", goodFor: ['loyalist', 'social_butterfly'], badFor: ['schemer', 'bully'] },
      { text: "Fair is a spectrum. I'm doing what I need to. No more, no less.", goodFor: ['floater', 'wildcard', 'strategist'], badFor: ['social_butterfly'] },
    ],
  },
  {
    question: `{NAME} sits down next to you. "If you had to vote someone out right now — not counting me — who would it be and why?"`,
    options: [
      { text: "Whoever's running the biggest faction. They're the real threat, not me.", goodFor: ['strategist', 'schemer', 'floater'], badFor: ['loyalist'] },
      { text: "I'd rather not say. Naming names in the open is how you make enemies.", goodFor: ['floater', 'loyalist', 'social_butterfly'], badFor: ['bully', 'wildcard'] },
      { text: "The person who's been coasting. At least I'm fighting for my spot.", goodFor: ['bully', 'wildcard'], badFor: ['floater', 'social_butterfly'] },
    ],
  },
];
