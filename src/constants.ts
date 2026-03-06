export const WORD_LIST = [
  "APPLE", "BEACH", "BRAIN", "BREAD", "BRUSH", "CHAIR", "CHEST", "CHORD",
  "CLICK", "CLOCK", "CLOUD", "DANCE", "DIARY", "DRINK", "DRIVE", "EARTH",
  "FEAST", "FIELD", "FRUIT", "GLASS", "GRAPE", "GREEN", "GHOST", "HEART",
  "HOUSE", "JUICE", "LIGHT", "LEMON", "MELON", "MONEY", "MUSIC", "NIGHT",
  "OCEAN", "PARTY", "PIANO", "PILOT", "PLANE", "PHONE", "PIZZA", "PLANT",
  "RADIO", "RIVER", "ROBOT", "SHIRT", "SHOES", "SMILE", "SNAKE", "SPACE",
  "SPOON", "STORM", "TABLE", "TIGER", "TOAST", "TOUCH", "TRAIN", "TRUCK",
  "VOICE", "WATER", "WATCH", "WHALE", "WORLD", "WRITE", "YOUTH", "ZEBRA"
];

export type LetterState = 'correct' | 'present' | 'absent' | 'empty';

export interface GuessResult {
  letter: string;
  state: LetterState;
}

export function checkGuess(guess: string, target: string): GuessResult[] {
  const result: GuessResult[] = Array(5).fill(null).map((_, i) => ({
    letter: guess[i],
    state: 'absent'
  }));

  const targetLetters = target.split('');
  const guessLetters = guess.split('');

  // First pass: find correct positions
  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] === targetLetters[i]) {
      result[i].state = 'correct';
      targetLetters[i] = '#'; // Mark as used
      guessLetters[i] = '$'; // Mark as processed
    }
  }

  // Second pass: find present but wrong position
  for (let i = 0; i < 5; i++) {
    if (guessLetters[i] === '$') continue;
    
    const index = targetLetters.indexOf(guessLetters[i]);
    if (index !== -1) {
      result[i].state = 'present';
      targetLetters[index] = '#'; // Mark as used
    }
  }

  return result;
}
