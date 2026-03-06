import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Settings, Cpu, Trophy, AlertCircle, X, User, Swords } from 'lucide-react';
import confetti from 'canvas-confetti';
import WordleBoard from './components/WordleBoard';
import HumanBoard from './components/HumanBoard';
import { WORD_LIST, checkGuess, GuessResult } from './constants';
import { getNextGuess, AgentConfig, Provider } from './services/llmService';

const MAX_GUESSES = 6;

type GameMode = 'agents' | 'agents-vs-human';

export default function App() {
  const [targetWord, setTargetWord] = useState('');
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [winner, setWinner] = useState<string | null>(null);
  const [winnerDetail, setWinnerDetail] = useState<string | null>(null);
  const [showWinnerPopup, setShowWinnerPopup] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>('agents-vs-human');

  useEffect(() => {
    fetch('/api/ollama/tags')
      .then(res => res.json())
      .then(data => {
        if (data.models) {
          setAvailableModels(data.models.map((m: any) => m.name));
        }
      })
      .catch(err => console.error("Failed to fetch models:", err));
  }, []);

  const [agent1, setAgent1] = useState<AgentConfig>({
    id: 'agent1',
    name: 'Agent Alpha',
    provider: 'ollama',
    model: 'qwen2.5vl:7b'
  });

  const [agent2, setAgent2] = useState<AgentConfig>({
    id: 'agent2',
    name: 'Agent Beta',
    provider: 'ollama',
    model: 'llama3.2:latest'
  });

  const [agent1Guesses, setAgent1Guesses] = useState<{ guess: string; result: GuessResult[], thought?: string }[]>([]);
  const [agent2Guesses, setAgent2Guesses] = useState<{ guess: string; result: GuessResult[], thought?: string }[]>([]);
  const [humanGuesses, setHumanGuesses] = useState<{ guess: string; result: GuessResult[] }[]>([]);

  const [agent1Retries, setAgent1Retries] = useState(0);
  const [agent2Retries, setAgent2Retries] = useState(0);

  const [isAgent1Thinking, setIsAgent1Thinking] = useState(false);
  const [isAgent2Thinking, setIsAgent2Thinking] = useState(false);

  const declareWinner = useCallback((name: string, detail: string) => {
    setWinner(currentWinner => {
      if (currentWinner) return currentWinner; // Already have a winner

      setWinnerDetail(detail);
      setGameState('finished');
      setShowWinnerPopup(true);
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
      return name;
    });
  }, []);

  const initGame = () => {
    const word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    setTargetWord(word);
    setAgent1Guesses([]);
    setAgent2Guesses([]);
    setHumanGuesses([]);
    setAgent1Retries(0);
    setAgent2Retries(0);
    setGameState('playing');
    setWinner(null);
    setWinnerDetail(null);
    setShowWinnerPopup(false);
    setError(null);
    console.log("Target Word:", word);
  };

  const submitHumanGuess = (guess: string) => {
    if (gameState !== 'playing' || humanGuesses.length >= MAX_GUESSES || winner) return;
    const result = checkGuess(guess, targetWord);
    const newGuesses = [...humanGuesses, { guess, result }];
    setHumanGuesses(newGuesses);
    if (guess === targetWord) {
      declareWinner('You (Human)', 'Human Player');
    }
  };

  const solveStep = async (
    agent: AgentConfig,
    guesses: { guess: string; result: GuessResult[], thought?: string }[],
    setGuesses: React.Dispatch<React.SetStateAction<{ guess: string; result: GuessResult[], thought?: string }[]>>,
    setThinking: React.Dispatch<React.SetStateAction<boolean>>,
    setRetries: React.Dispatch<React.SetStateAction<number>>
  ) => {
    if (gameState !== 'playing' || guesses.length >= MAX_GUESSES || winner) return false;

    if (guesses.length > 0 && guesses[guesses.length - 1].guess === targetWord) return true;

    setThinking(true);
    try {
      const { guess, thought } = await getNextGuess(agent, guesses);
      const result = checkGuess(guess, targetWord);
      const newGuesses = [...guesses, { guess, result, thought }];
      setGuesses(newGuesses);
      if (guess === targetWord) {
        return true;
      }
    } catch (err: any) {
      setRetries(prev => prev + 1);
      setError(`${agent.name}: ${err.message}`);
    } finally {
      setThinking(false);
    }
    return false;
  };

  // Agent 1 Independent Game Loop
  useEffect(() => {
    let mounted = true;
    if (gameState === 'playing' && !winner && agent1Guesses.length < MAX_GUESSES && !isAgent1Thinking) {
      const timer = setTimeout(() => {
        if (!mounted) return;
        solveStep(agent1, agent1Guesses, setAgent1Guesses, setIsAgent1Thinking, setAgent1Retries).then(won => {
          if (won && mounted) declareWinner(agent1.name, `${agent1.name} (${agent1.model})`);
        });
      }, 500);
      return () => {
        mounted = false;
        clearTimeout(timer);
      };
    }
  }, [gameState, winner, agent1Guesses, isAgent1Thinking, agent1, targetWord, declareWinner]);

  // Agent 2 Independent Game Loop
  useEffect(() => {
    let mounted = true;
    if (gameState === 'playing' && !winner && agent2Guesses.length < MAX_GUESSES && !isAgent2Thinking) {
      const timer = setTimeout(() => {
        if (!mounted) return;
        solveStep(agent2, agent2Guesses, setAgent2Guesses, setIsAgent2Thinking, setAgent2Retries).then(won => {
          if (won && mounted) declareWinner(agent2.name, `${agent2.name} (${agent2.model})`);
        });
      }, 500);
      return () => {
        mounted = false;
        clearTimeout(timer);
      };
    }
  }, [gameState, winner, agent2Guesses, isAgent2Thinking, agent2, targetWord, declareWinner]);

  // Check if all participants have exhausted guesses with no winner
  useEffect(() => {
    if (gameState !== 'playing' || winner) return;
    const agentsExhausted = agent1Guesses.length >= MAX_GUESSES && agent2Guesses.length >= MAX_GUESSES;
    const humanExhausted = gameMode === 'agents' || humanGuesses.length >= MAX_GUESSES;
    if (agentsExhausted && humanExhausted) {
      setWinner('Nobody');
      setWinnerDetail('No one solved the word');
      setGameState('finished');
      setShowWinnerPopup(true);
    }
  }, [agent1Guesses, agent2Guesses, humanGuesses, gameState, winner, gameMode]);

  const isHumanWinner = winner === 'You (Human)';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-white/10 p-6 flex justify-between items-center bg-black/20 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Cpu className="text-black w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Wordle Agent Duel</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-mono">Autonomous Solver Arena</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {gameState === 'idle' ? (
            <button
              onClick={initGame}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-black px-6 py-2.5 rounded-full font-bold transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              <Play size={18} fill="currentColor" />
              Start Duel
            </button>
          ) : (
            <button
              onClick={() => { setGameState('idle'); setShowWinnerPopup(false); }}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-full font-bold transition-all active:scale-95"
            >
              <RotateCcw size={18} />
              Reset
            </button>
          )}
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto p-6 lg:p-12">
        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400"
            >
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-bold text-sm">Connection Error</p>
                <p className="text-xs opacity-80">{error}</p>
                <p className="text-[10px] mt-2 opacity-60">Ensure Ollama is running locally on port 11434.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Arena */}
        <div className={`grid grid-cols-1 gap-8 items-start ${gameMode === 'agents-vs-human' ? 'lg:grid-cols-3 lg:gap-8' : 'lg:grid-cols-2 lg:gap-16'}`}>
          <WordleBoard
            agentName={agent1.name}
            guesses={agent1Guesses}
            maxGuesses={MAX_GUESSES}
            isWinner={winner === agent1.name || winner === 'Tie'}
            isGameOver={gameState === 'finished'}
            isThinking={isAgent1Thinking}
            retries={agent1Retries}
          />

          <WordleBoard
            agentName={agent2.name}
            guesses={agent2Guesses}
            maxGuesses={MAX_GUESSES}
            isWinner={winner === agent2.name || winner === 'Tie'}
            isGameOver={gameState === 'finished'}
            isThinking={isAgent2Thinking}
            retries={agent2Retries}
          />

          {gameMode === 'agents-vs-human' && (
            <HumanBoard
              guesses={humanGuesses}
              maxGuesses={MAX_GUESSES}
              isWinner={isHumanWinner}
              isGameOver={gameState === 'finished'}
              onSubmitGuess={submitHumanGuess}
            />
          )}
        </div>

        {/* Winner Popup Modal */}
        <AnimatePresence>
          {showWinnerPopup && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => setShowWinnerPopup(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.85, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: 30 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="bg-[#141414] border border-white/10 rounded-3xl p-8 max-w-md w-full relative shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Close Button */}
                <button
                  onClick={() => setShowWinnerPopup(false)}
                  className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>

                <div className="text-center">
                  <Trophy className="mx-auto mb-4 text-emerald-400" size={56} />
                  <h2 className="text-3xl font-bold mb-2">
                    {winner === 'Nobody' ? 'No Winner!' : winner === 'Tie' ? "It's a Tie!" : `${winner} Wins!`}
                  </h2>
                  {winnerDetail && (
                    <p className="text-sm text-white/50 mb-4">{winnerDetail}</p>
                  )}
                  <p className="text-white/60 mb-6 font-mono uppercase tracking-widest text-xs">
                    Target Word: <span className="text-white font-bold">{targetWord}</span>
                  </p>
                  <button
                    onClick={initGame}
                    className="bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-3 rounded-full font-bold transition-all"
                  >
                    Play Again
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings / Config */}
        {gameState === 'idle' && (
          <div className="mt-16 space-y-8">
            {/* Game Mode Selector */}
            <div className="flex justify-center gap-4">
              <button
                onClick={() => setGameMode('agents')}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all border ${gameMode === 'agents'
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60 hover:border-white/20'
                  }`}
              >
                <Swords size={18} />
                Agents Only
              </button>
              <button
                onClick={() => setGameMode('agents-vs-human')}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all border ${gameMode === 'agents-vs-human'
                  ? 'bg-violet-500/20 border-violet-500/50 text-violet-400'
                  : 'bg-white/5 border-white/10 text-white/40 hover:text-white/60 hover:border-white/20'
                  }`}
              >
                <User size={18} />
                Agents vs Human
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <AgentSettings
                config={agent1}
                onChange={setAgent1}
                title="Agent 1 Configuration"
                availableModels={availableModels}
              />
              <AgentSettings
                config={agent2}
                onChange={setAgent2}
                title="Agent 2 Configuration"
                availableModels={availableModels}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

const PROVIDER_OPTIONS: { value: Provider; label: string }[] = [
  { value: 'ollama', label: 'Ollama (Local)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'gaia', label: 'Gaia' },
  { value: 'aisa', label: 'AIsa.one' },
];

const MODEL_PLACEHOLDERS: Record<Provider, string> = {
  ollama: 'llama3.2:latest',
  openai: 'gpt-4o-mini',
  gaia: 'llama',
  aisa: 'asi1-mini',
};

function AgentSettings({ config, onChange, title, availableModels }: { config: AgentConfig, onChange: (c: AgentConfig) => void, title: string, availableModels: string[] }) {
  const handleProviderChange = (provider: Provider) => {
    onChange({ ...config, provider, model: MODEL_PLACEHOLDERS[provider], baseUrl: undefined });
  };

  return (
    <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
      <h3 className="text-sm font-mono uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
        <Settings size={14} />
        {title}
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-[10px] uppercase tracking-wider text-white/30 mb-1.5 ml-1">Agent Name</label>
          <input
            type="text"
            value={config.name}
            onChange={(e) => onChange({ ...config, name: e.target.value })}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-white/30 mb-1.5 ml-1">Provider</label>
          <select
            value={config.provider}
            onChange={(e) => handleProviderChange(e.target.value as Provider)}
            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
          >
            {PROVIDER_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] uppercase tracking-wider text-white/30 mb-1.5 ml-1">Model</label>
          {config.provider === 'ollama' && availableModels.length > 0 ? (
            <select
              value={config.model}
              onChange={(e) => onChange({ ...config, model: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
            >
              {!availableModels.includes(config.model) && <option value={config.model}>{config.model}</option>}
              {availableModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              value={config.model}
              onChange={(e) => onChange({ ...config, model: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
              placeholder={MODEL_PLACEHOLDERS[config.provider]}
            />
          )}
        </div>

        {config.provider === 'gaia' && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/30 mb-1.5 ml-1">Base URL (Gaia Node)</label>
            <input
              type="text"
              value={config.baseUrl || ''}
              onChange={(e) => onChange({ ...config, baseUrl: e.target.value || undefined })}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
              placeholder="https://your-node.gaia.domains/v1/chat/completions"
            />
          </div>
        )}

        {config.provider !== 'ollama' && (
          <p className="text-[10px] text-white/20 ml-1">Set the API key in your .env file before starting.</p>
        )}
      </div>
    </div>
  );
}
