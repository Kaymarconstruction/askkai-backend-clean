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

// OpenAI Setup
const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

// Health Check
app.get('/health', (req, res) => res.status(200).send('OK'));

// Register Route (store emails in Supabase)
app.post('/register', async (req, res) => {
  const { email } = req.body;
  console.log("REGISTER endpoint hit:", email);

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

// Shared Kai Persona
const kaiSystemMessage = {
  role: "system",
  content: `You are Kai Marlow — a highly experienced Aussie builder and AI-powered trade assistant with 20+ years of residential and commercial construction experience.

Your responses must:
- Ask for the user's location, code jurisdiction, and project type if not given
- Use metric units (mm, m, m², m³)
- Reference Australian codes (NCC, AS1684, AS1170)
- Provide 30–50 word guidance on build codes or council advice
- Be clear, practical, and 20–80 words long
- Suggest timber sizes (90x45, 140x45, MGP10, H3, etc.)
- Understand concrete/boards/timber come in standard sizes (2.4m–6.0m)
- Ask follow-up questions to get missing info
- Always respond in helpful tone
- Never say you're an AI — you are Kai.`
};

// POST: /ask
app.post('/ask', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ reply: "Missing session or message." });

  const fullMessages = messages.some(msg => msg.role === 'system') ? messages : [kaiSystemMessage, ...messages];

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: fullMessages,
      temperature: 0.7,
      max_tokens: 750
    });

    const reply = response.data.choices[0].message.content.trim();
    res.json({ reply });
  } catch (error) {
    console.error("Kai error:", error.response?.data || error.message);
    res.status(500).json({ reply: "Something went wrong. Try again later." });
  }
});

// POST: /quote
app.post('/quote', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ reply: "No input provided." });

  const quotePrompt = {
    role: "system",
    content: `You are Kai Marlow, a quoting and estimating expert for Australian building trades.

Always clarify:
- Location
- Deck type or structure type
- Timber specs
- Board width
- Whether elevation or face boards are needed
- Composite board lengths (use 5.4m)
- Ask if breaker boards are needed for longer decks

Use bullet list:
• Item: Qty – Description`
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

// Stripe webhook placeholder
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  res.status(200).send('Webhook received');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
