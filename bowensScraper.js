const axios = require('axios');
const cheerio = require('cheerio');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const categoryUrls = [
  'https://www.bowens.com.au/c/building-essentials/',
  'https://www.bowens.com.au/c/timber/',
  'https://www.bowens.com.au/c/decking/',
  'https://www.bowens.com.au/c/sheeting/',
  'https://www.bowens.com.au/c/fasteners/',
  'https://www.bowens.com.au/c/cladding/',
  'https://www.bowens.com.au/c/adhesives-sealants-fillers/',
  'https://www.bowens.com.au/c/doors-jambs-frames/',
  'https://www.bowens.com.au/c/door-window-hardware/',
  'https://www.bowens.com.au/c/interior-lining/',
  'https://www.bowens.com.au/c/paints-stains/',
  'https://www.bowens.com.au/c/home-garden-products/',
  'https://www.bowens.com.au/c/roofing/',
  'https://www.bowens.com.au/c/plumbing-bathroom/'
];

const scrapeBowens = async () => {
  for (const url of categoryUrls) {
    try {
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
            name,
            category: url.split('/c/')[1].replace(/\/$/, ''),
            price_per_unit: price,
            scraped_at: new Date().toISOString(),
            source: url
          });
        }
      });

      if (materials.length > 0) {
        const { error } = await supabase.from('materials').insert(materials);
        if (error) throw error;
        console.log(`Inserted ${materials.length} from ${url}`);
      } else {
        console.log(`No materials found at ${url}`);
      }
    } catch (err) {
      console.error(`Error scraping ${url}:`, err.message);
    }
  }
};
