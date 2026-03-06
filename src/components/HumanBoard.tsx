import React, { useState } from 'react';
import { GuessResult } from '../constants';
import { motion } from 'motion/react';
import { Send, User } from 'lucide-react';

interface HumanBoardProps {
    guesses: { guess: string; result: GuessResult[] }[];
    maxGuesses: number;
    isWinner: boolean;
    isGameOver: boolean;
    onSubmitGuess: (guess: string) => void;
}

const HumanBoard: React.FC<HumanBoardProps> = ({
    guesses,
    maxGuesses,
    isWinner,
    isGameOver,
    onSubmitGuess,
}) => {
    const [input, setInput] = useState('');
    const rows = Array(maxGuesses).fill(null);

    const canGuess = !isGameOver && guesses.length < maxGuesses;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const word = input.trim().toUpperCase();
        if (word.length === 5 && /^[A-Z]{5}$/.test(word)) {
            onSubmitGuess(word);
            setInput('');
        }
    };

    return (
        <div className="flex flex-col items-center p-4 bg-white/5 rounded-2xl border border-white/10 shadow-xl">
            <div className="flex justify-between w-full mb-4 items-center">
                <h3 className="font-mono text-sm uppercase tracking-widest text-white/50 flex items-center gap-2">
                    <User size={14} className="text-violet-400" />
                    You (Human)
                </h3>
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

            {/* Human Input */}
            <div className="w-full mt-6">
                {canGuess ? (
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value.toUpperCase().slice(0, 5))}
                            maxLength={5}
                            placeholder="TYPE YOUR GUESS"
                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-sm font-mono uppercase tracking-widest text-center focus:outline-none focus:border-violet-500/50 transition-colors placeholder:text-white/20"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={input.length !== 5}
                            className="bg-violet-500 hover:bg-violet-400 disabled:opacity-30 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-bold transition-all active:scale-95"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                ) : (
                    <div className="text-center text-xs font-mono text-white/30 uppercase tracking-widest py-2">
                        {isWinner ? '🎉 You got it!' : 'Game Over'}
                    </div>
                )}
            </div>
        </div>
    );
};

export default HumanBoard;
