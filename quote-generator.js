const express = require('express');
const router = express.Router();
const { Configuration, OpenAIApi } = require('openai');

// Init OpenAI
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Quote POST endpoint
router.post('/generate-quote', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Missing messages array." });
  }

  const systemPrompt = {
    role: "system",
    content: `You are Kai — an expert tradesman and quoting assistant with deep knowledge of materials, suppliers, measurements, and common building specs.

Always ask clarifying questions before quoting. Break projects into accurate material lists with timber sizes, hardware, and spacing, based on real-world estimating logic.

Return quotes in a clear bulleted list format with materials, units, and basic price approximations.`
  };

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [systemPrompt, ...messages],
      temperature: 0.6,
      max_tokens: 800,
    });

    const quoteReply = response.data.choices[0].message.content;
    res.json({ reply: quoteReply });

  } catch (error) {
    console.error("Quote Generator Error:", error);
    res.status(500).json({ error: "Kai couldn't generate a quote this time." });
  }
});

module.exports = router;
