const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));

app.use(cors());
app.use(express.json());

// Health Check Endpoint
app.get('/health', async (req, res) => {
  try {
    const aiTest = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Test connection.' }],
      max_tokens: 10
    });

    const { data: supabaseTest, error: supabaseError } = await supabase
      .from('materials')
      .select('name')
      .limit(1);

    if (supabaseError) throw new Error(`Supabase Error: ${supabaseError.message}`);

    res.json({
      status: 'OK',
      aiReply: aiTest.data.choices[0].message.content.trim(),
      supabaseTest
    });
  } catch (err) {
    console.error('Health Check Failed:', err);
    res.status(500).json({ status: 'FAIL', error: err.message });
  }
});

app.post('/quote', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    console.error('Invalid message format received:', req.body);
    return res.status(400).json({ error: 'Invalid message format.' });
  }

  const systemPrompt = {
    role: 'system',
    content: 'You are Kai, a senior estimator and builder. Generate a material list only. Use dot-points. List materials clearly without extra commentary.'
  };

  const fullMessages = messages.some(m => m.role === 'system') ? messages : [systemPrompt, ...messages];

  try {
    console.log('Received messages:', JSON.stringify(fullMessages, null, 2));

    const aiResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: fullMessages,
      max_tokens: 1000,
      temperature: 0.6
    });

    console.log('AI Response:', JSON.stringify(aiResponse.data, null, 2));

    const materialList = aiResponse.data.choices[0].message.content.trim();

    const materials = materialList
      .split('\n')
      .filter(line => line.startsWith('-'))
      .map(line => line.replace('-', '').split(':')[0].trim());

    const prices = {};

    for (const material of materials) {
      console.log(`Querying Supabase for material: ${material}`);

      const { data, error } = await supabase
        .from('materials')
        .select('name, price_per_unit, unit')
        .ilike('name', `%${material}%`)
        .limit(1)
        .single();

      if (error) {
        console.error(`Supabase error for material ${material}:`, error);
      }

      console.log('Supabase Data:', data);

      prices[material] = data ? `${data.price_per_unit} per ${data.unit}` : 'Price Not Found';
    }

    const enrichedQuote = materialList.replace(/^\-\s*(.*?):/gm, (match, p1) => {
      return `- ${p1}: (${prices[p1] || 'Price Not Found'})`;
    });

    const disclaimer = '\n\n*Prices are estimates based on current supplier data. Please confirm with suppliers before purchasing.*';

    res.json({ reply: `${enrichedQuote}${disclaimer}` });
  } catch (error) {
    console.error('Quote Generation Error:', error);
    res.status(500).json({ reply: 'Kai had an error, please try again shortly.' });
  }
});

app.listen(PORT, () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
