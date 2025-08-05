const express = require('express');
const OpenAI = require('openai');

const app = express();
const port = 3000;

// Serve static files from the 'public' directory
app.use(express.static('public'));
app.use(express.json()); // For parsing application/json

async function chatWithLLM(messages, llmBaseUrl) {
  // Use the provided llmBaseUrl or fall back to a default if not provided/valid
  const effectiveBaseUrl = llmBaseUrl || 'http://localhost:9090/v1'; // Default fallback

  const openai = new OpenAI({
    baseURL: effectiveBaseUrl,
    apiKey: 'sk-no-key-required', // Required by the OpenAI package, but not used by local LLM
  });

  try {
    const chatCompletion = await openai.chat.completions.create({
      messages: messages,
      model: 'gpt-3.5-turbo', // Model name might vary for local LLMs, gpt-3.5-turbo is a common placeholder
    });
    return chatCompletion.choices[0].message.content;
  } catch (error) {
    console.error(`Error communicating with LLM at ${effectiveBaseUrl}:`, error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    throw error; // Re-throw to be caught by the client
  }
}

// API endpoint for chat
app.post('/chat', async (req, res) => {
  const userMessage = req.body.message;
  const chatHistory = req.body.history || []; // Get chat history, default to empty array
  const llmBaseUrl = req.body.llmBaseUrl; // Get the configurable LLM base URL

  if (!userMessage) {
    return res.status(400).send('Message is required');
  }

  // Construct messages array for LLM, including history and current message
  const messagesForLLM = chatHistory.map(msg => ({ role: msg.sender, content: msg.text }));
  messagesForLLM.push({ role: 'user', content: userMessage });

  try {
    // Pass the llmBaseUrl to the chatWithLLM function
    const llmResponse = await chatWithLLM(messagesForLLM, llmBaseUrl);
    res.json({ reply: llmResponse });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get response from LLM' });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

// module.exports = chatWithLLM; // No longer needed as it's an internal function now
