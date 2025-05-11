const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY
}));

app.use(cors());
app.use(express.json());

// In-Memory Conversation Tracker
const conversationState = {};

// Chat Endpoint
app.post('/chat', async (req, res) => {
  const { messages, sessionId } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No conversation history provided.' });
  }

  const isNewConversation = !conversationState[sessionId];
  if (isNewConversation) conversationState[sessionId] = true;

  const systemPrompt = {
    role: 'system',
    content: `
      You are Kai, a highly experienced Aussie construction estimator and tradie mate. 
      Speak like a knowledgeable bloke on site—relaxed but professional. 
      
      If this is the first message in a conversation, start with "G'day mate!" 
      Otherwise, keep the tone natural and don't keep repeating "G'day".

      Always apply AS1684 and AS2870 building codes for posts, stumps, fences, and decks.
      - Calculate hole size: 3 × post width. Default depth: 600mm (VIC) or 450mm (QLD).
      - Concrete volume: π × (diameter/2)^2 × depth × number of holes.
      - Concrete bags: Total m³ / 0.01m³ per 20kg bag. Round up.
      - Prompt for missing critical details (soil type, slope, fence height, region).
      - If uncertain, clearly state assumptions before listing materials.
      - Give short advice (10–30 words) before listing materials.
      - Output materials as dot-point lists, optimized for standard lengths and minimal waste.
      - Default to Class A soil if not specified. 
      - Keep it friendly and cheeky occasionally, but don’t overdo the Aussie slang.
      
      First Interaction: ${isNewConversation}
    `
  };

  const fullMessages = messages.some(m => m.role === 'system')
    ? messages
    : [systemPrompt, ...messages];

  try {
    const aiResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: fullMessages,
      max_tokens: 1200,
      temperature: 0.7
    });

    const reply = aiResponse.data.choices?.[0]?.message?.content?.trim() 
      || 'Kai’s a bit stumped. Try again shortly, mate.';
    
    res.json({ reply });
  } catch (error) {
    console.error('Chat Error:', error.response?.data || error.message);
    res.status(500).json({ reply: 'Kai ran into a snag. Give it another go shortly, mate.' });
  }
});

// Concrete & Footing Helper
app.post('/calculate-footings', (req, res) => {
  const { postSizeMM, postCount, region = 'VIC' } = req.body;

  if (!postSizeMM || !postCount) {
    return res.status(400).json({ error: 'Post size and count required.' });
  }

  const embedmentDepths = { VIC: 600, QLD: 450 };
  const regionKey = (region || 'VIC').toUpperCase();
  const embedmentMM = embedmentDepths[regionKey] || 600;

  const holeDiameterMM = postSizeMM * 3;
  const holeRadiusM = (holeDiameterMM / 1000) / 2;
  const depthM = embedmentMM / 1000;

  const volumePerHoleM3 = Math.PI * Math.pow(holeRadiusM, 2) * depthM;
  const totalVolumeM3 = volumePerHoleM3 * postCount;
  const concreteBags = Math.ceil(totalVolumeM3 / 0.01);

  res.json({
    holeDiameterMM,
    embedmentDepthMM: embedmentMM,
    volumePerHoleM3: parseFloat(volumePerHoleM3.toFixed(3)),
    totalVolumeM3: parseFloat(totalVolumeM3.toFixed(3)),
    concreteBags
  });
});

app.listen(PORT, () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
