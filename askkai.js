const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.raw({ type: 'application/json' }));

// OpenAI config
const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

// Health check
app.get('/health', (req, res) => res.status(200).send('OK'));

// Ask Kai Chat
app.post('/ask', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ reply: 'No messages received.' });
  }

  const systemPrompt = {
    role: "system",
    content: `You are Kai Marlow — a highly experienced Aussie builder and consultant with over 20 years on the tools.
You speak clearly, never say you're an AI, and always use metric units.
Your advice must:
- Be code-compliant (NCC, AS1684, AS1170)
- Ask for location and detail if missing
- Calculate spans, decking, materials, rafters, stairs, and more
- Offer accurate product names and specs`
  };

  const allMessages = messages.some(m => m.role === 'system') ? messages : [systemPrompt, ...messages];

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: allMessages,
      temperature: 0.6,
      max_tokens: 650
    });

    const reply = response.data.choices[0].message.content.trim();
    res.json({ reply });
  } catch (error) {
    console.error("Ask error:", error.response?.data || error.message);
    res.status(500).json({ reply: "Kai's having a moment — try again soon." });
  }
});

// Quote Generator
app.post('/quote', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ reply: 'No messages received.' });
  }

  const quoteSystem = {
    role: "system",
    content: `You are Kai Marlow — an expert builder generating accurate MATERIAL-ONLY QUOTES.

Rules:
- Ask follow-up if info missing (e.g. width, brick type)
- Round up to nearest product unit
- Use standard metric sizes
- Use real-world sheets, timber, bricks
- NO LABOUR. Only materials
- Keep response clear and useful (40–100 words)

You're quoting like a true Aussie professional.`
  };

  const fullMessages = messages.some(m => m.role === 'system') ? messages : [quoteSystem, ...messages];

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: fullMessages,
      temperature: 0.55,
      max_tokens: 800
    });

    const reply = response.data.choices[0].message.content.trim();
    res.json({ reply });
  } catch (error) {
    console.error("Quote error:", error.response?.data || error.message);
    res.status(500).json({ reply: "Something went wrong. Try again later." });
  }
});

// Stripe Webhook (auto-token crediting)
app.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;
    const metadata = session.metadata || {};
    const pack = metadata.pack || 'unknown';

    console.log(`Purchase: ${email} | Pack: ${pack}`);
    // You would store tokens to DB here
  }

  res.json({ received: true });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
