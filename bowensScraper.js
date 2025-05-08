const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const scrapeBowensTimber = async () => {
  try {
    const url = 'https://www.bowens.com.au/products/building-supplies/timber/';
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const materials = [];

    $('.product-item-info').each((i, el) => {
      const name = $(el).find('.product-item-link').text().trim();
      const priceText = $(el).find('.price').first().text().trim();
      const priceMatch = priceText.match(/\$([\d,.]+)/);
      const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null;

      if (name && price) {
        materials.push({
          supplier: 'Bowens',
          category: 'timber',
          name,
          description: null,
          unit: null,
          unit_price: price,
          url,
          source: 'Bowens',
          scraped_at: new Date().toISOString(),
        });
      }
    });

    if (materials.length > 0) {
      const { error } = await supabase.from('materials').insert(materials);
      if (error) throw error;
      console.log(`Inserted ${materials.length} materials from Bowens.`);
    } else {
      console.log('No materials found.');
    }
  } catch (err) {
    console.error('Bowens scrape failed:', err.message);
  }
