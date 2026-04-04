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
};

export default function App() {
  const screen = useGameStore((s) => s.screen);
  const Screen = SCREENS[screen] || CharacterCreateScreen;

  return (
    <div className="min-h-dvh flex flex-col">
      <Screen />
    </div>
  );
}
