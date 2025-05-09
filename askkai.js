const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const { scrapeBowens } = require('./bowensScraper'); // Only Bowens for now

const app = express();
const PORT = process.env.PORT || 10000;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));

app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/status', (req, res) => {
  res.json({ success: true, message: 'Ask Kai backend is running.' });
});

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

    console.log(`GET /materials | Supplier: ${supplier || 'Any'}, Category: ${category || 'Any'}, Search: ${search || 'None'}`);
    res.json(data);
  } catch (err) {
    console.error('Error in /materials:', err);
    res.status(500).json({ error: err.message });
  }
});

// Chat with Kai
app.post('/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid message format.' });
  }

  const systemPrompt = {
    role: 'system',
    content: `You are Kai, a senior estimator and builder with 20+ years of experience. 
Provide building advice and material estimates. Always clarify job details. 
End every response with: "All quantities are estimates. Confirm with your supplier or engineer."`
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
    console.log('Chat response generated.');
    res.json({ reply });
  } catch (error) {
    console.error('Kai Chat Error:', error);
    res.status(500).json({ reply: 'Kai had an error, please try again shortly.' });
  }
});

// Scrape Bowens Only (Bunnings Removed for Now)
app.post('/scrape/bowens', async (req, res) => {
  const { email } = req.body;
  if (email !== 'mark@kaymarconstruction.com') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  try {
    await scrapeBowens();
    console.log('Bowens scrape complete.');
    res.json({ success: true, message: 'Bowens scrape complete.' });
  } catch (err) {
    console.error('Error during Bowens scrape:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
