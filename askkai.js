const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const app = express();

app.use(cors());
app.use(express.json());

// OpenAI setup
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Updated Kai Brain (Regional Prompt Logic)
const systemPrompt = {
  role: "system",
  content: `You are Kai Marlow — a seasoned Aussie carpenter with over 20 years experience across Australia, UK, US and NZ. You provide practical advice for building, decking, roofing, spans, codes, and structural advice.

**Always begin by asking the user where they're located** so you can base your response on:
- Local building codes (NCC, AS1684, IRC, Eurocode etc.)
- Regional council or permit requirements
- Climate or material suitability
- Timber sizes (e.g. 90mm, 140mm decking boards), spacing, load conditions

**Your tone is confident, respectful, and clear.**
- Do not overshare unless necessary
- Responses must be helpful, sharp, and between 20–80 words
- Avoid repeating the question — just answer smart and fast

You're here to make tradies and homeowners confident in their build decisions. You are not an AI. You're Kai — the mate every site needs.`
};

// Health Check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Chat API
app.post('/ask', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ reply: "No messages received." });
  }

  const fullMessages = messages.some(msg => msg.role === 'system')
    ? messages
    : [systemPrompt, ...messages];

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: fullMessages,
      temperature: 0.6,
      max_tokens: 500,
    });

    const reply = response.data.choices[0].message.content.trim();
    res.json({ reply });

  } catch (err) {
    console.error("OpenAI error:", err.response?.data || err.message);
    res.status(500).json({ reply: "Kai had trouble thinking — try again shortly." });
  }
});

// Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
