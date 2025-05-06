const express = require('express'); const cors = require('cors'); const { Configuration, OpenAIApi } = require('openai'); const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const app = express(); app.use(cors()); app.use(express.json());

// OpenAI Setup const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY, }); const openai = new OpenAIApi(configuration);

// Health Check app.get('/health', (req, res) => { res.status(200).send('OK'); });

// Shared Kai Persona const kaiSystemMessage = { role: "system", content: `You are Kai Marlow — a highly experienced Aussie builder with 20+ years of residential and commercial construction experience.

Your responses must:

Always ask for the user's location, code jurisdiction, and project type if not given

Use metric units (mm, m, m², m³)

Reference real Australian codes (NCC, AS1684, AS1170) when applicable

Be clear, practical, and short (20–80 words max)

Suggest standard timber sizes (90x45, 140x45, MGP10, H3, etc.) and quote materials logically

Understand that items like concrete, boards, and framing come in standard lengths (i.e. 2.4m, 3.0m, 6.0m)

Ask clarifying questions when a user doesn't provide enough info to estimate accurately

Never say you are an AI — you are Kai, a site-ready trades assistant` };


// POST: /ask (Main Ask Kai Chat) app.post('/ask', async (req, res) => { const { messages } = req.body;

if (!messages || !Array.isArray(messages)) { return res.status(400).json({ reply: "No messages received." }); }

const fullMessages = messages.some(msg => msg.role === 'system') ? messages : [kaiSystemMessage, ...messages];

try { const response = await openai.createChatCompletion({ model: "gpt-3.5-turbo", messages: fullMessages, temperature: 0.7, max_tokens: 750 });

const kaiReply = response.data.choices[0].message.content.trim();
res.json({ reply: kaiReply });

} catch (error) { console.error("Kai error:", error.response?.data || error.message); res.status(500).json({ reply: "Something went wrong. Try again later." }); } });

// POST: /quote (Quote Generator) app.post('/quote', async (req, res) => { const { messages } = req.body;

if (!messages || !Array.isArray(messages)) { return res.status(400).json({ reply: "No input provided." }); }

const quotePrompt = { role: "system", content: `You are Kai Marlow, a quoting and estimating expert for building and trades.

You must:

Estimate quantities of timber, fasteners, cement, etc.

Always clarify the location, deck type, timber specs, board width, etc.

Assume all timber comes in 2.4m–6.0m lengths (steps of 0.6m)

Round up material requirements appropriately

Provide a list in markdown style (✓ Item: Qty – Description)

End with a disclaimer: "This estimate is for materials only. Double-check dimensions and local code for accuracy."


Be helpful, fast, and confident. Output should fit below the quote chat window.` };

try { const response = await openai.createChatCompletion({ model: "gpt-3.5-turbo", messages: [quotePrompt, ...messages], temperature: 0.6, max_tokens: 750 });

const reply = response.data.choices[0].message.content.trim();
res.json({ reply });

} catch (error) { console.error("Quote error:", error.response?.data || error.message); res.status(500).json({ reply: "Kai couldn't generate your quote. Try again." }); } });

// STRIPE Webhook (Token/Plan Handling – placeholder) app.post('/webhook', express.raw({ type: 'application/json' }), (req, res) => { // Future webhook logic here res.status(200).send('Webhook received'); });

// Start Server const PORT = process.env.PORT || 3000; app.listen(PORT, '0.0.0.0', () => { console.log(Ask Kai backend running on port ${PORT}); });

