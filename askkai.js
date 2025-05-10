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

// Root Health Check
app.get('/', (req, res) => {
  res.json({ message: 'Ask Kai Backend is live!' });
});

// Health Diagnostic
app.get('/health', (req, res) => {
  res.json({
    puppeteerPath: process.env.PUPPETEER_EXECUTABLE_PATH || 'Not Set',
    envLoaded: !!process.env.SUPABASE_URL,
    timestamp: new Date().toISOString()
  });
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
    res.json(data);
  } catch (err) {
    console.error('Materials Error:', err);
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
    content: 'You are Kai, a senior estimator and builder with 20+ years of experience. You calculate material takeoffs and provide expert building advice.'
  };

  const fullMessages = messages.some(m => m.role === 'system') ? messages : [systemPrompt, ...messages];

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

// Quote Generator
app.post('/quote', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid message format.' });
  }

  const systemPrompt = {
    role: 'system',
    content: `You are Kai, a senior estimator and builder. 
    Always ask for detailed project info, estimate all parts of structure: 
    stumps, bearers, joists, decking, fasteners. Output in markdown dot-point format.`
  };

  const fullMessages = messages.some(m => m.role === 'system') ? messages : [systemPrompt, ...messages];

  try {
    const aiResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: fullMessages,
      max_tokens: 1500,
      temperature: 0.5
    });

    const reply = aiResponse.data.choices[0].message.content.trim();
    res.json({ reply });
  } catch (error) {
    console.error('Quote Generation Error:', error.message);
    res.status(500).json({ reply: 'Kai couldn’t generate a quote. Please try again.' });
  }
});

// Scrape Bowens Materials
app.post('/scrape/bowens', async (req, res) => {
  const { email } = req.body;
  if (email !== 'mark@kaymarconstruction.com') {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }

  console.log('Starting Bowens Scrape...');
  try {
    await scrapeBowens();
    console.log('Bowens Scrape Completed.');
    res.json({ success: true, message: 'Bowens scrape complete.' });
  } catch (err) {
    console.error('Scrape Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// 404 Fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.listen(PORT, () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
