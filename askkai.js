const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { Configuration, OpenAIApi } = require('openai');
const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { scrapeBunningsTimber } = require('./bunningsScraper');

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SUPABASE_KEY  = process.env.SUPABASE_KEY;
const supabase      = createClient(SUPABASE_URL, SUPABASE_KEY);

const app = express();
app.use(cors());
app.use(express.json());

// ----------  OPENAI  ----------
const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai        = new OpenAIApi(configuration);

// ----------  HEALTH ----------
app.get('/health', (_req, res) => res.status(200).send('OK'));

// ----------  REGISTER ----------
app.post('/register', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success:false });

  try {
    const { error } = await supabase.from('users').insert([{ email }]);
    if (error) throw error;
    res.json({ success:true });
  } catch (err) {
    console.error('[Supabase] register error:', err.message);
    res.status(500).json({ success:false });
  }
});

// ----------  KAI SYSTEM MESSAGE ----------
const kaiSystemMessage = {
  role:'system',
  content:`You are Kai Marlow — a highly experienced Aussie builder and AI-powered trade assistant with 20+ years of residential and commercial construction experience.

Your responses must:
- Ask for the user's location, code jurisdiction, and project type if not given
- Use metric units (mm, m, m², m³)
- Reference Australian codes (NCC, AS1684, AS1170)
- Provide 30–50 word guidance on build codes or council advice
- Be clear, practical, and 20–80 words long
- Suggest timber sizes (90x45, 140x45, MGP10, H3, etc.)
- Understand concrete/boards/timber come in standard lengths (2.4 m–6.0 m)
- Ask follow-up questions to get missing info
- Never say you're an AI — you are Kai.`
};

// ----------  CHAT / ASK ----------
app.post('/ask', async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages)) return res.status(400).json({ reply:'Missing messages.' });

  const chat = messages.some(m => m.role === 'system') ? messages : [kaiSystemMessage, ...messages];

  try {
    const { data } = await openai.createChatCompletion({
      model:'gpt-3.5-turbo', messages:chat, temperature:0.7, max_tokens:750
    });
    res.json({ reply: data.choices[0].message.content.trim() });
  } catch (err) {
    console.error('[OpenAI] /ask error:', err.response?.data || err.message);
    res.status(500).json({ reply:'Something went wrong. Try again later.' });
  }
});

// ----------  QUOTE ----------
app.post('/quote', async (req, res) => {
  const { messages } = req.body;
  if (!Array.isArray(messages)) return res.status(400).json({ reply:'No input.' });

  const quotePrompt = {
    role:'system',
    content:`You are Kai Marlow, a quoting and estimating expert for Australian building trades.

Always clarify:
- Location
- Deck type or structure type
- Timber specs
- Board width
- Whether elevation or face boards are needed
- Composite board lengths (use 5.4 m)
- Ask if breaker boards are needed for longer decks

Use bullet list:
• Item: Qty – Description`
  };

  try {
    const { data } = await openai.createChatCompletion({
      model:'gpt-3.5-turbo', messages:[quotePrompt, ...messages],
      temperature:0.6, max_tokens:750
    });
    res.json({ reply: data.choices[0].message.content.trim() });
  } catch (err) {
    console.error('[OpenAI] /quote error:', err.response?.data || err.message);
    res.status(500).json({ reply:'Kai couldn’t generate your quote.' });
  }
});

// ----------  SCRAPER TRIGGER (ADMIN ONLY) ----------
app.post('/scrape/bunnings', async (req, res) => {
  const { email } = req.body;
  if (email !== 'mark@kaymarconstruction.com') return res.status(403).json({ success:false });

  try {
    await scrapeBunningsTimber();
    res.json({ success:true, message:'Scrape complete.' });
  } catch (err) {
    res.status(500).json({ success:false, message:'Scrape failed.', error:err.message });
  }
});

// ----------  GET /materials  ----------
app.get('/materials', async (req, res) => {
  const { supplier, category, search } = req.query;

  let query = supabase.from('materials')
                      .select('supplier,category,name,price_per_unit,unit')
                      .order('supplier', { ascending:true })
                      .order('category', { ascending:true })
                      .order('name',     { ascending:true });

  if (supplier) query = query.eq('supplier', supplier);
  if (category) query = query.eq('category', category);
  if (search)   query = query.ilike('name', `%${search}%`);

  const { data, error } = await query;

  if (error) {
    console.error('[Supabase] /materials error:', error.message);
    return res.status(500).json({ success:false, error:error.message });
  }
  res.json({ success:true, count:data.length, materials:data });
});

// ----------  STRIPE WEBHOOK (placeholder) ----------
app.post('/webhook', express.raw({ type:'application/json' }), (_req, res) => res.status(200).send('Webhook received'));

// ----------  START ----------
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Ask Kai backend running on port ${PORT}`));
