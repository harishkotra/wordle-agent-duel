import { GuessResult } from "../constants";

export type Provider = 'ollama' | 'openai' | 'gaia' | 'aisa';

export interface AgentConfig {
  id: string;
  name: string;
  provider: Provider;
  model: string;
  baseUrl?: string; // For Gaia custom node URLs
}

export async function getNextGuess(
  config: AgentConfig,
  history: { guess: string; result: GuessResult[], thought?: string }[],
  targetLength: number = 5
): Promise<{ guess: string; thought: string }> {

  // Pre-compute constraints from history so the LLM doesn't have to derive them
  const correctPositions: (string | null)[] = Array(targetLength).fill(null);
  const presentLetters = new Set<string>();
  const absentLetters = new Set<string>();

  for (const h of history) {
    for (let i = 0; i < h.result.length; i++) {
      const r = h.result[i];
      if (r.state === 'correct') {
        correctPositions[i] = r.letter.toUpperCase();
      } else if (r.state === 'present') {
        presentLetters.add(r.letter.toUpperCase());
      } else if (r.state === 'absent') {
        absentLetters.add(r.letter.toUpperCase());
      }
    }
  }

  // Remove letters from absent if they also appear as correct/present (Wordle duplicates edge case)
  for (const letter of correctPositions) {
    if (letter) { absentLetters.delete(letter); presentLetters.delete(letter); }
  }

  const knownPattern = correctPositions.map((l, i) => l ? l : '_').join(' ');
  const requiredLetters = [...presentLetters].join(', ');
  const bannedLetters = [...absentLetters].join(', ');

  let constraintBlock = '';
  if (history.length > 0) {
    constraintBlock = `
    === CURRENT CONSTRAINTS (YOU MUST OBEY THESE) ===
    Known pattern: [ ${knownPattern} ]
    (Letters shown are CONFIRMED in those exact positions. "_" means unknown.)

    ${requiredLetters ? `Letters that MUST appear somewhere in your word: ${requiredLetters}` : ''}
    ${bannedLetters ? `Letters that are BANNED (do NOT use): ${bannedLetters}` : ''}
    ================================================
    `;
  }

  const prompt = `
    You are playing Wordle. The target word has ${targetLength} letters.
    
    Your previous guesses and feedback:
    ${history.length === 0 ? "None yet." : history.map(h => {
    const feedback = h.result.map(r => `${r.letter}: ${r.state}`).join(", ");
    return `Guess: ${h.guess}, Feedback: [${feedback}]`;
  }).join("\n")}
    ${constraintBlock}
    RULES:
    1. Your word MUST have the confirmed letters in their exact positions shown above.
    2. Your word MUST contain all the required "present" letters (but in different positions than where they were marked present).
    3. Your word MUST NOT contain any banned/absent letters.
    4. Your word must be a valid common English 5-letter word.
    
    Based on this feedback, what is your next 5-letter guess? 
    First, provide your detailed reasoning inside <thinking></thinking> tags.
    Then, provide ONLY the 5-letter word in uppercase inside <guess></guess> tags.
  `;

  try {
    let response;

    if (config.provider === 'ollama') {
      response = await fetch("/api/ollama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: "user", content: prompt }]
        })
      });
    } else {
      response = await fetch("/api/chat-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: config.provider,
          model: config.model,
          messages: [{ role: "user", content: prompt }],
          baseUrl: config.baseUrl || undefined,
        })
      });
    }

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    const content = data.message.content || "";

    // Extract thought and guess using regex
    const thoughtMatch = content.match(/<thinking>([\s\S]*?)<\/thinking>/i);
    const guessMatch = content.match(/<guess>([\s\S]*?)<\/guess>/i);

    const thought = thoughtMatch ? thoughtMatch[1].trim() : "No thought process provided.";
    let guess = guessMatch ? guessMatch[1].trim().toUpperCase().slice(0, 5) : content.trim().toUpperCase().slice(0, 5);

    // Fallback if no valid guess
    if (guess.length !== 5 || !/^[A-Z]{5}$/.test(guess)) {
      guess = "ARISE"; // Safe fallback
    }

    return { guess, thought };
  } catch (error) {
    console.error(`${config.provider} Error:`, error);
    throw new Error(`${config.provider} connection failed. Check your configuration.`);
  }
}
