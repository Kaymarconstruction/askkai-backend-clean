const express = require('express');
const cors = require('cors');
const cheerio = require('cheerio');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(cors());
app.use(express.json());

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

// DUMMY: /scrape/bunnings
app.get('/scrape/bunnings', async (req, res) => {
  try {
    const materials = [
      {
        supplier: 'Bunnings',
        category: 'Timber',
        name: 'H3 Treated Pine 90x45mm',
        description: 'Outdoor use timber',
        unit: 'm',
        unit_price: 6.75,
        url: 'https://bunnings.com.au/example',
        scraped_at: new Date().toISOString(),
        source: 'Bunnings'
      }
    ];
    const { error } = await supabase.from('materials').insert(materials);
    if (error) throw error;
    res.json({ message: 'Bunnings data inserted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DUMMY: /scrape/bowens
app.get('/scrape/bowens', async (req, res) => {
  try {
    const materials = [
      {
        supplier: 'Bowens',
        category: 'Decking',
        name: 'Merbau 140x19mm',
        description: 'Durable decking timber',
        unit: 'lm',
        unit_price: 9.9,
        url: 'https://bowens.com.au/example',
        scraped_at: new Date().toISOString(),
        source: 'Bowens'
      }
    ];
    const { error } = await supabase.from('materials').insert(materials);
    if (error) throw error;
    res.json({ message: 'Bowens data inserted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
