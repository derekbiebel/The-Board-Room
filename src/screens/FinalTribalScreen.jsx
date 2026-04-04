import { useState, useMemo } from 'react';
import useGameStore from '../stores/gameStore';
import { ARCHETYPES } from '../data/archetypes';
import { buildJury, generateJuryQuestions, resolveJuryAnswer, simulateJuryVote } from '../engine/juryEngine';
import { pick } from '../utils/random';

export default function FinalTribalScreen() {
  const {
    player, contestants, eliminationLog, betrayals, setScreen,
  } = useGameStore();

  const active = contestants.filter((c) => !c.isEliminated);

  // Build jury and finalists once
  const jury = useMemo(
    () => buildJury(eliminationLog, contestants, player, betrayals),
    []
  );

  const finalists = useMemo(() => {
    const npcs = active.map((c) => ({
      id: c.id, name: c.name, stats: c.stats, isPlayer: false,
    }));
    return [
      { id: player.id, name: player.name, stats: player.stats, isPlayer: true },
      ...npcs,
    ];
  }, []);

  const questions = useMemo(
    () => generateJuryQuestions(jury, player, betrayals),
    []
  );

  const [phase, setPhase] = useState('intro'); // intro | questions | voting | results
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answerResults, setAnswerResults] = useState([]);
  const [voteResult, setVoteResult] = useState(null);
  const [revealIndex, setRevealIndex] = useState(0);
  const [lastResult, setLastResult] = useState(null);

  const handleAnswer = (option) => {
    const q = questions[questionIndex];
    const result = resolveJuryAnswer(q.juror, option);

    // Apply lean shift directly to the juror
    q.juror.lean += result.shift;

    setAnswerResults([...answerResults, { juror: q.juror, option, result }]);
    setLastResult(result);

    if (questionIndex < questions.length - 1) {
      setQuestionIndex(questionIndex + 1);
    } else {
      // All questions answered — simulate the vote using updated leans
      const vr = simulateJuryVote(jury, finalists, player, contestants);
      setVoteResult(vr);
      setPhase('voting');
    }
  };

  // Animate vote reveals
  const handleRevealNext = () => {
    if (voteResult && revealIndex < voteResult.votes.length) {
      setRevealIndex(revealIndex + 1);
    }
    if (voteResult && revealIndex >= voteResult.votes.length - 1) {
      setTimeout(() => setPhase('results'), 1500);
    }
  };

  const getFinalistName = (id) => {
    if (id === player.id) return player.name + ' (You)';
    const c = contestants.find((x) => x.id === id);
    return c?.name || 'Unknown';
  };

  return (
    <div className="flex-1 flex flex-col bg-earth-900">
      {/* Intro */}
      {phase === 'intro' && (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 fade-in">
          <div className="text-4xl mb-4">⚖️</div>
          <h1 className="text-2xl font-bold text-earth-100 mb-2">The Final Board Meeting</h1>
          <p className="text-sm text-earth-300 mb-2">{finalists.length} candidates remain. One position.</p>
          <p className="text-sm text-earth-600 mb-4">
            The jury of {jury.length} former employees will decide who keeps their job.
          </p>

          {/* Finalists */}
          <div className="w-full max-w-sm space-y-2 mb-6">
            {finalists.map((f) => (
              <div key={f.id} className={`bg-earth-800 border rounded-lg p-3 flex items-center gap-3 ${
                f.isPlayer ? 'border-torch/40' : 'border-earth-700'
              }`}>
                <span className="text-lg">{f.isPlayer ? '👤' : ARCHETYPES[contestants.find((c) => c.id === f.id)?.archetype]?.emoji || '👤'}</span>
                <span className={`text-sm font-medium ${f.isPlayer ? 'text-torch' : 'text-earth-100'}`}>
                  {f.name} {f.isPlayer ? '(You)' : ''}
                </span>
              </div>
            ))}
          </div>

          {/* Jury preview */}
          <div className="text-xs text-earth-600 mb-6">
            Jury: {jury.map((j) => j.name).join(', ')}
          </div>

          <button
            onClick={() => setPhase('questions')}
            className="bg-torch hover:bg-torch-dim text-earth-900 font-bold py-3 px-8 rounded-lg transition-colors active:scale-95"
          >
            Face the Jury
          </button>
        </div>
      )}

      {/* Jury Questions */}
      {phase === 'questions' && questions[questionIndex] && (
        <div className="flex-1 p-4 fade-in">
          <div className="text-center mb-4">
            <span className="text-xs text-earth-600">Question {questionIndex + 1} of {questions.length}</span>
          </div>

          {/* Show previous answer result */}
          {lastResult && questionIndex > 0 && (
            <div className={`text-center py-2 mb-4 rounded-lg text-sm ${
              lastResult.shift > 0 ? 'bg-jungle/10 text-jungle-light' :
              lastResult.shift < 0 ? 'bg-ember/10 text-ember' :
              'bg-earth-800 text-earth-600'
            }`}>
              {lastResult.message}
            </div>
          )}

          <div className="bg-earth-800 border border-earth-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-earth-100 font-serif italic">
              {questions[questionIndex].question}
            </p>
          </div>

          <div className="space-y-2">
            {questions[questionIndex].options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(opt)}
                className="w-full bg-earth-800 border border-earth-700 rounded-lg p-4 text-left hover:border-torch transition-colors active:scale-[0.98]"
              >
                <p className="text-sm text-earth-100">"{opt.text}"</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Vote Reveal */}
      {phase === 'voting' && voteResult && (
        <div className="flex-1 p-4 fade-in">
          <h2 className="text-lg font-bold text-earth-100 text-center mb-4">The Votes Are In</h2>

          {/* Last answer result */}
          {lastResult && (
            <div className={`text-center py-2 mb-4 rounded-lg text-sm ${
              lastResult.shift > 0 ? 'bg-jungle/10 text-jungle-light' :
              lastResult.shift < 0 ? 'bg-ember/10 text-ember' :
              'bg-earth-800 text-earth-600'
            }`}>
              {lastResult.message}
            </div>
          )}

          <div className="space-y-2 mb-6">
            {voteResult.votes.slice(0, revealIndex).map((v, i) => (
              <div
                key={i}
                className="vote-card bg-earth-800 border border-earth-700 rounded-lg p-3 flex justify-between items-center"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <span className="text-sm text-earth-600">{v.jurorName}</span>
                <span className={`text-sm font-medium ${
                  v.votedFor === player.id ? 'text-torch' : 'text-earth-300'
                }`}>
                  → {getFinalistName(v.votedFor)}
                </span>
              </div>
            ))}
          </div>

          {revealIndex < voteResult.votes.length ? (
            <button
              onClick={handleRevealNext}
              className="w-full bg-earth-800 hover:bg-earth-700 text-earth-100 font-bold py-3 rounded-lg border border-earth-700 transition-colors active:scale-95"
            >
              Reveal Next Vote
            </button>
          ) : (
            <button
              onClick={() => setPhase('results')}
              className="w-full bg-torch hover:bg-torch-dim text-earth-900 font-bold py-3 rounded-lg transition-colors active:scale-95"
            >
              See the Results
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {phase === 'results' && voteResult && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 fade-in">
          <div className="text-5xl mb-4">
            {voteResult.winner.isPlayer ? '🏆' : '📦'}
          </div>
          <h1 className="text-2xl font-bold text-earth-100 mb-2">
            {voteResult.winner.isPlayer ? 'You Got the Promotion' : `${voteResult.winner.name} Wins`}
          </h1>
          <p className="text-sm text-earth-600 mb-6">
            {voteResult.winner.isPlayer
              ? 'The jury has spoken. The corner office is yours.'
              : `The jury chose ${voteResult.winner.name} over you. Better luck in the next restructuring.`
            }
          </p>

          {/* Vote breakdown */}
          <div className="w-full max-w-sm bg-earth-800 border border-earth-700 rounded-lg p-4 mb-6">
            <h3 className="text-sm font-bold text-earth-100 mb-2">Final Tally</h3>
            {voteResult.sorted.map(([id, data]) => (
              <div key={id} className={`flex justify-between text-sm py-1 ${
                id === player.id ? 'text-torch font-bold' : 'text-earth-300'
              }`}>
                <span>{getFinalistName(id)}</span>
                <span>{data.votes} vote{data.votes !== 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>

          <button
            onClick={() => setScreen('gameOver')}
            className="w-full max-w-sm bg-torch hover:bg-torch-dim text-earth-900 font-bold py-3 rounded-lg transition-colors active:scale-95"
          >
            See Full Summary
          </button>
        </div>
      )}
    </div>
  );
}
