const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const { scrapeBowens } = require('./bowensScraper');

const app = express();
const PORT = process.env.PORT || 10000;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));

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

// Chat with Kai (Advanced Logic)
app.post('/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid message format.' });
  }

  const systemPrompt = {
    role: 'system',
    content: `You are Kai, a senior estimator and builder with 20+ years of experience. 
You calculate material takeoffs and provide expert building advice. 

Always ask for:
- Project location
- Precise dimensions
- Product type (decking, plasterboard, bricks, etc.)
- Preferred product sizes or materials
- Do they require just the decking boards or the subfloor as well?

For decking jobs, clarify:
- Is subfloor required?
- Type of stumps (timber or concrete)?
- Concrete hole depth for stumps per code?
- Confirm spacing for joists and bearers per code?
- Deck board direction and spacing?

Use these rules:
- Timber lengths should round up to the next multiple of 0.6m.
- Bearers: One at start, one at finish, and intermediate based on span limits.
- Joists: Same logic, based on span and spacing rules (400mm or 450mm).
- Composite decking often requires 400mm joist spacing.
- Include concrete bags required for post footings.
- Pergola posts depend on roof type and load. Ask pergola height.
- Roofing sheets should allow for at least +200mm length margin.
- Use appropriate flashing, guttering, and downpipes with margins.

End every response with: "All quantities are estimates. Confirm with your supplier or engineer." 
Keep answers under 120 words. Provide the materials list directly in the chat flow.`
  };

  const fullMessages = messages.some(m => m.role === 'system')
    ? messages
    : [systemPrompt, ...messages];

  try {
    const aiResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: fullMessages,
      max_tokens: 1000,
      temperature: 0.6
    });

    const reply = aiResponse.data.choices[0].message.content.trim();
    res.json({ reply });
  } catch (error) {
    console.error('Kai Chat Error:', error.message);
    res.status(500).json({ reply: 'Kai had an error, please try again shortly.' });
  }
});

// Scrape Endpoints
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
