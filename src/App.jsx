import { useState, useEffect } from 'react';
import useGameStore from './stores/gameStore';
import CharacterCreateScreen from './screens/CharacterCreateScreen';
import CampScreen from './screens/CampScreen';
import ConversationScreen from './screens/ConversationScreen';
import ChallengeScreen from './screens/ChallengeScreen';
import TribalCouncilScreen from './screens/TribalCouncilScreen';
import StatAllocationScreen from './screens/StatAllocationScreen';
import FinalChallengeScreen from './screens/FinalChallengeScreen';
import FinalTribalScreen from './screens/FinalTribalScreen';
import GameOverScreen from './screens/GameOverScreen';
import HelpScreen from './screens/HelpScreen';

const SCREENS = {
  create: CharacterCreateScreen,
  camp: CampScreen,
  conversation: ConversationScreen,
  challenge: ChallengeScreen,
  tribal: TribalCouncilScreen,
  statAllocation: StatAllocationScreen,
  finalChallenge: FinalChallengeScreen,
  finalTribal: FinalTribalScreen,
  gameOver: GameOverScreen,
  help: HelpScreen,
};

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const setScreen = useGameStore((s) => s.setScreen);
  const [checkedFirstVisit, setCheckedFirstVisit] = useState(false);

  // Show help on first ever visit
  useEffect(() => {
    const seen = localStorage.getItem('the-board-room-help-seen');
    if (!seen && screen === 'create') {
      localStorage.setItem('the-board-room-help-seen', '1');
      setScreen('help');
    }
    setCheckedFirstVisit(true);
  }, []);

  if (!checkedFirstVisit) return null;

  const Screen = SCREENS[screen] || CharacterCreateScreen;

  return (
    <div className="min-h-dvh flex flex-col">
      <Screen />
    </div>
  );
}
