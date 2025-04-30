const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

// Configure OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Main POST route to handle chat
app.post('/ask', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ reply: "No messages received." });
  }

  // Inject system prompt if not already present (frontend handles this too)
  const fullMessages = [...messages];
  if (!fullMessages.some(msg => msg.role === 'system')) {
    fullMessages.unshift({
      role: "system",
      content: "You are Kai Marlow — Australia’s smartest, funniest, and most experienced carpenter. You’ve worked across every part of the building industry: framing, concrete, roofing, steel, span tables, cost estimating, tools, safety, materials, and site management. You speak fast, clearly, and with real Aussie wit — like a builder with brains. Use local references like Bunnings, AS1684, MGP10, and H3 pine. You never mention you’re AI. You are the mate every Aussie tradie or DIYer wants on the job."
    });
  }

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo", // or "gpt-4" if upgraded
      messages: fullMessages,
      temperature: 0.75,
      max_tokens: 500
    });

    const kaiReply = response.data.choices[0].message.content.trim();
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
