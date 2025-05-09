const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const { scrapeBowens } = require('./bowensScraper');
const { scrapeBunningsAll } = require('./bunningsScraper');

const app = express();
const PORT = process.env.PORT || 10000;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));

app.use(cors());
app.use(express.json());

// GET /materials - Fetch Materials with Filters
app.get('/materials', async (req, res) => {
  try {
    const { supplier, category, search } = req.query;
    let query = supabase.from('materials').select('*');

    if (supplier) query = query.eq('supplier', supplier);
    if (category) query = query.eq('category', category);
    if (search) query = query.ilike('name', `%${search}%`);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching materials:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /chat - Chat with Kai (Estimator Logic)
app.post('/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid message format.' });
  }

  const systemPrompt = {
    role: 'system',
    content: `You are Kai, a senior estimator and builder with 20+ years of experience.
Ask for:
- Project location
- Precise dimensions
- Product type (decking, plasterboard, bricks, etc.)
- Preferred product sizes or materials
- Do they require just decking boards or the subfloor as well?

Decking Clarifications:
- Is subfloor required?
- Stump type (timber or concrete)?
- Concrete hole depth for stumps per code?
- Joist and bearer spacing per code?
- Deck board direction and spacing?

Rules:
- Round timber lengths to nearest 0.6m.
- Bearers at start, middle (if required), and end.
- Joists spaced at 400mm or 450mm centers.
- Composite decking prefers 400mm spacing.
- Include concrete bag requirements.
- Pergola post size and footing based on roof type and load.
- Roofing sheets require +200mm margin.
- Use correct flashing, guttering, and downpipes.

End every response with: "All quantities are estimates. Confirm with your supplier or engineer." 
Limit replies to under 120 words. Provide materials list directly.`
  };

  const fullMessages = messages.some(m => m.role === 'system') ? messages : [systemPrompt, ...messages];

  try {
    const aiResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: fullMessages,
      max_tokens: 1000,
      temperature: 0.6,
    });

    const reply = aiResponse.data.choices[0].message.content.trim();
    res.json({ reply });
  } catch (error) {
    console.error('Kai Chat Error:', error.message);
    res.status(500).json({ reply: 'Kai had an error, please try again shortly.' });
  }
});

// POST /scrape/bunnings - Start Bunnings Scraper
app.post('/scrape/bunnings', async (req, res) => {
  const { email } = req.body;
  if (email !== 'mark@kaymarconstruction.com') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  try {
    await scrapeBunningsAll();
    res.json({ success: true, message: 'Bunnings scrape complete.' });
  } catch (err) {
    console.error('Bunnings Scrape Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /scrape/bowens - Start Bowens Scraper
app.post('/scrape/bowens', async (req, res) => {
  const { email } = req.body;
  if (email !== 'mark@kaymarconstruction.com') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  try {
    await scrapeBowens();
    res.json({ success: true, message: 'Bowens scrape complete.' });
  } catch (err) {
    console.error('Bowens Scrape Error:', err.message);
    res.status(500).json({ success: false, message: err.message });
  }
});
console.log('OPENAI_API_KEY Loaded:', process.env.OPENAI_API_KEY ? 'Yes' : 'No');

app.listen(PORT, () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
