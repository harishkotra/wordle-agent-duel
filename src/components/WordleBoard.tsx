import React from 'react';
import { GuessResult, LetterState } from '../constants';
import { motion } from 'motion/react';

interface WordleBoardProps {
  guesses: { guess: string; result: GuessResult[] }[];
  maxGuesses: number;
  isWinner: boolean;
  isGameOver: boolean;
  agentName: string;
  isThinking: boolean;
}

const WordleBoard: React.FC<WordleBoardProps> = ({ 
  guesses, 
  maxGuesses, 
  isWinner, 
  isGameOver, 
  agentName,
  isThinking 
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
    </div>
  );
};

export default WordleBoard;
