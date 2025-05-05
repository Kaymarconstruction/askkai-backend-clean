const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/webhook', bodyParser.raw({ type: 'application/json' }));

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// In-memory token tracker (replace with DB later)
const userTokens = {
  'mark@kaymarconstruction.com': Infinity,
};

// Health Check
app.get('/health', (req, res) => {
  res.status(200).send('Ask Kai backend is running');
});

// Chat Endpoint
app.post('/ask', async (req, res) => {
  const { messages, email } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ reply: "No messages provided." });
  }

  const isMark = email === 'mark@kaymarconstruction.com';
  const remainingTokens = userTokens[email] || 0;

  if (!isMark && remainingTokens <= 0) {
    return res.status(403).json({ reply: "No tokens remaining. Please upgrade your plan." });
  }

  const systemPrompt = {
    role: "system",
    content: `You are Kai Marlow — a straight-talking Aussie builder with 20+ years of hands-on experience in decks, spans, timber specs, quoting and more. You never say you're an AI. Always speak with clear, helpful trade advice and use metric units. Reference Australian Standards and brands like Hyne, Tilling and SolarSmart where relevant.`
  };

  const fullMessages = messages.some(msg => msg.role === 'system')
    ? messages
    : [systemPrompt, ...messages];

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: fullMessages,
      temperature: 0.65,
      max_tokens: 600
    });

    const reply = response.data.choices[0].message.content.trim();

    if (!isMark) {
      userTokens[email] = Math.max((userTokens[email] || 0) - 1, 0);
    }

    res.json({ reply });

  } catch (error) {
    console.error('OpenAI error:', error.message);
    res.status(500).json({ reply: "Kai had trouble thinking — try again shortly." });
  }
});

// Stripe Webhook
app.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email || session.metadata?.email;
    const pack = session.metadata?.pack;

    let tokensToAdd = 0;

    switch (pack) {
      case 'mini': tokensToAdd = 10; break;
      case 'standard': tokensToAdd = 50; break;
      case 'pro': tokensToAdd = 100; break;
      case 'plus': tokensToAdd = 7000; break;
      case 'premium': tokensToAdd = 20000; break;
    }

    if (email && tokensToAdd > 0) {
      userTokens[email] = (userTokens[email] || 0) + tokensToAdd;
      console.log(`✅ ${tokensToAdd} tokens added to ${email}`);
    } else {
      console.warn(`⚠️ Webhook received but no email or pack match.`);
    }
  }

  res.status(200).json({ received: true });
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
