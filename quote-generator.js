const express = require('express');
const router = express.Router();
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Quote system prompt
const quoteSystemPrompt = {
  role: "system",
  content: `You are Kai, a senior estimator and builder with 20+ years experience. You calculate material takeoffs and quotes for all building trades.

Always ask for:
- Project location
- Precise dimensions
- Product type (decking, plasterboard, bricks, etc.)
- Preferred product sizes or materials

For timber, always round lengths up to the next multiple of 0.6m, from 1.8m up to 6.0m. 
Output:
- Material name
- Quantity
- Lengths
- Estimated cost
- Total lineal or square metres

End every response with: "All quantities are estimates. Confirm with your supplier or engineer." Keep it under 100 words.`
};

router.post('/quote', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: "Invalid message format" });
  }

  const fullMessages = messages.some(m => m.role === "system")
    ? messages
    : [quoteSystemPrompt, ...messages];

  try {
    const aiResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: fullMessages,
      max_tokens: 650,
      temperature: 0.6
    });

    const reply = aiResponse.data.choices[0].message.content.trim();
    res.json({ reply });

  } catch (error) {
    console.error("Quote error:", error.message);
    res.status(500).json({ reply: "Kai had trouble estimating that. Try again shortly." });
  }
});

module.exports = router;
