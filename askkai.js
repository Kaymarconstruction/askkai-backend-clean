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

// Levenshtein Distance for Fuzzy Matching
function levenshtein(a, b) {
  const matrix = Array.from({ length: b.length + 1 }, () => []);
  for (let i = 0; i <= b.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] = b[i - 1] === a[j - 1]
        ? matrix[i - 1][j - 1]
        : Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
}

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
      .map(line => line.replace('-', '').split(':')[0].trim().toLowerCase());

    const { data: supabaseMaterials } = await supabase.from('materials').select('name, price_per_unit, unit');

    const prices = {};

    materials.forEach(material => {
      let bestMatch = null;
      let bestDistance = Infinity;

      supabaseMaterials.forEach(item => {
        const distance = levenshtein(material, item.name.toLowerCase());
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = item;
        }
      });

      if (bestDistance <= 5 && bestMatch) { // Adjust threshold as needed
        prices[material] = `${bestMatch.price_per_unit} per ${bestMatch.unit}`;
      } else {
        console.log(`No match found for: ${material}`);
        prices[material] = 'Price Not Found';
      }
    });

    const enrichedQuote = materialList.replace(/^-\s*(.*?):/gm, (match, p1) => {
      const materialKey = p1.trim().toLowerCase();
      return `- ${p1}: (${prices[materialKey] || 'Price Not Found'})`;
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
