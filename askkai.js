const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

// Health check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Debug route — optional
app.get('/debug', (req, res) => {
  res.send(`Key loaded: ${process.env.OPENAI_API_KEY ? "Yes" : "No"}`);
});

// Home route
app.get('/', (req, res) => {
  res.send('Ask Kai GPT backend is running!');
});

// Handle POST request with full conversation
app.post('/ask', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ reply: "No messages history received." });
  }

  try {
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: messages,
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

