const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');
const Stripe = require('stripe');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.raw({ type: 'application/json' }));

// --- ENVIRONMENT KEYS ---
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// --- HEALTH CHECK ---
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// --- MAIN CHAT: /ask ---
app.post('/ask', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ reply: "No messages received." });
  }

  const systemPrompt = {
    role: "system",
    content: `You are Kai Marlow — a highly experienced Aussie builder and consultant with over 20 years on the tools.
You provide clear, practical advice using metric units, based on the NCC and relevant Australian standards.
You adapt responses based on the user's country and always ask clarifying questions if data is missing.
Do NOT mention you are an AI. Speak like a friendly, professional Aussie tradie.`
  };

  const fullMessages = messages.some(msg => msg.role === 'system')
    ? messages
    : [systemPrompt, ...messages];

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: fullMessages,
      temperature: 0.6,
      max_tokens: 650
    });

    const kaiReply = response.data.choices[0].message.content.trim();
    res.json({ reply: kaiReply });
  } catch (error) {
    console.error("Chat error:", error.response?.data || error.message);
    res.status(500).json({ reply: "Kai had trouble thinking — try again shortly." });
  }
});

// --- QUOTE GENERATOR: /quote ---
app.post('/quote', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ reply: "No message history provided." });
  }

  const systemQuotePrompt = {
    role: "system",
    content: `You are Kai Marlow – a quoting assistant for construction.
You're helping a builder or homeowner figure out materials needed for their project.

You must:
- Ask for project location
- Use Australian codes unless told otherwise
- Use metric units only
- Base calculations on typical construction methods and brand specs
- Round timber lengths up to nearest 0.6m increment
- Ask for dimensions, spacing, and materials before final quote
- Format the quote clearly:
1. Decking: ___ boards @ ___mm
2. Joists: ___ length MGP10 @ ___mm spacing
3. Concrete: ___ bags 20kg
4. Fixings: ___ screws, ___ brackets

Always include a short disclaimer: "Verify quantities locally. This is a rough guide only. Prices not included."`
  };

  const fullQuote = messages.some(msg => msg.role === 'system')
    ? messages
    : [systemQuotePrompt, ...messages];

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: fullQuote,
      temperature: 0.55,
      max_tokens: 800
    });

    const reply = response.data.choices[0].message.content.trim();
    res.json({ reply });
  } catch (err) {
    console.error("Quote error:", err.response?.data || err.message);
    res.status(500).json({ reply: "Something went wrong. Try again later." });
  }
});

// --- STRIPE WEBHOOK ---
app.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error("Webhook Error:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log("Payment confirmed for:", session.customer_email);
    // Extend to update user tokens later
  }

  res.status(200).json({ received: true });
});

// --- SERVER START ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
