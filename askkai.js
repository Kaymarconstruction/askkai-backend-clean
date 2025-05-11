const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'].forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY
}));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

app.use(cors());
app.use(express.json());

const PROMPT_LIMIT_FREE = parseInt(process.env.PROMPT_LIMIT_FREE, 10) || 10;
const DEFAULT_BAG_VOLUME = 0.01; // m³ per 20kg bag

// Helpers
async function getUser(email) {
  if (!email) throw new Error('User email is required.');

  let { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) {
    // Auto-create user if not found
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({ email, plan_tier: 'Free', prompt_count: 0 })
      .select()
      .single();

    if (insertError) throw new Error('Failed to create new user.');
    return newUser;
  }

  return data;
}

async function updatePromptCount(email) {
  const user = await getUser(email);
  const newCount = (user.prompt_count || 0) + 1;

  const { error } = await supabase
    .from('users')
    .update({ prompt_count: newCount })
    .eq('email', email);

  if (error) throw new Error('Failed to update prompt count.');
  return newCount;
}

// Chat Endpoint
app.post('/chat', async (req, res) => {
  const { messages, userEmail } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No conversation history provided.' });
  }

  try {
    const user = await getUser(userEmail);
    if (user.plan_tier === 'Free' && user.prompt_count >= PROMPT_LIMIT_FREE) {
      return res.json({ reply: 'You’ve hit your free prompt limit, mate! Time for an upgrade.' });
    }

    const systemPrompt = {
      role: 'system',
      content: `
        You are Kai, a highly experienced Aussie construction estimator.
        - ONLY greet with "G'day" for new chats.
        - Follow AS1684 and AS2870 codes.
        - Calculate concrete, post holes, spans properly.
        - Use dot-points for material lists.
        - Keep it short, clear, with light Aussie personality.
        - Default to VIC unless specified.
        - Clarify missing info before giving an estimate.
      `
    };

    const fullMessages = messages.some(m => m.role === 'system')
      ? messages
      : [systemPrompt, ...messages];

    const aiResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: fullMessages,
      max_tokens: 1200,
      temperature: 0.7
    });

    const reply = aiResponse?.data?.choices?.[0]?.message?.content?.trim() ||
      'Kai’s stumped. Give it another go, mate.';

    const updatedCount = await updatePromptCount(userEmail);

    res.json({ reply, promptCount: updatedCount });

  } catch (error) {
    console.error('Chat Error:', error);
    res.status(500).json({ reply: 'Kai hit a snag. Try again shortly.' });
  }
});

// Supplier Fetch Endpoint
app.get('/suppliers', async (req, res) => {
  try {
    const { data, error } = await supabase.from('supplier').select('*');
    if (error) return res.status(500).json({ error: error.message });
    res.json({ suppliers: data });
  } catch (err) {
    console.error('Supplier Fetch Error:', err);
    res.status(500).json({ error: 'Could not fetch suppliers.' });
  }
});

// Concrete & Footing Calculator
app.post('/calculate-footings', (req, res) => {
  const { postSizeMM, postCount, region = 'VIC', bagVolumeM3 = DEFAULT_BAG_VOLUME } = req.body;

  if (!postSizeMM || !postCount) {
    return res.status(400).json({ error: 'Post size and count required.' });
  }

  const embedmentDepths = { VIC: 600, QLD: 450 };
  const regionKey = region.toUpperCase();
  const embedmentMM = embedmentDepths[regionKey] || 600;

  const holeDiameterMM = postSizeMM * 3;
  const holeRadiusM = (holeDiameterMM / 1000) / 2;
  const depthM = embedmentMM / 1000;

  const volumePerHoleM3 = Math.PI * Math.pow(holeRadiusM, 2) * depthM;
  const totalVolumeM3 = volumePerHoleM3 * postCount;
  const concreteBags = Math.ceil(totalVolumeM3 / bagVolumeM3);

  res.json({
    holeDiameterMM,
    embedmentDepthMM: embedmentMM,
    volumePerHoleM3: parseFloat(volumePerHoleM3.toFixed(3)),
    totalVolumeM3: parseFloat(totalVolumeM3.toFixed(3)),
    concreteBags
  });
});

app.listen(PORT, () => {
  console.log(`✅ Ask Kai backend running on port ${PORT}`);
});
