const express = require('express');
const cors = require('cors');
const { Configuration, OpenAIApi } = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

// OpenAI config
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
  });
  const openai = new OpenAIApi(configuration);

  // Health check
  app.get('/health', (req, res) => {
    res.status(200).send('OK');
    });

    app.get('/', (req, res) => {
      res.send('Ask Kai GPT backend is running!');
      });

      app.post('/ask', async (req, res) => {
        const { prompt } = req.body;

          if (!prompt) {
              return res.status(400).json({ reply: "No prompt received." });
                }

                  try {
                      const response = await openai.createChatCompletion({
                            model: "gpt-4",
                                  messages: [
                                          {
                                                    role: "system",
                                                              content: "You are Kai Marlow — a friendly Aussie tradie with 20+ years experience giving fast, practical building advice. Answer clearly and confidently."
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
                                                                                                                                              console.error('OpenAI error:', error.response?.data || error.message);
                                                                                                                                                  res.status(500).json({ reply: "Kai had trouble thinking — try again shortly." });
                                                                                                                                                    }
                                                                                                                                                    });

                                                                                                                                                    const PORT = process.env.PORT || 3000;
                                                                                                                                                    app.listen(PORT, '0.0.0.0', () => {
                                                                                                                                                      console.log(`Ask Kai backend running on port ${PORT}`);
                                                                                                                                                      });
                                                                                                                                                      

