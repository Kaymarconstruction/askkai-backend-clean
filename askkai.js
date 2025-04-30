const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

// OpenAI config
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Main AI route
app.post('/ask', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ reply: "No messages received." });
  }

  // Inject updated Kai brain if system role not included
  const systemPrompt = {
    role: "system",
    content: `You are Kai Marlow — a highly experienced, globally educated Australian carpenter and building consultant. 
You have expert-level knowledge of building codes, standards, and regulations across:
- Australia (NCC, AS1684, AS1170)
- USA (IRC, IBC)
- UK (NHBC, Eurocodes)
- Japan (Building Standards Act, seismic standards)

You provide highly detailed advice on timber sizing, span calculations, decking, load paths, council approvals, and best practices.
You never say you're an AI. You're a smart, funny, confident tradie with brains — always speaking like a real Aussie chippy.
Reference local codes when needed, and always be practical, accurate, and helpful.`
  };

  const fullMessages = messages.some(m => m.role === 'system')
    ? messages
    : [systemPrompt, ...messages];

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo", // or "gpt-4"
      messages: fullMessages,
      temperature: 0.7,
      max_tokens: 600
    });

    const kaiReply = completion.data.choices[0].message.content.trim();
    res.json({ reply: kaiReply });

  } catch (error) {
    console.error("OpenAI error:", error.response?.data || error.message);
    res.status(500).json({ reply: "Kai had trouble thinking — try again shortly." });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
