const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const categoryUrls = [ /* Bowens URLs */ ];

const scrapeBowens = async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  for (const url of categoryUrls) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const materials = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('.product-item-info').forEach(el => {
        const name = el.querySelector('.product-item-link')?.innerText.trim();
        const priceText = el.querySelector('.price')?.innerText.trim();
        const price = priceText ? parseFloat(priceText.replace(/[^0-9.]/g, '')) : null;
        if (name && price) {
          items.push({ name, price });
        }
      });
      return items;
    });

    console.debug(`DEBUG: ${url}`, materials);

    if (materials.length) {
      const dbMaterials = materials.map(item => ({
        supplier: 'Bowens',
        name: item.name,
        category: url.split('/c/')[1].replace(/\/$/, ''),
        price_per_unit: item.price,
        source: url,
        scraped_at: new Date().toISOString()
      }));
      const { error } = await supabase.from('materials').insert(dbMaterials);
      if (error) console.error(`Supabase Insert Error:`, error);
    }
  }

  await browser.close();
};

module.exports = { scrapeBowens };
