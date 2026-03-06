import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, RotateCcw, Settings, Cpu, Trophy, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import WordleBoard from './components/WordleBoard';
import { WORD_LIST, checkGuess, GuessResult } from './constants';
import { getNextGuess, AgentConfig } from './services/llmService';

const MAX_GUESSES = 6;

export default function App() {
  const [targetWord, setTargetWord] = useState('');
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'finished'>('idle');
  const [winner, setWinner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [agent1, setAgent1] = useState<AgentConfig>({
    id: 'agent1',
    name: 'Agent Alpha',
    provider: 'gemini',
    model: 'gemini-3-flash-preview'
  });

  const [agent2, setAgent2] = useState<AgentConfig>({
    id: 'agent2',
    name: 'Agent Beta',
    provider: 'ollama',
    model: 'llama3'
  });

  const [agent1Guesses, setAgent1Guesses] = useState<{ guess: string; result: GuessResult[] }[]>([]);
  const [agent2Guesses, setAgent2Guesses] = useState<{ guess: string; result: GuessResult[] }[]>([]);
  
  const [isAgent1Thinking, setIsAgent1Thinking] = useState(false);
  const [isAgent2Thinking, setIsAgent2Thinking] = useState(false);

  const initGame = () => {
    const word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
    setTargetWord(word);
    setAgent1Guesses([]);
    setAgent2Guesses([]);
    setGameState('playing');
    setWinner(null);
    setError(null);
    console.log("Target Word:", word); // For debugging
  };

  const solveStep = async (
    agent: AgentConfig, 
    guesses: { guess: string; result: GuessResult[] }[],
    setGuesses: React.Dispatch<React.SetStateAction<{ guess: string; result: GuessResult[] }[]>>,
    setThinking: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    if (gameState !== 'playing' || guesses.length >= MAX_GUESSES) return false;
    
    // Check if already won
    if (guesses.length > 0 && guesses[guesses.length - 1].guess === targetWord) return true;

    setThinking(true);
    try {
      const guess = await getNextGuess(agent, guesses);
      const result = checkGuess(guess, targetWord);
      
      const newGuesses = [...guesses, { guess, result }];
      setGuesses(newGuesses);
      
      if (guess === targetWord) {
        return true;
      }
    } catch (err: any) {
      setError(`${agent.name}: ${err.message}`);
      setGameState('idle');
    } finally {
      setThinking(false);
    }
    return false;
  };

  const runDuel = useCallback(async () => {
    if (gameState !== 'playing') return;

    let a1Finished = false;
    let a2Finished = false;

    // We run them in a loop until someone wins or both fail
    while (gameState === 'playing' && (!a1Finished || !a2Finished)) {
      const promises = [];
      
      if (!a1Finished && agent1Guesses.length < MAX_GUESSES) {
        promises.push(solveStep(agent1, agent1Guesses, setAgent1Guesses, setIsAgent1Thinking));
      } else {
        a1Finished = true;
      }

      if (!a2Finished && agent2Guesses.length < MAX_GUESSES) {
        promises.push(solveStep(agent2, agent2Guesses, setAgent2Guesses, setIsAgent2Thinking));
      } else {
        a2Finished = true;
      }

      if (promises.length === 0) break;

      const results = await Promise.all(promises);
      
      // Check if anyone won in this round
      const a1Won = !a1Finished && results[0] === true;
      const a2Won = !a2Finished && (promises.length === 2 ? results[1] === true : results[0] === true);

      if (a1Won && a2Won) {
        setWinner('Tie');
        setGameState('finished');
        break;
      } else if (a1Won) {
        setWinner(agent1.name);
        setGameState('finished');
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        break;
      } else if (a2Won) {
        setWinner(agent2.name);
        setGameState('finished');
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
        break;
      }

      // Update local state for next loop iteration
      // This is a bit tricky since state updates are async. 
      // In a real duel, we might want to wait for state to settle or use refs.
      // For simplicity, we'll let the useEffect handle the next turn.
      break; 
    }
  }, [gameState, targetWord, agent1Guesses, agent2Guesses]);

  useEffect(() => {
    if (gameState === 'playing' && !winner) {
      const timer = setTimeout(() => {
        runDuel();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [agent1Guesses, agent2Guesses, gameState, winner]);

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
              onClick={() => setGameState('idle')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-full font-bold transition-all active:scale-95"
            >
              <RotateCcw size={18} />
              Reset
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 lg:p-12">
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
                <p className="text-[10px] mt-2 opacity-60">If using Ollama, ensure it's running locally on port 11434.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Duel Arena */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-start">
          <WordleBoard 
            agentName={agent1.name}
            guesses={agent1Guesses}
            maxGuesses={MAX_GUESSES}
            isWinner={winner === agent1.name || winner === 'Tie'}
            isGameOver={gameState === 'finished'}
            isThinking={isAgent1Thinking}
          />
          
          <WordleBoard 
            agentName={agent2.name}
            guesses={agent2Guesses}
            maxGuesses={MAX_GUESSES}
            isWinner={winner === agent2.name || winner === 'Tie'}
            isGameOver={gameState === 'finished'}
            isThinking={isAgent2Thinking}
          />
        </div>

        {/* Status Overlay */}
        <AnimatePresence>
          {gameState === 'finished' && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-12 p-8 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-center relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
              <Trophy className="mx-auto mb-4 text-emerald-400" size={48} />
              <h2 className="text-3xl font-bold mb-2">
                {winner === 'Tie' ? "It's a Tie!" : `${winner} Wins!`}
              </h2>
              <p className="text-white/60 mb-6 font-mono uppercase tracking-widest text-xs">
                Target Word was: <span className="text-white font-bold">{targetWord}</span>
              </p>
              <button 
                onClick={initGame}
                className="bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-3 rounded-full font-bold transition-all"
              >
                Play Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Settings / Config */}
        {gameState === 'idle' && (
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
            <AgentSettings 
              config={agent1} 
              onChange={setAgent1} 
              title="Agent 1 Configuration"
            />
            <AgentSettings 
              config={agent2} 
              onChange={setAgent2} 
              title="Agent 2 Configuration"
            />
          </div>
        )}
      </main>
    </div>
  );
}

function AgentSettings({ config, onChange, title }: { config: AgentConfig, onChange: (c: AgentConfig) => void, title: string }) {
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/30 mb-1.5 ml-1">Provider</label>
            <select 
              value={config.provider}
              onChange={(e) => onChange({ ...config, provider: e.target.value as any, model: e.target.value === 'gemini' ? 'gemini-3-flash-preview' : 'llama3' })}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
            >
              <option value="gemini">Gemini (Cloud)</option>
              <option value="ollama">Ollama (Local)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider text-white/30 mb-1.5 ml-1">Model</label>
            <input 
              type="text" 
              value={config.model}
              onChange={(e) => onChange({ ...config, model: e.target.value })}
              className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-emerald-500/50 transition-colors"
              placeholder={config.provider === 'gemini' ? 'gemini-3-flash-preview' : 'llama3'}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
