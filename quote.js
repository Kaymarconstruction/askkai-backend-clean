const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 11000;

// Environment Variables Check
['OPENAI_API_KEY'].forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing environment variable: ${key}`);
    process.exit(1);
  }
});

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY
}));

app.use(cors());
app.use(express.json());

// Quote Endpoint
app.post('/generate-quote', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No project details provided.' });
  }

  try {
    const systemPrompt = {
      role: 'system',
      content: `
You are Kai Marlow, a master estimator and material take-off expert from Frankston, VIC, Australia, working for Kaymar Construction.

- Provide only a clean, accurate materials list based on the input. 
- Format output using dot-points. No introduction, no comments, no explanations. 
- Example Output:
  - 10x Treated Pine Posts 90x90 H4 (3.0m lengths)
  - 24x MGP10 Beams 190x45 (4.2m lengths)
  - 50x Colorbond Roofing Sheets (Custom Orb, Surfmist, 2.4m lengths)
- Always specify quantities, sizes, and lengths.
- Use VIC defaults unless otherwise specified.
- Do not mention prices or suppliers unless asked directly.
- Do NOT include phrases like "Here’s what you need" or "Materials:".
- No calculations displayed; only final quantities and specifications.
- Keep responses under 200 words, just material dot-points.
      `
    };

    const fullMessages = messages.some(m => m.role === 'system')
      ? messages
      : [systemPrompt, ...messages];

    const aiResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: fullMessages,
      max_tokens: 1000,
      temperature: 0.3
    });

    const reply = aiResponse?.data?.choices?.[0]?.message?.content?.trim() || 
      '- Unable to generate quote. Try again.';

    res.json({ reply });

  } catch (error) {
    console.error('Quote Generation Error:', error);
    res.status(500).json({ reply: '- Kai ran into an error. Please try again.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Quote Generator API running on port ${PORT}`);
});
