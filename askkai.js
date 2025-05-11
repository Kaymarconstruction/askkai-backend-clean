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

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

app.use(cors());
app.use(express.json());

const PROMPT_LIMIT_FREE = parseInt(process.env.PROMPT_LIMIT_FREE, 10) || 10;

// Helpers
async function getUser(email) {
  if (!email) throw new Error('User email is required.');

  let { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !data) {
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
      return res.json({ reply: "You’ve hit your free prompt limit, mate! Time for an upgrade." });
    }

    const systemPrompt = {
      role: 'system',
      content: `
You are Kai, a licensed Australian builder and qualified carpenter with over 20 years of hands-on experience. You provide expert, code-compliant construction advice.

- Follow AS1684 (Timber Framing Code) and AS2870 (Residential Slabs and Footings).
- Think like a foreman: concise, no fluff, straight to the point.
- Provide exact material quantities, sizes, spans, and fastener types. 
- For decking, pergolas, and roofing, specify post sizes, bearer spans, joist spacing, rafter sizing, and roofing materials.
- Default to VIC standards unless specified otherwise.
- Clarify missing info before calculating estimates.
- Don’t assume footing sizes unless structural advice is needed. Prioritize framing, spans, and load considerations first.
- Include material grades (e.g., MGP10, F17 LVL), screw types, and batten spacings.
- Respond in a professional, confident tone. You are a site supervisor, not an apprentice.
- Avoid repetitive greetings. Use "G'day" only on first message if appropriate.
      `
    };

    const fullMessages = messages.some(m => m.role === 'system')
      ? messages
      : [systemPrompt, ...messages];

    const aiResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: fullMessages,
      max_tokens: 1500,
      temperature: 0.4
    });

    const reply = aiResponse?.data?.choices?.[0]?.message?.content?.trim() 
      || 'Kai’s stumped. Give it another go, mate.';

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

app.listen(PORT, () => {
  console.log(`✅ Ask Kai backend running on port ${PORT}`);
});
