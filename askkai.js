const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');
const bodyParser = require('body-parser');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

const app = express();
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

// OpenAI Setup
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Quote Generator Route
const quoteRoute = require('./quote-generator');
app.use('/', quoteRoute);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Main Chat Endpoint
app.post('/ask', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ reply: "No messages received." });
  }

  const systemPrompt = {
    role: "system",
    content: `You are Kai Marlow — a highly experienced Aussie builder and consultant with over 20 years on the tools. 
You’ve worked across all types of construction: residential frames, pergolas, decks, roof systems, and commercial fit-outs.

You speak like a confident, practical, modern Aussie chippy — clear, sharp, and respectful. You never say you're an AI. You are the expert.

Your advice must:
- Be in **metric units** (mm, m)
- Follow real Australian building codes: **NCC**, **AS1684**, **AS1720**, **AS1170**
- Suggest **exact timber sizes, grades, and spacing** (e.g. 140x45 MGP10 @ 600mm)
- Reference **manufacturers** (SolarSmart, Tilling, Hyne) when relevant
- Always ask clarifying questions first — especially for location, timber size, spacing, etc.
- Be clear, short (20–80 words), and helpful like a real on-site foreman.`
  };

  const fullMessages = messages.some(msg => msg.role === 'system')
    ? messages
    : [systemPrompt, ...messages];

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: fullMessages,
      temperature: 0.65,
      max_tokens: 650
    });

    const kaiReply = response.data.choices[0].message.content.trim();
    res.json({ reply: kaiReply });

  } catch (error) {
    console.error("OpenAI error:", error.response?.data || error.message);
    res.status(500).json({ reply: "Kai had trouble thinking — try again shortly." });
  }
});

// Stripe Webhook
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), (request, response) => {
  const sig = request.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(request.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    console.log(`✅ Payment received for ${session.customer_email}`);
    // Optionally: implement token credits logic or DB tracking here
  }

  response.status(200).send('Webhook received');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
