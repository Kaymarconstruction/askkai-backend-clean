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

// Chat Endpoint with Enhanced Prompt
app.post('/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid message format.' });
  }

  const systemPrompt = {
    role: 'system',
    content: `
      You are Kai, an experienced builder and carpenter.
      Provide clear, structured material order lists using dot points.
      - Optimize for standard timber lengths to minimize waste.
      - Default to Class A soil if soil type is not specified.
      - Assume embedment depths based on Australian region (600mm VIC/NSW, 450mm QLD).
      - Always recommend the correct standard length, no multiple options.
      - Calculate and include waste factors (usually 10%).
      Be concise and avoid long explanations unless asked.
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

// Unified Structured Quote Endpoint
app.post('/structured-quote', (req, res) => {
  const {
    projectType,
    deckLengthM,
    deckWidthM,
    deckHeightMM,
    stumpSize,
    bearerSize,
    joistSize,
    deckingBoardSize,
    joistSpacingMM = 450,
    wallLengthM,
    wallHeightM,
    blockSize = '390x190x190',
    claddingType,
    boardWidthMM = 180,
    roofWidthM,
    roofLengthM,
    colorbondCoverageMM = 760,
    region = 'VIC',
    soilClass = 'A'
  } = req.body;

  const standardLengths = [1.8, 2.4, 3.0, 3.6, 4.2, 4.8, 5.4, 6.0];
  const results = [];
  const embedmentDepths = { VIC: 600, NSW: 600, QLD: 450 };
  const embedmentMM = embedmentDepths[region] || 600;

  try {
    if (projectType === 'deck') {
      // Stump Calculations
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

      // Decking Boards
      const boardWidth = parseInt(deckingBoardSize.split('x')[0]);
      const gapMM = 3;
      const boardsNeeded = calculations.deckingBoardCount(deckWidthM * 1000, boardWidth, gapMM);
      const deckBoardLength = standardLengths.find(l => l >= deckLengthM) || 4.2;
      results.push({
        material: `${deckingBoardSize} Merbau Decking Boards`,
        orderAmount: `${boardsNeeded} lengths @ ${deckBoardLength}m`
      });
    }

    if (projectType === 'brickWall') {
      // Block Wall Calculation
      const [blockLengthMM, blockHeightMM] = blockSize.split('x').map(Number);
      const wallAreaM2 = wallLengthM * wallHeightM;
      const blockFaceAreaM2 = (blockLengthMM * blockHeightMM) / 1_000_000;
      const blocksNeeded = Math.ceil((wallAreaM2 / blockFaceAreaM2) * 1.1); // 10% waste

      results.push({
        material: `Concrete Blocks (${blockSize})`,
        orderAmount: `${blocksNeeded} blocks`
      });

      const mortarVolumeM3 = (blocksNeeded * 0.0005).toFixed(2);
      results.push({
        material: `Mortar`,
        orderAmount: `${mortarVolumeM3} m³`
      });

      results.push({
        material: `Reinforcement Bars (12mm)`,
        orderAmount: `Spacing every 600mm vertically and horizontally as per structural standards`
      });
    }

    if (projectType === 'cladding') {
      // Weatherboard Cladding
      const wallPerimeterM = wallLengthM * 4; // Assuming rectangle
      const wallAreaM2 = wallPerimeterM * wallHeightM;
      const boardCoverageM = boardWidthMM / 1000;
      const boardsNeeded = Math.ceil((wallAreaM2 / boardCoverageM) * 1.1); // 10% waste

      results.push({
        material: `${claddingType} Weatherboards (${boardWidthMM}mm)`,
        orderAmount: `${boardsNeeded} boards`
      });
    }

    if (projectType === 'roof') {
      // Colorbond Roofing
      const totalRoofWidthMM = roofWidthM * 1000;
      const sheetsNeeded = Math.ceil(totalRoofWidthMM / colorbondCoverageMM);
      results.push({
        material: `Colorbond Roofing Sheets`,
        orderAmount: `${sheetsNeeded} sheets`
      });

      const flashingLengthM = (roofWidthM * 2 + roofLengthM * 2) * 1.1;
      results.push({
        material: `Flashing (100x100mm)`,
        orderAmount: `${Math.ceil(flashingLengthM)} meters`
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
