const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.raw({ type: 'application/json' }));

// OpenAI configuration
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Health check route
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// === Main Chat Endpoint (/ask) ===
app.post('/ask', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ reply: "No messages received." });
  }

  const systemPrompt = {
    role: "system",
    content: `You are Kai Marlow — a friendly, straight-talking Aussie tradie with 20+ years of experience. You're an expert in carpentry, construction, cost estimates, design, span tables, structural codes, and all relevant trades.

Always ask the user's location and relevant building details before answering. Base advice on NCC, AS1684, AS1720.1, AS1170, or US/UK equivalents depending on region. Use metric by default.

Your responses are short (20–80 words), accurate, and practical. If unsure, ask for clarification. When estimating decking, framing, spans, or rafters — confirm sizes, spacing, supplier, and load.`
  };

  const fullMessages = messages.some(msg => msg.role === 'system')
    ? messages
    : [systemPrompt, ...messages];

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: fullMessages,
      temperature: 0.65,
      max_tokens: 700
    });

    const reply = response.data.choices[0].message.content.trim();
    res.json({ reply });

  } catch (error) {
    console.error("Ask route error:", error.response?.data || error.message);
    res.status(500).json({ reply: "Kai had trouble thinking — try again later." });
  }
});

// === Quote Generator Route (/quote) ===
app.post('/quote', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ reply: "No messages received." });
  }

  const quoteSystemPrompt = {
    role: "system",
    content: `You are Kai Marlow, a seasoned Aussie builder and material takeoff expert. Your job is to generate itemized quote breakdowns based on the project described by the user.

Ask for measurements, location, material types, and spacing. Always use metric (mm, m) and real product sizes from Bunnings/Bowens. Round lengths to the next 600mm increment.

Return short, clean, itemized lists like:
- 20 x 90x45 MGP10 joists @ 3.6m
- 15 x 140x22 Merbau decking @ 5.4m
- 1 box of 65mm gal nails
- 1 tube of adhesive

Assume prices if needed and add a note: "Prices are rough estimates — always confirm locally."`
  };

  const fullMessages = messages.some(msg => msg.role === 'system')
    ? messages
    : [quoteSystemPrompt, ...messages];

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: fullMessages,
      temperature: 0.6,
      max_tokens: 800
    });

    const quote = response.data.choices[0].message.content.trim();
    res.json({ reply: quote });

  } catch (error) {
    console.error("Quote route error:", error.response?.data || error.message);
    res.status(500).json({ reply: "Something went wrong. Try again later." });
  }
});

// === Stripe Webhook ===
app.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;
    const metadata = session.metadata || {};
    const pack = metadata.pack || 'unknown';

    console.log(`✅ Payment received from ${email} for pack: ${pack}`);
    // Token logic is handled on the frontend for now.
  }

  res.status(200).end();
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
