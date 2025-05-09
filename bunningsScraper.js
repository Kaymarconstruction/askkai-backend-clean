const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const categories = [
  { category: 'timber', url: 'https://www.bunnings.com.au/products/building-hardware/timber/' },
  { category: 'insulation', url: 'https://www.bunnings.com.au/products/building-hardware/insulation/' },
  { category: 'ladders', url: 'https://www.bunnings.com.au/products/building-hardware/ladders/' },
  { category: 'concrete', url: 'https://www.bunnings.com.au/products/building-hardware/concrete-cementing/' },
  { category: 'doors', url: 'https://www.bunnings.com.au/products/building-hardware/doors/' },
  { category: 'door hardware', url: 'https://www.bunnings.com.au/products/building-hardware/door-hardware/' },
  { category: 'deck', url: 'https://www.bunnings.com.au/products/building-hardware/deck/' },
  { category: 'windows', url: 'https://www.bunnings.com.au/products/building-hardware/windows/' },
  { category: 'fencing', url: 'https://www.bunnings.com.au/products/building-hardware/fencing-gates/' }
];

const scrapeBunningsCategory = async (category, url) => {
  try {
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
          name,
          category,
          price_per_unit: parseFloat(price),
          source: url,
          scraped_at: new Date().toISOString()
        });
      }
    });

    if (materials.length > 0) {
      const { error } = await supabase.from('materials').insert(materials);
      if (error) throw error;
      console.log(`Inserted ${materials.length} materials from Bunnings: ${category}`);
    } else {
      console.log(`No materials found for ${category}`);
    }
  } catch (err) {
    console.error(`Bunnings scrape failed for ${category}:`, err.message);
  }
};

const scrapeBunningsAll = async () => {
  for (const { category, url } of categories) {
    await scrapeBunningsCategory(category, url);
  }
};
module.exports = { scrapeBunningsAll };
