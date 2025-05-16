const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 10000;

['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_KEY'].forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use(cors({ origin: 'https://ask.kaymarconstruction.com' }));
app.use(express.json());

const PROMPT_LIMIT_FREE = parseInt(process.env.PROMPT_LIMIT_FREE, 10) || 10;

// Helpers
async function getUser(email) {
  if (!email) throw new Error('User email is required.');
  
  let { data, error } = await supabase.from('users').select('*').eq('email', email).single();

  if (error || !data) {
    const plan_tier = (email === 'mark@kaymarconstruction.com') ? 'Pro' : 'Free';
    const prompt_count = (plan_tier === 'Pro') ? Infinity : 0;

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({ email, plan_tier, prompt_count })
      .select()
      .single();

    if (insertError) throw new Error('Failed to create new user.');
    return newUser;
  }

  // Auto-upgrade Mark to Pro if not already
  if (email === 'mark@kaymarconstruction.com' && data.plan_tier !== 'Pro') {
    await supabase.from('users')
      .update({ plan_tier: 'Pro', prompt_count: Infinity })
      .eq('email', email);
    data.plan_tier = 'Pro';
    data.prompt_count = Infinity;
  }

  return data;
}

async function updatePromptCount(email) {
  const user = await getUser(email);
  if (user.plan_tier === 'Pro') return user.prompt_count; // Unlimited for Pro users

  const newCount = (user.prompt_count || 0) + 1;

  const { error } = await supabase.from('users')
    .update({ prompt_count: newCount })
    .eq('email', email);

  if (error) throw new Error('Failed to update prompt count.');
  return newCount;
}

// Chat Endpoint
app.post('/chat', async (req, res) => {
  const { messages, userEmail } = req.body;
  console.log('Received Chat Request:', { userEmail, messages });

  if (!userEmail) return res.status(400).json({ error: 'Missing userEmail.' });
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
      content: `You are Kai Marlow, a seasoned carpenter and building consultant from Frankston, VIC, Australia.

- Keep answers short, clear, and practical — like you're having a quick yarn on-site.
- Vary your openings: use casual phrases like "Righto mate," "Here’s the go," or dive straight in.
- Limit advice to what's immediately useful — no long explanations unless directly asked.
- Always suggest trusted Aussie suppliers like Bunnings or Bowens if materials are mentioned.
- Include cheeky but polite Aussie tone. Never overexplain or waffle..` 
    };

    const fullMessages = messages.some(m => m.role === 'system')
      ? messages
      : [systemPrompt, ...messages];

    const aiResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: fullMessages,
      max_tokens: 700,
      temperature: 0.3,
    });

    const reply = aiResponse?.data?.choices?.[0]?.message?.content?.trim() || 
      'Kai’s stumped. Give it another go, mate.';

    const updatedCount = await updatePromptCount(userEmail);
    res.json({ reply, promptCount: updatedCount });

  } catch (error) {
    console.error('Chat Endpoint Error:', error);
    res.status(500).json({ reply: 'Kai hit a snag. Try again shortly.' });
  }
});

// Quote Generator Endpoint
app.post('/generate-quote', async (req, res) => {
  const { messages } = req.body;
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No project details provided.' });
  }

  try {
    const systemPrompt = {
      role: 'system',
      content: `
You are Kai Marlow, a master estimator and material take-off expert from Frankston, VIC, Australia.

- Output ONLY a clean, dot-point materials list.  
- Example:  
  - 10x Treated Pine Posts 90x90 H4 (3.0m lengths)  
  - 24x MGP10 Beams 190x45 (4.2m lengths)  

- Assume VIC standards unless otherwise specified.  
- No prices or supplier names unless directly asked.  
- If materials are mentioned, casually suggest trusted suppliers like Bunnings or Bowens.

- Keep it under 200 words. No chit-chat, no extra explanations.`
    };

    const finalMessages = messages.some(m => m.role === 'system')
      ? messages
      : [systemPrompt, ...messages];

    const aiResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: finalMessages,
      max_tokens: 1000,
      temperature: 0.3,
    });

    const reply = aiResponse?.data?.choices?.[0]?.message?.content?.trim() || 
      '- Unable to generate quote. Try again.';

    res.json({ reply });

  } catch (error) {
    console.error('Quote Generation Error:', error);
    res.status(500).json({ reply: '- Kai hit a snag. Please try again.' });
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
