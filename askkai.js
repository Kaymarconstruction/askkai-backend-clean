const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Configuration, OpenAIApi } = require('openai');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 10000;

['OPENAI_API_KEY', 'SUPABASE_URL', 'SUPABASE_ANON_KEY'].forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
});

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

app.use(helmet());
app.use(cors({ origin: ['https://ask.kaymarconstruction.com'], credentials: true }));
app.use(express.json());

const PROMPT_LIMIT_FREE = parseInt(process.env.PROMPT_LIMIT_FREE, 10) || 10;
const MAX_TOKENS = parseInt(process.env.MAX_TOKENS, 10) || 700;

// Helpers
async function getUser(email) {
  if (!email) throw new Error('User email is required.');
  const { data, error } = await supabase.from('users').select('*').eq('email', email).single();

  if (error || !data) {
    const plan_tier = email === 'mark@kaymarconstruction.com' ? 'Pro' : 'Free';
    const prompt_count = plan_tier === 'Pro' ? null : 0;
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{ email, plan_tier, prompt_count, created_at: new Date().toISOString() }])
      .select()
      .single();

    if (insertError) throw new Error(`Failed to create user: ${insertError.message}`);
    return newUser;
  }

  // Auto-upgrade Mark
  if (email === 'mark@kaymarconstruction.com' && data.plan_tier !== 'Pro') {
    await supabase.from('users')
      .update({ plan_tier: 'Pro', prompt_count: null })
      .eq('email', email);
    data.plan_tier = 'Pro';
    data.prompt_count = null;
  }

  return data;
}

async function updatePromptCount(email) {
  const user = await getUser(email);
  if (user.plan_tier === 'Pro') return user.prompt_count;

  const newCount = (user.prompt_count || 0) + 1;
  const { error } = await supabase.from('users').update({ prompt_count: newCount }).eq('email', email);

  if (error) throw new Error('Failed to update prompt count.');
  return newCount;
}

async function chatWithOpenAI(messages, retries = 2) {
  try {
    return await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages,
      max_tokens: MAX_TOKENS,
      temperature: 0.3,
    });
  } catch (err) {
    if (retries > 0) return chatWithOpenAI(messages, retries - 1);
    throw err;
  }
}

// Chat Endpoint
app.post('/chat', async (req, res) => {
  const { messages, userEmail } = req.body;

  if (!userEmail) return res.status(400).json({ error: 'Missing userEmail.' });
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No conversation history provided.' });
  }

  try {
    const user = await getUser(userEmail);
    if (user.plan_tier === 'Free' && user.prompt_count >= PROMPT_LIMIT_FREE) {
      return res.json({ reply: 'You’ve hit your free prompt limit, mate! Time for an upgrade.' });
    }

    const systemPrompt = {
      role: 'system',
      content: `You are Kai Marlow, a seasoned carpenter from Frankston, VIC, Australia.
- Keep answers short, clear, and practical.
- Use Aussie lingo like "Righto mate" or "Here’s the go".
- Recommend Bunnings, Bowens, Reece, Middies when relevant.
- Keep it cheeky but helpful. Avoid overexplaining.`,
    };

    const finalMessages = [systemPrompt, ...messages.filter(m => m.role !== 'system')];

    const aiResponse = await chatWithOpenAI(finalMessages);
    const reply = aiResponse?.data?.choices?.[0]?.message?.content?.trim() || 'Kai’s stumped. Try again, mate.';

    const updatedCount = await updatePromptCount(userEmail);
    return res.json({ reply, promptCount: updatedCount });

  } catch (error) {
    console.error('Chat Error:', error.message);
    return res.status(500).json({ reply: 'Kai hit a snag. Try again shortly.' });
  }
});

// Quote Generator
app.post('/generate-quote', async (req, res) => {
  const { messages } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'No project details provided.' });
  }

  try {
    const systemPrompt = {
      role: 'system',
      content: `You are Kai Marlow, an expert estimator.
- Output ONLY a clean dot-point materials list.
- Example:
  - 10x Treated Pine Posts 90x90 H4 (3.0m)
  - 24x MGP10 Beams 190x45 (4.2m)
- Assume VIC standards. No prices unless asked.
- Keep it under 200 words. No chit-chat.`,
    };

    const finalMessages = [systemPrompt, ...messages.filter(m => m.role !== 'system')];

    const aiResponse = await chatWithOpenAI(finalMessages);
    const reply = aiResponse?.data?.choices?.[0]?.message?.content?.trim() || 'Unable to generate quote. Try again.';

    return res.json({ reply });

  } catch (error) {
    console.error('Quote Generation Error:', error.message);
    return res.status(500).json({ reply: 'Kai hit a snag. Try again later.' });
  }
});

// Suppliers Endpoint
app.get('/suppliers', async (req, res) => {
  try {
    const { data, error } = await supabase.from('suppliers').select('*');
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ suppliers: data });
  } catch (err) {
    console.error('Suppliers Fetch Error:', err.message);
    return res.status(500).json({ error: 'Could not fetch suppliers.' });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Ask Kai backend running on port ${PORT}`);
});
