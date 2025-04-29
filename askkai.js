const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

// OpenAI setup
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Debug route — check if API key is loaded
app.get('/debug', (req, res) => {
  res.send(`Key loaded: ${process.env.OPENAI_API_KEY ? "Yes" : "No"}`);
});

// Welcome route
app.get('/', (req, res) => {
  res.send('Ask Kai GPT backend is running!');
});

// Handle POST questions
app.post('/ask', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ reply: "No prompt received." });
  }

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are Kai Marlow — a friendly Aussie tradie with 20+ years of experience. Give fast, practical advice in clear, confident language."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const gptReply = response.data.choices[0].message.content.trim();
    res.json({ reply: gptReply });

  } catch (error) {
    if (error.response) {
      console.error('OpenAI response error:', error.response.status, error.response.data);
    } else {
      console.error('OpenAI general error:', error.message);
    }
    res.status(500).json({ reply: "Kai had trouble thinking — try again shortly." });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
