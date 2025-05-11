const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');
const calculations = require('./calculations'); // Import the new calculations module
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY
}));

app.use(cors());
app.use(express.json());

// General Chat Endpoint
app.post('/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid message format.' });
  }

  const systemPrompt = {
    role: 'system',
    content: 'You are Kai, an experienced builder and carpenter. Provide clear, concise advice on construction, materials, and related coding tools. Be professional and friendly.'
  };

  const fullMessages = messages.some(m => m.role === 'system') ? messages : [systemPrompt, ...messages];

  try {
    const aiResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: fullMessages,
      max_tokens: 1000,
      temperature: 0.7
    });

    const reply = aiResponse.data.choices[0].message.content.trim();
    res.json({ reply });
  } catch (error) {
    console.error('Chat Error:', error);
    res.status(500).json({ reply: 'Kai had an error, please try again shortly.' });
  }
});

// Quote Generator Endpoint (Material List Only, No Pricing)
app.post('/quote', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid message format.' });
  }

  const systemPrompt = {
    role: 'system',
    content: 'You are Kai, a senior estimator and builder. Generate a materials list only. Use dot points. Do not include pricing or supplier recommendations.'
  };

  const fullMessages = messages.some(m => m.role === 'system') ? messages : [systemPrompt, ...messages];

  try {
    const aiResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: fullMessages,
      max_tokens: 1000,
      temperature: 0.6
    });

    const materialList = aiResponse.data.choices[0].message.content.trim();
    res.json({ reply: materialList });
  } catch (error) {
    console.error('Quote Generation Error:', error);
    res.status(500).json({ reply: 'Kai had an error, please try again shortly.' });
  }
});

// New Calculation API Endpoint
app.post('/calculate', (req, res) => {
  const { calculationType, params } = req.body;

  if (!calculationType || !params) {
    return res.status(400).json({ error: 'Missing calculationType or params.' });
  }

  const calcFunction = calculations[calculationType];

  if (typeof calcFunction !== 'function') {
    return res.status(400).json({ error: `Invalid calculation type: ${calculationType}` });
  }

  try {
    const result = calcFunction(...Object.values(params));
    res.json({ result, details: `Calculation ${calculationType} completed.` });
  } catch (error) {
    console.error('Calculation Error:', error);
    res.status(500).json({ error: 'Kai encountered an error while calculating.' });
  }
});

app.listen(PORT, () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
