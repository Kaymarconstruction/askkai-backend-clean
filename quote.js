const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 11000;

// Validate Required Environment Variables
['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing environment variable: ${key}`);
    process.exit(1);
  }
});

// Initialize API Clients
const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

app.use(cors());
app.use(express.json());

// Fetch Materials by Category
app.get('/materials', async (req, res) => {
  try {
    const { category } = req.query;
    let query = supabase.from('materials').select('material_name, size').order('material_name');

    if (category) query = query.eq('category', category);

    const { data, error } = await query;

    if (error) throw error;
    res.json({ materials: data });
  } catch (error) {
    console.error('Error fetching materials:', error);
    res.status(500).json({ error: 'Failed to fetch materials.' });
  }
});

// Generate Quote
app.post('/generate-quote', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No project details provided.' });
  }

  try {
    const systemPrompt = {
      role: 'system',
      content: `
You are Kai Marlow, a master estimator and material take-off expert from Frankston, VIC, Australia.

- Output ONLY a clean, dot-point materials list.
- Example:
  - 10x Treated Pine Posts 90x90 H4 (3.0m lengths)
  - 24x MGP10 Beams 190x45 (4.2m lengths)
  - 50x Colorbond Roofing Sheets (Custom Orb, Surfmist, 2.4m lengths)

- Specify clear quantities, sizes, and lengths.
- Assume VIC standards unless region specified.
- Do not include prices or suppliers unless requested.
- Keep responses under 200 words.
      `
    };

    const finalMessages = messages.some(m => m.role === 'system')
      ? messages
      : [systemPrompt, ...messages];

    const aiResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: finalMessages,
      max_tokens: 1000,
      temperature: 0.3,
    });

    const reply = aiResponse?.data?.choices?.[0]?.message?.content?.trim() 
      || "- Unable to generate quote. Try again.";

    res.json({ reply });
  } catch (error) {
    console.error('Quote Generation Error:', error);
    res.status(500).json({ reply: '- Kai hit a snag. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Quote Generator API running on port ${PORT}`);
});
