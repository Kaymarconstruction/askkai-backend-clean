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

// Chat Endpoint (Enhanced Prompt)
app.post('/chat', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages)) return res.status(400).json({ error: 'Invalid message format.' });

  const systemPrompt = {
    role: 'system',
    content: `
      You are Kai, a senior construction estimator.
      Always provide clear, dot-point material order lists.
      - Optimize for standard material lengths to minimize waste.
      - Default to Class A soil if not specified.
      - Apply waste factors (usually 10%).
      - When calculating roofing, include pitch effects and correct flashing lengths.
      Be concise and professional. Avoid lengthy explanations unless requested.
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
    projectType,
    wallLengthM,
    wallHeightM,
    brickSize = '390x190x190',
    deckLengthM,
    deckWidthM,
    deckHeightMM,
    stumpSize,
    bearerSize,
    joistSize,
    deckingBoardSize,
    joistSpacingMM = 450,
    roofWidthM,
    roofLengthM,
    pitchDeg = 0,
    colorbondCoverageMM = 760,
    region = 'VIC',
    soilClass = 'A'
  } = req.body;

  const standardLengths = [1.8, 2.4, 3.0, 3.6, 4.2, 4.8, 5.4, 6.0];
  const results = [];
  const embedmentDepths = { VIC: 600, NSW: 600, QLD: 450 };
  const embedmentMM = embedmentDepths[region] || 600;

  try {
    if (projectType === 'brickWall') {
      const [brickLengthMM, brickHeightMM] = brickSize.split('x').map(Number);
      const wallAreaM2 = wallLengthM * wallHeightM;
      const brickCount = calculations.brickQuantity(wallAreaM2, brickLengthMM / 1000, brickHeightMM / 1000);
      const mortarVolume = calculations.mortarVolume(brickCount);

      results.push({ material: `Concrete Bricks (${brickSize})`, orderAmount: `${brickCount} bricks` });
      results.push({ material: `Mortar`, orderAmount: `${mortarVolume} m³` });
      results.push({ material: `Wall Ties`, orderAmount: `${calculations.wallTies(wallAreaM2)} ties` });
    }

    if (projectType === 'roof') {
      const pitchRadians = pitchDeg * (Math.PI / 180);
      const slopeLengthM = roofWidthM / (2 * Math.cos(pitchRadians)); // Adjust for pitch
      const roofAreaM2 = roofLengthM * slopeLengthM * 2; // Gable roof assumption

      const sheetsNeeded = Math.ceil((roofAreaM2 / (colorbondCoverageMM / 1000)) * 1.1);
      results.push({
        material: `Colorbond Roofing Sheets`,
        orderAmount: `${sheetsNeeded} sheets at standard length ${roofLengthM}m`
      });

      const flashingLengthM = (roofWidthM * 2 + roofLengthM * 2) * 1.1;
      results.push({ material: `Flashing`, orderAmount: `${Math.ceil(flashingLengthM)} meters` });
    }

    if (projectType === 'deck') {
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

      const bearerLength = standardLengths.find(l => l >= deckWidthM) || 3.0;
      const bearersNeeded = 3;
      results.push({
        material: `${bearerSize} H3 Treated Pine Bearers`,
        orderAmount: `${bearersNeeded} lengths @ ${bearerLength}m`
      });

      const joistsNeeded = Math.ceil(deckWidthM * 1000 / joistSpacingMM) + 1;
      const joistLength = standardLengths.find(l => l >= deckLengthM) || 4.2;
      results.push({
        material: `${joistSize} H3 Treated Pine Joists`,
        orderAmount: `${joistsNeeded} lengths @ ${joistLength}m`
      });

      const boardWidth = parseInt(deckingBoardSize.split('x')[0]);
      const gapMM = 3;
      const boardsNeeded = calculations.deckingBoardCount(deckWidthM * 1000, boardWidth, gapMM);
      const deckBoardLength = standardLengths.find(l => l >= deckLengthM) || 4.2;

      results.push({
        material: `${deckingBoardSize} Merbau Decking Boards`,
        orderAmount: `${boardsNeeded} lengths @ ${deckBoardLength}m`
      });
    }

    res.json({
      structuredMaterials: results,
      note: `Optimized for ${projectType}. Region: ${region}, Soil Class: ${soilClass}, Embedment Depth: ${embedmentMM}mm.`
    });

  } catch (error) {
    console.error('Structured Quote Error:', error);
    res.status(500).json({ error: 'Kai encountered an error while generating the structured quote.' });
  }
});

app.listen(PORT, () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
