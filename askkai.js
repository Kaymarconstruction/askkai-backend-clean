const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');
const calculations = require('./calculations'); // Calculation logic module
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY
}));

app.use(cors());
app.use(express.json());

// Chat Endpoint (GPT)
app.post('/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid message format.' });
  }

  const systemPrompt = {
    role: 'system',
    content: 'You are Kai, an experienced builder and carpenter. Provide clear, concise advice on construction, materials, and related coding tools. Be professional and friendly.'
  };

  const fullMessages = messages.some(m => m.role === 'system') ? messages : [systemPrompt, ...messages];

  try {
    const aiResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: fullMessages,
      max_tokens: 1000,
      temperature: 0.7
    });

    const reply = aiResponse.data.choices[0].message.content.trim();
    res.json({ reply });
  } catch (error) {
    console.error('Chat Error:', error);
    res.status(500).json({ reply: 'Kai had an error, please try again shortly.' });
  }
});

// Quote Generator (GPT-Based)
app.post('/quote', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid message format.' });
  }

  const systemPrompt = {
    role: 'system',
    content: 'You are Kai, a senior estimator and builder. Generate a materials list only. Use dot points. Do not include pricing or supplier recommendations.'
  };

  const fullMessages = messages.some(m => m.role === 'system') ? messages : [systemPrompt, ...messages];

  try {
    const aiResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: fullMessages,
      max_tokens: 1000,
      temperature: 0.6
    });

    const materialList = aiResponse.data.choices[0].message.content.trim();
    res.json({ reply: materialList });
  } catch (error) {
    console.error('Quote Generation Error:', error);
    res.status(500).json({ reply: 'Kai had an error, please try again shortly.' });
  }
});

// New Structured Quote Endpoint (Code-Based)
app.post('/structured-quote', (req, res) => {
  const { deckLengthM, deckWidthM, deckHeightMM, stumpSize, bearerSize, joistSize, deckingBoardSize, joistSpacingMM = 450 } = req.body;

  if (!deckLengthM || !deckWidthM || !deckHeightMM || !stumpSize || !bearerSize || !joistSize || !deckingBoardSize) {
    return res.status(400).json({ error: 'Missing required deck specification fields.' });
  }

  try {
    const standardLengths = [1.8, 2.4, 3.0, 3.6, 4.2, 4.8, 5.4, 6.0];

    const results = [];

    // 1. Stumps
    const stumpLengthRequiredM = (deckHeightMM + 600) / 1000; // Assuming 600mm in-ground minimum
    const optimalStumpLength = standardLengths.find(l => l >= stumpLengthRequiredM) || 2.4;
    const stumpsNeeded = 9; // Basic grid assumption; could be calculated based on spans
    results.push({
      material: `${stumpSize} H4 Pine Stumps`,
      orderAmount: `${Math.ceil(stumpsNeeded * stumpLengthRequiredM / optimalStumpLength)} lengths @ ${optimalStumpLength}m`,
    });

    // 2. Bearers
    const bearersNeeded = 3;
    const bearerLength = standardLengths.find(l => l >= deckWidthM) || 3.0;
    results.push({
      material: `${bearerSize} H3 Treated Pine Bearers`,
      orderAmount: `${bearersNeeded} lengths @ ${bearerLength}m`,
    });

    // 3. Joists
    const joistsNeeded = Math.ceil(deckWidthM * 1000 / joistSpacingMM) + 1;
    const joistLength = standardLengths.find(l => l >= deckLengthM) || 4.2;
    results.push({
      material: `${joistSize} H3 Treated Pine Joists`,
      orderAmount: `${joistsNeeded} lengths @ ${joistLength}m`,
    });

    // 4. Decking Boards
    const boardWidthMM = parseInt(deckingBoardSize.split('x')[0]);
    const gapMM = 3;
    const boardsNeeded = calculations.deckingBoardCount(deckWidthM * 1000, boardWidthMM, gapMM);
    const deckBoardLength = standardLengths.find(l => l >= deckLengthM) || 4.2;
    results.push({
      material: `${deckingBoardSize} Merbau Decking Boards`,
      orderAmount: `${boardsNeeded} lengths @ ${deckBoardLength}m`,
    });

    res.json({
      structuredMaterials: results,
      note: "Quantities optimized for standard lengths and minimal waste. Prices not included."
    });
  } catch (error) {
    console.error('Structured Quote Error:', error);
    res.status(500).json({ error: 'Kai encountered an error while generating the structured quote.' });
  }
});

app.listen(PORT, () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
