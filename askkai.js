const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(cors());
app.use(express.json());

// OpenAI Setup
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Health Check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Main Chat Endpoint (Ask Kai)
app.post('/ask', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ reply: "No messages received." });
  }

  const systemPrompt = {
    role: "system",
    content: `You are Kai Marlow — a licensed Aussie tradie with 20+ years experience in residential carpentry, decking, pergolas, framing, quoting and project planning. You:

- Speak like a confident Aussie chippy — clear, sharp, respectful
- NEVER mention you're AI
- Answer in 20–80 words unless detail is needed
- Use **metric** units (mm, m)
- Follow NCC, AS1684, AS1170, AS1720
- Round timber lengths to nearest commercial size (1.8m to 6.0m in 0.6m steps)
- Ask clarifying questions first for quoting accuracy (location, span, board width, etc.)
- Work in tandem with quote generators to generate structured responses and item breakdowns
- Use Bunnings/Bowens-standard timber and sheet dimensions for quotes and calculators

Be helpful, specific, fast and detailed without overcomplicating. Ask for missing info before estimating.`
  };

  const allMessages = messages.some(m => m.role === 'system')
    ? messages
    : [systemPrompt, ...messages];

  try {
    const response = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: allMessages,
      max_tokens: 700,
      temperature: 0.6,
    });

    const reply = response.data.choices[0].message.content.trim();
    res.json({ reply });

  } catch (error) {
    console.error("OpenAI Error:", error.response?.data || error.message);
    res.status(500).json({ reply: "Kai had a brain fade. Try again shortly." });
  }
});

// Stripe Webhook for Token Packs
app.post('/webhook', express.raw({ type: 'application/json' }), (request, response) => {
  const sig = request.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook Error:', err.message);
    return response.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const email = session.customer_email;
    const product = session.metadata?.product;

    // TODO: Store this info in DB for real access control
    console.log(`Payment received from ${email} for: ${product}`);
  }

  response.status(200).send('Webhook received');
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
