const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

// Load Materials Data Directly into Memory
const materialsData = JSON.parse(fs.readFileSync('./materials_data.json', 'utf-8')).materials;

const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));

app.use(cors());
app.use(express.json());

app.post('/quote', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid message format.' });
  }

  const systemPrompt = {
    role: 'system',
    content: 'You are Kai, a senior estimator and builder. Generate a material list only. Use dot-points.'
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

    const materials = materialList
      .split('\n')
      .filter(line => line.startsWith('-'))
      .map(line => line.replace('-', '').split(':')[0].trim());

    const prices = {};

    for (const material of materials) {
      const cleanedMaterial = material.replace(/.*?/g, '').trim().toLowerCase();

      const found = materialsData.find(item => item.name.toLowerCase().includes(cleanedMaterial));

      if (found) {
        prices[material] = `${found.price_per_unit} per ${found.unit}`;
      } else {
        prices[material] = 'Price Not Found';
      }
    }

    const enrichedQuote = materialList.replace(/^-\s*(.*?):/gm, (match, p1) => {
      return `- ${p1}: (${prices[p1] || 'Price Not Found'})`;
    });

    res.json({ reply: enrichedQuote });
  } catch (error) {
    console.error('Quote Generation Error:', error);
    res.status(500).json({ reply: 'Kai had an error, please try again shortly.' });
  }
});

app.listen(PORT, () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
