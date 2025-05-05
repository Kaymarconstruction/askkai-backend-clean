const express = require('express');
const router = express.Router();
const { Configuration, OpenAIApi } = require('openai');

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Updated Quote System Prompt
const quoteSystemPrompt = {
  role: "system",
  content: `You are Kai, a senior estimator and builder with 20+ years experience in Australian construction.

When estimating quotes, always:
- Request project location and code jurisdiction
- Require dimensions and type of structure (deck, pergola, etc.)
- Clarify timber specs (treated pine, composite, etc.)
- Use structural logic for decks:
  Holes > Concrete > Stumps > Bearers > Joists > Decking Boards > Fixings
- For pergolas:
  Holes > Posts > Beams/Facia > Rafters > Battens > Roofing > Flashings > Gutters > Fixings

Follow this output style in markdown bullet points:
• Material: Qty – Lengths or description
• Use clear Australian metric sizes (mm, m)
• Round lengths to nearest 0.6m increment between 1.8m to 6.0m
• Keep under 100 words max

End every quote with:
"This estimate is for materials only. Double-check dimensions and local code for accuracy."
`
};

router.post('/quote', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ reply: "No input provided." });
  }

  const fullMessages = messages.some(m => m.role === 'system')
    ? messages
    : [quoteSystemPrompt, ...messages];

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: fullMessages,
      temperature: 0.6,
      max_tokens: 750
    });

    const reply = response.data.choices[0].message.content.trim();
    res.json({ reply });

  } catch (error) {
    console.error("Quote error:", error.response?.data || error.message);
    res.status(500).json({ reply: "Kai couldn't generate your quote. Try again." });
  }
});
