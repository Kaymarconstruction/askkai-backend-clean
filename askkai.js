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
  apiKey: process.env.OPENAI_API_KEY,
}));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

app.use(cors());
app.use(express.json());

const PROMPT_LIMIT_FREE = parseInt(process.env.PROMPT_LIMIT_FREE, 10) || 10;

// Helpers
async function getUser(email) {
  if (!email) throw new Error('User email is required.');
  let { data, error } = await supabase.from('users').select('*').eq('email', email).single();

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

  const { error } = await supabase.from('users')
    .update({ prompt_count: newCount })
    .eq('email', email);

  if (error) throw new Error('Failed to update prompt count.');
  return newCount;
}

// Chat Endpoint (General Tradie Advice)
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

    const systemPrompt = { role: 'system', content: `You are Kai Marlow, a seasoned carpenter and building consultant from Frankston, Victoria, Australia...` }; // [Shortened for brevity. Use full prompt as needed.]

    const fullMessages = messages.some(m => m.role === 'system')
      ? messages
      : [systemPrompt, ...messages];

    const aiResponse = await openai.createChatCompletion({
      model: 'gpt-3.5-turbo',
      messages: fullMessages,
      max_tokens: 1200,
      temperature: 0.7,
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

// Quote Generator Endpoint (Take-Off Specialist)
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
- No intros, comments, or explanations.  
- Example:  
  - 10x Treated Pine Posts 90x90 H4 (3.0m lengths)  
  - 24x MGP10 Beams 190x45 (4.2m lengths)  
- Specify clear quantities, sizes, and lengths.  
- Assume VIC standards unless otherwise specified.  
- No prices or supplier names unless asked.  
- Keep under 200 words.  
      `
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
