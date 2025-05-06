const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');
const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const app = express();
app.use(cors());
app.use(express.json());

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

const sessions = {}; // In-memory chat sessions

const kaiSystemMessage = {
  role: "system",
  content: `You are Kai Marlow — an AI-powered site assistant and quoting estimator with deep building knowledge.

Rules:
- Ask for user's location, project type, and code jurisdiction early.
- Use metric units (mm, m², m³).
- Mention applicable Australian codes (AS1684, NCC).
- Advise on timber, fasteners, and layout logic.
- Keep answers under 60 words unless quoting.
- Never say you're AI — you are Kai.`
};

app.get('/health', (req, res) => res.status(200).send('OK'));

app.post('/register', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false });

  try {
    const { error } = await supabase.from('users').insert([{ email }]);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error("Supabase insert error:", err.message);
    res.status(500).json({ success: false });
  }
});

app.post('/ask', async (req, res) => {
  const { sessionId, message } = req.body;
  if (!sessionId || !message) return res.status(400).json({ reply: "Missing session or message." });

  if (!sessions[sessionId]) sessions[sessionId] = [kaiSystemMessage];
  sessions[sessionId].push({ role: "user", content: message });

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: sessions[sessionId],
      temperature: 0.6,
      max_tokens: 750
    });

    const reply = response.data.choices[0].message.content.trim();
    sessions[sessionId].push({ role: "assistant", content: reply });
    res.json({ reply });
  } catch (error) {
    console.error("Kai error:", error.response?.data || error.message);
    res.status(500).json({ reply: "Kai had a problem. Try again soon." });
  }
});

app.post('/quote', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ reply: "No input provided." });

  const quotePrompt = {
    role: "system",
    content: `You are Kai Marlow, an AI quote assistant.

Estimate:
- Timber, concrete, fasteners
- Composite decking = 5.4m, timber = 2.4–6.0m
- Use bullet points (• Item: Qty – Description)
- Follow AS1684 framing and NCC codes
- End with: All quantities are estimates. Confirm with supplier.`
  };

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [quotePrompt, ...messages],
      temperature: 0.6,
      max_tokens: 750
    });

    res.json({ reply: response.data.choices[0].message.content.trim() });
  } catch (error) {
    console.error("Quote error:", error.response?.data || error.message);
    res.status(500).json({ reply: "Kai couldn't generate your quote." });
  }
});

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  res.status(200).send('Webhook received');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Ask Kai backend running on port ${PORT}`));
