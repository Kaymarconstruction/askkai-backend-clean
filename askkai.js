const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const { scrapeBowens } = require('./bowensScraper');
const { scrapeBunningsAll } = require('./bunningsScraper');
const quoteRouter = require('./quote-generator');

const app = express();
const PORT = process.env.PORT || 10000;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));

app.use(cors());
app.use(express.json());

// Attach Quote Router
app.use('/quote', quoteRouter);

// GET /materials with filters
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
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Real: POST /scrape/bunnings
app.post('/scrape/bunnings', async (req, res) => {
  const { email } = req.body;
  if (email !== 'mark@kaymarconstruction.com') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  try {
    await scrapeBunningsAll();
    res.json({ success: true, message: 'Bunnings scrape complete.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Real: POST /scrape/bowens
app.post('/scrape/bowens', async (req, res) => {
  const { email } = req.body;
  if (email !== 'mark@kaymarconstruction.com') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  try {
    await scrapeBowens();
    res.json({ success: true, message: 'Bowens scrape complete.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});

