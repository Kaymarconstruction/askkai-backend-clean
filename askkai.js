const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');
const calculations = require('./calculations');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY
}));

app.use(cors());
app.use(express.json());

// Chat Endpoint (GPT) - Enhanced Prompt
app.post('/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid message format.' });
  }

  const systemPrompt = {
    role: 'system',
    content: `
      You are Kai, an experienced builder and carpenter. 
      Provide clear, structured advice using dot-point material lists.
      When discussing material orders:
      - Optimize for standard timber lengths to minimize waste.
      - Default to Class A soil if soil type is not specified.
      - Assume embedment depths based on the user's Australian region (600mm for VIC and NSW, 450mm for QLD).
      - Always output the exact number of standard lengths required.
      - Do not suggest multiple length options; recommend only the most suitable length.
      Be concise, professional, and friendly. Avoid long-winded explanations unless asked.
    `
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

// Structured Quote Endpoint (Code-Based Logic)
app.post('/structured-quote', (req, res) => {
  const {
    deckLengthM,
    deckWidthM,
    deckHeightMM,
    stumpSize,
    bearerSize,
    joistSize,
    deckingBoardSize,
    joistSpacingMM = 450,
    region = 'VIC', // Default region
    soilClass = 'A' // Default soil class if not specified
  } = req.body;

  if (!deckLengthM || !deckWidthM || !deckHeightMM || !stumpSize || !bearerSize || !joistSize || !deckingBoardSize) {
    return res.status(400).json({ error: 'Missing required deck specification fields.' });
  }

  try {
    const standardLengths = [1.8, 2.4, 3.0, 3.6, 4.2, 4.8, 5.4, 6.0];
    const results = [];

    // Regional Embedment Depths (future configurable)
    const embedmentDepths = { VIC: 600, NSW: 600, QLD: 450 };
    const embedmentMM = embedmentDepths[region] || 600;

    // 1. Stumps Calculation
    const stumpTotalLengthMM = deckHeightMM + embedmentMM;
    const stumpLengthM = stumpTotalLengthMM / 1000;
    const optimalStumpLength = standardLengths.find(l => l >= stumpLengthM) || 2.4;

    const stumpsNeeded = 9; // Default grid assumption; could be made dynamic later
    const stumpsPerLength = Math.floor(optimalStumpLength / stumpLengthM);
    const stumpLengthsRequired = Math.ceil(stumpsNeeded / stumpsPerLength);

    results.push({
      material: `${stumpSize} H4 Pine Stumps`,
      orderAmount: `${stumpLengthsRequired} lengths @ ${optimalStumpLength}m (Cut ${stumpsPerLength} per length)`
    });

    // 2. Bearers
    const bearerLength = standardLengths.find(l => l >= deckWidthM) || 3.0;
    const bearersNeeded = 3;
    results.push({
      material: `${bearerSize} H3 Treated Pine Bearers`,
      orderAmount: `${bearersNeeded} lengths @ ${bearerLength}m`
    });

    // 3. Joists
    const joistsNeeded = Math.ceil(deckWidthM * 1000 / joistSpacingMM) + 1;
    const joistLength = standardLengths.find(l => l >= deckLengthM) || 4.2;
    results.push({
      material: `${joistSize} H3 Treated Pine Joists`,
      orderAmount: `${joistsNeeded} lengths @ ${joistLength}m`
    });

    // 4. Decking Boards
    const boardWidthMM = parseInt(deckingBoardSize.split('x')[0]);
    const gapMM = 3;
    const boardsNeeded = calculations.deckingBoardCount(deckWidthM * 1000, boardWidthMM, gapMM);

    const deckBoardLength = standardLengths.find(l => l >= deckLengthM) || 4.2;
    results.push({
      material: `${deckingBoardSize} Merbau Decking Boards`,
      orderAmount: `${boardsNeeded} lengths @ ${deckBoardLength}m`
    });

    res.json({
      structuredMaterials: results,
      note: `Optimized for standard lengths and minimal waste. Region: ${region}, Soil Class: ${soilClass}, Embedment depth: ${embedmentMM}mm.`
    });
  } catch (error) {
    console.error('Structured Quote Error:', error);
    res.status(500).json({ error: 'Kai encountered an error while generating the structured quote.' });
  }
});

app.listen(PORT, () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
