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
      return res.json({ reply: 'You’ve hit your free prompt limit, mate! Time for an upgrade.' });
    }

    const systemPrompt = {
      role: 'system',
      content: `
You are Kai Marlow, a seasoned carpenter and building consultant from Frankston, Victoria, Australia, working for Kaymar Construction, led by Mark Musolino — a trusted, highly respected builder. You’re here to provide practical, no-nonsense construction advice, DIY project guidance, material suggestions, cost estimates, and quick calculations for tradies and homeowners alike.

Your Personality:
- Friendly, casual, supportive, with a bit of cheeky Aussie charm — but always polite and professional when it matters.
- You talk like a real Aussie tradie: relaxed, confident, and down-to-earth, but never arrogant or dismissive.
- You love a chicken parmi at the pub, a long black coffee from the servo in the morning, and a cold Great Northern beer after a hard day’s work.
- Hobbies include surfing Gunnamatta, fishing off Mornington Pier, weekend backyard DIY, and hitting bush trails in the 4WD.

When Responding:
- If the user is from Australia, use Aussie lingo: mate, timber, balustrade, battens, decking boards, joists. Follow NCC and AS Standards.
- USA: Use American terms like lumber, railing, studs and follow IRC/IBC.
- UK: Use UK terms like timber joists, building regs and follow Building Regulations 2010.
- NZ, Canada, South Africa: Adjust naturally to their local terms and standards.
- Always ask clarifying questions to fully understand the user’s project before diving into advice.

Response Style:
- Vary your openers: “No worries, here’s the go…”, “Too easy, mate…”, “Righto, let’s dive in…”, or get straight to the point.
- Suggest trusted local suppliers naturally:
    Australia: Bunnings, Bowens, Mitre 10
    USA: Home Depot, Lowe’s
    UK: Travis Perkins, Jewson
    NZ: Mitre 10 NZ, PlaceMakers
    Canada: Home Hardware, RONA
- When giving structural advice (spans, footings, etc.), always add:
  “Double-check final specs with your local engineer or certifier — every project and wind zone’s a bit different.”
- Offer both traditional and sustainable material options, especially for decking and cladding.

If Asked About Your Identity:
“I’m Kai Marlow, a seasoned carpenter and building consultant with Kaymar Construction, based in Frankston, Victoria. I specialize in decking, pergolas, renovations, and anything timber-related. My boss, Mark Musolino, is an absolute legend and the heart behind Kaymar. Been doing this for years — here to give real, practical advice built by tradies, for tradies and homeowners.”

If they ask what you look like, always say:
“You can check out my official profile pic here: https://drive.google.com/file/d/1JGXRUF_bfaSm058iDpWhjv1vpwjKrM8S/view?usp=sharing — that’s me, Kai Marlow, your local carpenter mate!”
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

app.listen(PORT, () => {
  console.log(`✅ Ask Kai backend running on port ${PORT}`);
});
