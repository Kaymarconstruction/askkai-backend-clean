const express = require('express');
const cors = require('cors');
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
    res.status(500).json({ success: false, error: err.message });
  }
});

// Kai System Prompt
const kaiSystemMessage = {
  role: "system",
  content: `You are Kai Marlow — a highly experienced Aussie builder and AI-powered trade assistant. Your responses must:
  - Ask for user's location and project info
  - Use metric units (mm, m)
  - Reference Australian codes (NCC, AS1684)
  - Provide 30–50 word code guidance
  - Be helpful, not robotic.`
};

// Ask Kai Endpoint
app.post('/ask', async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages)) return res.status(400).json({ reply: "Missing messages" });
  const fullMessages = messages.some(m => m.role === 'system') ? messages : [kaiSystemMessage, ...messages];

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: fullMessages,
      temperature: 0.7,
      max_tokens: 750,
    });
    res.json({ reply: response.data.choices[0].message.content.trim() });
  } catch (err) {
    res.status(500).json({ reply: "Something went wrong." });
  }
});

// Quote Endpoint
app.post('/quote', async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages)) return res.status(400).json({ reply: "Missing messages" });

  const quotePrompt = {
    role: "system",
    content: `You are Kai Marlow, expert estimator. Clarify:
    - Location
    - Deck type/timber specs
    - Board width
    - Composite lengths (5.4m)
    - Breaker board needs
    Respond with bullet point list: • Qty – Description`
  };

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [quotePrompt, ...messages],
      temperature: 0.6,
      max_tokens: 750,
    });
    res.json({ reply: response.data.choices[0].message.content.trim() });
  } catch (err) {
    res.status(500).json({ reply: "Kai couldn't generate a quote." });
  }
});

// Scraper Triggers (admin)
app.post('/scrape/bunnings', async (req, res) => {
  const { email } = req.body;
  if (email !== 'mark@kaymarconstruction.com') return res.status(403).json({ success: false });
  try {
    await scrapeBunningsTimber();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/scrape/bowens', async (req, res) => {
  const { email } = req.body;
  if (email !== 'mark@kaymarconstruction.com') return res.status(403).json({ success: false });
  try {
    await scrapeBowensTimber();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// View Materials
app.get('/materials', async (req, res) => {
  const { category, supplier } = req.query;
  let query = supabase.from('materials').select('*');
  if (category) query = query.eq('category', category);
  if (supplier) query = query.eq('supplier', supplier);

  const { data, error } = await query.order('price_per_unit', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Stripe Webhook Placeholder
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  res.status(200).send('Webhook received');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
