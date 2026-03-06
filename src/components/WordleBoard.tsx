import React from 'react';
import { GuessResult, LetterState } from '../constants';
import { motion } from 'motion/react';

interface WordleBoardProps {
  guesses: { guess: string; result: GuessResult[], thought?: string }[];
  maxGuesses: number;
  isWinner: boolean;
  isGameOver: boolean;
  agentName: string;
  isThinking: boolean;
  retries?: number;
}

const WordleBoard: React.FC<WordleBoardProps> = ({
  guesses,
  maxGuesses,
  isWinner,
  isGameOver,
  agentName,
  isThinking,
  retries = 0
}) => {
  const rows = Array(maxGuesses).fill(null);

  return (
    <div className="flex flex-col items-center p-4 bg-white/5 rounded-2xl border border-white/10 shadow-xl">
      <div className="flex justify-between w-full mb-4 items-center">
        <h3 className="font-mono text-sm uppercase tracking-widest text-white/50">{agentName}</h3>
        {isThinking && (
          <motion.div
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-[10px] font-mono text-emerald-400 uppercase"
          >
            Thinking...
          </motion.div>
        )}
        {isWinner && <span className="text-xs font-bold text-emerald-400 uppercase tracking-tighter">Winner</span>}
        {isGameOver && !isWinner && <span className="text-xs font-bold text-red-400 uppercase tracking-tighter">Failed</span>}
      </div>

      <div className="grid grid-rows-6 gap-2">
        {rows.map((_, rowIndex) => {
          const guessData = guesses[rowIndex];
          return (
            <div key={rowIndex} className="grid grid-cols-5 gap-2">
              {Array(5).fill(null).map((_, colIndex) => {
                const letterData = guessData?.result[colIndex];
                const letter = letterData?.letter || '';
                const state = letterData?.state || 'empty';

                let bgClass = 'bg-transparent border-white/20';
                if (state === 'correct') bgClass = 'bg-emerald-500 border-emerald-500 text-white';
                if (state === 'present') bgClass = 'bg-amber-500 border-amber-500 text-white';
                if (state === 'absent') bgClass = 'bg-zinc-700 border-zinc-700 text-white';

                return (
                  <motion.div
                    key={colIndex}
                    initial={false}
                    animate={state !== 'empty' ? { rotateX: [0, 90, 0] } : {}}
                    transition={{ delay: colIndex * 0.1, duration: 0.5 }}
                    className={`w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-2xl font-bold border-2 rounded-lg uppercase transition-colors ${bgClass}`}
                  >
                    {letter}
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Retries and Thoughts UI */}
      <div className="w-full mt-6 space-y-3">
        {retries > 0 && (
          <div className="flex justify-between items-center px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
            <span className="text-xs font-mono uppercase text-red-400">Total Retries / Errors</span>
            <span className="text-sm font-bold text-red-400">{retries}</span>
          </div>
        )}

        {guesses.length > 0 && guesses.some(g => g.thought) && (
          <div className="w-full p-4 bg-black/40 border border-white/10 rounded-xl overflow-hidden shadow-inner flex flex-col gap-4">
            <h4 className="text-[10px] font-mono uppercase tracking-widest text-white/40 border-b border-white/5 pb-2">Sequential Thought Process</h4>
            <div className="flex flex-col gap-4 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {guesses.map((g, idx) => g.thought && (
                <div key={idx} className="border-l-2 border-emerald-500/30 pl-3">
                  <span className="text-[10px] font-bold text-emerald-400/80 mb-1 block uppercase">Guess {idx + 1}</span>
                  <div className="text-xs text-white/70 leading-relaxed font-mono break-words whitespace-pre-wrap">
                    {g.thought}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WordleBoard;
