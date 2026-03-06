import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Provider config: maps provider name to base URL and env var for API key
const PROVIDER_CONFIG: Record<string, { url: string; envKey: string }> = {
  openai: { url: "https://api.openai.com/v1/chat/completions", envKey: "OPENAI_API_KEY" },
  gaia: { url: "https://llama3b.gaia.domains/v1/chat/completions", envKey: "GAIA_API_KEY" },
  aisa: { url: "https://api.aisa.one/v1/chat/completions", envKey: "AISA_API_KEY" },
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy for Ollama to avoid CORS issues in the browser
  app.post("/api/ollama", async (req, res) => {
    const { model, messages, stream } = req.body;
    try {
      const response = await fetch("http://localhost:11434/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, stream: false }),
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.statusText}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Ollama Proxy Error:", error.message);
      res.status(500).json({ error: "Could not connect to local Ollama. Ensure it is running on port 11434." });
    }
  });

  app.get("/api/ollama/tags", async (req, res) => {
    try {
      const response = await fetch("http://localhost:11434/api/tags");
      if (!response.ok) throw new Error(`Ollama error: ${response.statusText}`);
      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Ollama Tags Proxy Error:", error.message);
      res.status(500).json({ error: "Could not load models from local Ollama." });
    }
  });

  // Generic proxy for OpenAI-compatible cloud providers (OpenAI, Gaia, AIsa.one)
  app.post("/api/chat-proxy", async (req, res) => {
    const { provider, model, messages, baseUrl } = req.body;
    const config = PROVIDER_CONFIG[provider];

    if (!config) {
      return res.status(400).json({ error: `Unknown provider: ${provider}` });
    }

    const apiKey = process.env[config.envKey];
    if (!apiKey) {
      return res.status(400).json({ error: `API key not configured. Set ${config.envKey} in your .env file.` });
    }

    // For Gaia, allow custom base URL (different node IDs)
    const url = baseUrl || config.url;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ model, messages, stream: false }),
      });

      if (!response.ok) {
        const errBody = await response.text();
        throw new Error(`${provider} API error (${response.status}): ${errBody}`);
      }

      const data = await response.json();
      // Normalize to same shape as Ollama: { message: { content: "..." } }
      const content = data.choices?.[0]?.message?.content || "";
      res.json({ message: { content } });
    } catch (error: any) {
      console.error(`${provider} Proxy Error:`, error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
