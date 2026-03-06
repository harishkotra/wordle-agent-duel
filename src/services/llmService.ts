import { GoogleGenAI, Type } from "@google/genai";
import { GuessResult } from "./constants";

export type Provider = 'gemini' | 'ollama';

export interface AgentConfig {
  id: string;
  name: string;
  provider: Provider;
  model: string;
}

export async function getNextGuess(
  config: AgentConfig,
  history: { guess: string; result: GuessResult[] }[],
  targetLength: number = 5
): Promise<string> {
  const prompt = `
    You are playing Wordle. The target word has ${targetLength} letters.
    
    Your previous guesses and feedback:
    ${history.length === 0 ? "None yet." : history.map(h => {
      const feedback = h.result.map(r => `${r.letter}: ${r.state}`).join(", ");
      return `Guess: ${h.guess}, Feedback: [${feedback}]`;
    }).join("\n")}
    
    Rules:
    - 'correct': Letter is in the right spot.
    - 'present': Letter is in the word but wrong spot.
    - 'absent': Letter is not in the word.
    
    Based on this feedback, what is your next 5-letter guess? 
    Respond with ONLY the 5-letter word in uppercase. Do not explain.
  `;

  if (config.provider === 'gemini') {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
    const response = await ai.models.generateContent({
      model: config.model || "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.7,
      }
    });
    return response.text?.trim().toUpperCase().slice(0, 5) || "ARISE";
  } else {
    // Ollama via our proxy
    try {
      const response = await fetch("/api/ollama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: config.model,
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.message.content.trim().toUpperCase().slice(0, 5) || "ARISE";
    } catch (error) {
      console.error("Ollama Error:", error);
      // Fallback to a simple heuristic or just error out
      throw new Error("Ollama connection failed. Is it running locally?");
    }
  }
}
