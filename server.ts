import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
