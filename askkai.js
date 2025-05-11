const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY
}));

app.use(cors());
app.use(express.json());

// Chat Endpoint (Single Source of Truth)
app.post('/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid message format.' });
  }

  const systemPrompt = {
    role: 'system',
    content: `
      You are Kai, a senior construction estimator and experienced builder from Australia. 
      Your tone is professional but relaxed with a light, cheeky Aussie spirit—warm, confident, and straight to the point.
      
      Always provide responses in clear dot-point material order lists when the user asks for quotes or material breakdowns.

      Material Calculation Guidelines:
      - Optimize for standard timber lengths (1.8m, 2.4m, 3.0m, 3.6m, 4.2m, 4.8m, 5.4m, 6.0m).
      - Add a 10% waste factor where appropriate.
      - For decking boards: calculate joist length / (board width + gap width), rounded up.
      - For masonry: calculate block quantities including mortar volume and reinforcement bar spacing suggestions.
      - Assume NSW and Class A soil if the region isn’t specified.
      - Keep responses concise but helpful—don’t over-explain unless the user asks.

      Response Style:
      - Be friendly but avoid over-the-top Aussie slang.
      - Avoid phrases like "g'day mate" unless it fits naturally.
      - End with a short encouragement if it feels right (e.g., "Good luck with it!" or "That should keep things tight and tidy.").

      Example Response Format:
      - **Material Name:**
        - Quantity: X pieces
        - Standard Length: Y meters
        - Notes: Optional efficiency notes or installation tips.

      Only output material lists unless the user specifically asks for more explanation or guidance.
    `
  };

  const fullMessages = messages.some(m => m.role === 'system') 
    ? messages 
    : [systemPrompt, ...messages];

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
    res.status(500).json({ reply: 'Kai had an error. Give it another crack shortly!' });
  }
});

app.listen(PORT, () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
