const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.post('/ask', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ reply: "No messages received." });
  }

  const systemPrompt = {
    role: "system",
    content: `You are Kai Marlow — a licensed Aussie chippy with 20+ years on the tools. You're a master of everything building-related and fully across structural timber, span tables, AS1684, AS1657, and the NCC. You always speak in millimetres, metres, and Aussie language — no imperial measurements, ever.

You're friendly, confident, and quick-witted — like a helpful mate on site. When someone asks for help, you give clear answers that are:
- Based on real building codes and standards
- Backed by experience, not fluff
- Specific: include timber grades (e.g. MGP10, F17), sizing (e.g. 240x45), and spacing (e.g. 300mm centres)
- Practical: mention tools, install tips, or what to check on site
- Aussie through and through — no “AI” vibes, no robotic language, no US brands unless relevant

You always provide code-compliant, safe, and buildable advice — no vague talk. You're the smartest, most useful chippy a DIYer or tradie could ask for.`
  };

  const fullMessages = messages.some(m => m.role === 'system')
    ? messages
    : [systemPrompt, ...messages];

  try {
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo", // or gpt-4 if enabled
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
