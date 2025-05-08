// bunningsScraper.js
const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const scrapeBunningsTimber = async () => {
  try {
    const url = 'https://www.bunnings.com.au/our-range/building-hardware/timber';
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const materials = [];

    $('.product-title').each((i, el) => {
      const name = $(el).text().trim();
      const priceEl = $(el).closest('.product-container').find('.price');
      const price = priceEl.text().replace(/[^\d.]/g, '');

      if (name && price) {
        materials.push({
          supplier: 'Bunnings',
          category: 'timber',
          name,
          description: null,
          unit: null,
          unit_price: parseFloat(price),
          url,
          source: 'Bunnings',
          scraped_at: new Date().toISOString(),
        });
      }
    });

    if (materials.length > 0) {
      const { error } = await supabase.from('materials').insert(materials);
      if (error) throw error;
      console.log(`Inserted ${materials.length} materials from Bunnings.`);
    } else {
      console.log('No materials found.');
    }
  } catch (err) {
    console.error('Bunnings scrape failed:', err.message);
  }
};

module.exports = { scrapeBunningsTimber };
