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

const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

app.get('/health', (req, res) => res.status(200).send('OK'));

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

const kaiSystemMessage = {
  role: "system",
  content: `You are Kai Marlow — a highly experienced Aussie builder and AI-powered trade assistant...`
};

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

app.post('/quote', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ reply: "No input provided." });

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        { role: "system", content: "You are Kai Marlow, a quoting and estimating expert..." },
        ...messages
      ],
      temperature: 0.6,
      max_tokens: 750
    });
    res.json({ reply: response.data.choices[0].message.content.trim() });
  } catch (error) {
    res.status(500).json({ reply: "Kai couldn't generate your quote." });
  }
});

app.post('/scrape/bunnings', async (req, res) => {
  const { email } = req.body;
  if (email !== 'mark@kaymarconstruction.com') return res.status(403).json({ success: false });

  try {
    await scrapeBunningsTimber();
    res.json({ success: true, message: 'Bunnings scrape complete.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Scrape failed.', error: err.message });
  }
});

app.post('/scrape/bowens', async (req, res) => {
  const { email } = req.body;
  if (email !== 'mark@kaymarconstruction.com') return res.status(403).json({ success: false });

  try {
    await scrapeBowensTimber();
    res.json({ success: true, message: 'Bowens scrape complete.' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Scrape failed.', error: err.message });
  }
});

app.get('/materials', async (req, res) => {
  const { supplier, category, q } = req.query;
  let query = supabase.from('materials').select('*');

  if (supplier) query = query.ilike('supplier', `%${supplier}%`);
  if (category) query = query.ilike('category', `%${category}%`);
  if (q) query = query.or(`name.ilike.%${q}%`);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => {
  res.status(200).send('Webhook received');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
