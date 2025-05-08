const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');
const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { scrapeBunningsTimber } = require('./bunningsScraper');
const { scrapeBowensTimber } = require('./bowensScraper');

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

// Register Route
app.post('/register', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false });
  try {
    const { error } = await supabase.from('users').insert([{ email }]);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});

// Kai Prompt
const kaiSystemMessage = {
  role: "system",
  content: `You are Kai Marlow — expert builder and quoting assistant for Australian construction:
- Use mm, m, m², m³
- Reference NCC, AS1684, AS1170
- Suggest common timber sizes
- Ask about location, deck type, spacing
- Be clear and practical in 30–80 words
- Do not mention being an AI`
};

// /ask endpoint
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
    res.json({ reply: response.data.choices[0].message.content.trim() });
  } catch (error) {
    res.status(500).json({ reply: "Something went wrong. Try again later." });
  }
});

// /quote endpoint
app.post('/quote', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ reply: "No input provided." });
  const quotePrompt = {
    role: "system",
    content: `You are Kai Marlow, quoting expert. Always clarify:
- Location, deck/structure type, spacing, elevation
- Timber specs, board width, face boards, fasteners
- Composite boards use 5.4m standard
Format: \n\n• Item: Qty – Description`
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
    res.status(500).json({ reply: "Kai couldn't generate your quote." });
  }
});

// Scraping endpoints (admin only)
app.post('/scrape/bunnings', async (req, res) => {
  const { email } = req.body;
  if (email !== 'mark@kaymarconstruction.com') return res.status(403).json({ success: false });
  try {
    await scrapeBunningsTimber();
    res.json({ success: true, message: 'Bunnings scrape complete.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/scrape/bowens', async (req, res) => {
  const { email } = req.body;
  if (email !== 'mark@kaymarconstruction.com') return res.status(403).json({ success: false });
  try {
    await scrapeBowensTimber();
    res.json({ success: true, message: 'Bowens scrape complete.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Materials endpoint
app.get('/materials', async (req, res) => {
  const { supplier, category, q } = req.query;
  let query = supabase.from('materials').select('*').order('scraped_at', { ascending: false });
  if (supplier) query = query.ilike('supplier', `%${supplier}%`);
  if (category) query = query.ilike('category', `%${category}%`);
  if (q) query = query.ilike('name', `%${q}%`);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ materials: data });
});

// Stripe webhook
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  res.status(200).send('Webhook received');
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
