const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check route
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Home route
app.get('/', (req, res) => {
  res.send('Ask Kai server is running!');
});

// Handle POST questions
app.post('/ask', (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ reply: "No prompt received." });
  }

  const mockReply = `You asked: "${prompt}" — I'm on it, mate!`;
  res.json({ reply: mockReply });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Ask Kai backend running on port ${PORT}`);
});
