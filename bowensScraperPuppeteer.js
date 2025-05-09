const puppeteer = require('puppeteer');
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
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  for (const url of categoryUrls) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      const materials = await page.evaluate(() => {
        const items = [];
        const productElements = document.querySelectorAll('.product-item-info');

        productElements.forEach(el => {
          const name = el.querySelector('.product-item-link')?.textContent.trim();
          const priceText = el.querySelector('.price')?.textContent.trim();
          const priceMatch = priceText ? priceText.match(/\$([\d,.]+)/) : null;
          const price = priceMatch ? parseFloat(priceMatch[1].replace(/,/g, '')) : null;

          if (name && price) {
            items.push({
              supplier: 'Bowens',
              name,
              category: url.split('/c/')[1].replace(/\/$/, ''),
              price_per_unit: price,
              scraped_at: new Date().toISOString(),
              source: url
            });
          }
        });
        return items;
      });

      console.debug(`DEBUG: Fetched materials from ${url}:`, materials);

      if (materials.length > 0) {
        const { error } = await supabase.from('materials').insert(materials);
        if (error) {
          console.error(`Supabase Insert Error for ${url}:`, error);
          throw error;
        }
        console.log(`Inserted ${materials.length} materials from Bowens: ${url}`);
      } else {
        console.warn(`No materials found at ${url}`);
      }
    } catch (err) {
      console.error(`Error scraping ${url}:`, err.message);
    }
  }

  await browser.close();
};

scrapeBowens();
