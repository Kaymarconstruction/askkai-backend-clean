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

// Shared System Message
const kaiSystemMessage = {
  role: "system",
  content: `You are Kai Marlow, a highly experienced Aussie builder with 20+ years in construction. Use metric units, reference Australian standards, and always provide clear, practical answers in 20-80 words.`
};

// Chat Endpoint
app.post('/ask', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ reply: "Missing session or message." });
  const fullMessages = messages.some(m => m.role === 'system') ? messages : [kaiSystemMessage, ...messages];
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: fullMessages,
      temperature: 0.7,
      max_tokens: 750
    });
    res.json({ reply: response.data.choices[0].message.content.trim() });
  } catch (err) {
    console.error("Kai error:", err.response?.data || err.message);
    res.status(500).json({ reply: "Something went wrong. Try again later." });
  }
});

// Quote Generator
app.post('/quote', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ reply: "No input provided." });
  const quotePrompt = {
    role: "system",
    content: `You are Kai Marlow, quoting expert for Aussie tradies. Clarify materials, size, spacing, board width, fasteners, elevation. Format in bullet list.`
  };
  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [quotePrompt, ...messages],
      temperature: 0.6,
      max_tokens: 750
    });
    res.json({ reply: response.data.choices[0].message.content.trim() });
  } catch (err) {
    console.error("Quote error:", err.response?.data || err.message);
    res.status(500).json({ reply: "Kai couldn't generate your quote." });
  }
});

// Scrape Bunnings
app.get('/scrape/bunnings', async (req, res) => {
  try {
    await scrapeBunningsTimber();
    res.json({ success: true, source: 'Bunnings' });
  } catch (err) {
    console.error('Bunnings scrape failed:', err.message);
    res.status(500).json({ success: false });
  }
});

// Scrape Bowens
app.get('/scrape/bowens', async (req, res) => {
  try {
    await scrapeBowensTimber();
    res.json({ success: true, source: 'Bowens' });
  } catch (err) {
    console.error('Bowens scrape failed:', err.message);
    res.status(500).json({ success: false });
  }
});

// Stripe webhook placeholder
app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  res.status(200).send('Webhook received');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
