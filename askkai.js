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

// Chat Endpoint
app.post('/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Invalid message format.' });

  const systemPrompt = {
    role: 'system',
    content: `
      You are Kai, a senior construction estimator. 
      Always provide clear, concise, dot-point material order lists.
      - Optimize for standard lengths to minimize waste.
      - Use 10% waste factor where appropriate.
      - For decking boards, calculate: joist length / (board width + gap width), rounded up.
      - For masonry, calculate block quantities including mortar and reinforcement suggestions.
      - If region not specified, assume NSW and Class A soil.
      Output only material lists unless asked for explanations.
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

// Structured Quote Endpoint
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
    region = 'NSW',
    soilClass = 'A'
  } = req.body;

  if (!deckLengthM || !deckWidthM || !deckHeightMM || !stumpSize || !bearerSize || !joistSize || !deckingBoardSize) {
    return res.status(400).json({ error: 'Missing required deck specification fields.' });
  }

  try {
    const standardLengths = [1.8, 2.4, 3.0, 3.6, 4.2, 4.8, 5.4, 6.0];
    const results = [];
    const embedmentDepths = { VIC: 600, NSW: 600, QLD: 450 };
    const embedmentMM = embedmentDepths[region] || 600;

    // Stumps Calculation
    const stumpTotalLengthMM = deckHeightMM + embedmentMM;
    const stumpLengthM = stumpTotalLengthMM / 1000;
    const optimalStumpLength = standardLengths.find(l => l >= stumpLengthM) || 2.4;
    const stumpsNeeded = 9; 
    const stumpsPerLength = Math.floor(optimalStumpLength / stumpLengthM);
    const stumpLengthsRequired = Math.ceil(stumpsNeeded / stumpsPerLength);

    results.push({
      material: `${stumpSize} H4 Pine Stumps`,
      orderAmount: `${stumpLengthsRequired} lengths @ ${optimalStumpLength}m (Cut ${stumpsPerLength} per length)`
    });

    // Bearers
    const bearerLength = standardLengths.find(l => l >= deckWidthM) || 3.0;
    const bearersNeeded = 3;
    results.push({
      material: `${bearerSize} H3 Treated Pine Bearers`,
      orderAmount: `${bearersNeeded} lengths @ ${bearerLength}m`
    });

    // Joists
    const joistsNeeded = Math.ceil(deckWidthM * 1000 / joistSpacingMM) + 1;
    const joistLength = standardLengths.find(l => l >= deckLengthM) || 4.2;
    results.push({
      material: `${joistSize} H3 Treated Pine Joists`,
      orderAmount: `${joistsNeeded} lengths @ ${joistLength}m`
    });

    // Decking Boards Calculation
    const [boardWidthMM, boardThickness] = deckingBoardSize.split('x').map(Number);
    const gapMM = 3;
    const boardsPerRow = Math.ceil(deckWidthM * 1000 / (boardWidthMM + gapMM));
    const deckBoardLength = standardLengths.find(l => l >= deckLengthM) || 4.2;
    const rowsOfBoards = Math.ceil(deckLengthM / deckBoardLength);
    const totalBoards = boardsPerRow * rowsOfBoards;
    const totalBoardsWithWaste = Math.ceil(totalBoards * 1.1); 

    results.push({
      material: `${deckingBoardSize} Merbau Decking Boards`,
      orderAmount: `${totalBoardsWithWaste} boards @ ${deckBoardLength}m`
    });

    res.json({
      structuredMaterials: results,
      note: `Optimized for standard lengths and minimal waste. Region: ${region}, Soil Class: ${soilClass}, Embedment Depth: ${embedmentMM}mm.`
    });

  } catch (error) {
    console.error('Structured Quote Error:', error);
    res.status(500).json({ error: 'Kai encountered an error while generating the structured quote.' });
  }
});

app.listen(PORT, () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
