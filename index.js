const express = require('express');
const OpenAI = require('openai');

const app = express();
const port = 3000;

// Serve static files from the 'public' directory
app.use(express.static('public'));
app.use(express.json()); // For parsing application/json

async function chatWithLLM(messages, llmBaseUrl, systemPrompt) {
  // Use the provided llmBaseUrl or fall back to a default if not provided/valid
  const effectiveBaseUrl = llmBaseUrl || 'http://localhost:9090/v1'; // Default fallback

  const openai = new OpenAI({
    baseURL: effectiveBaseUrl,
    apiKey: 'sk-no-key-required', // Required by the OpenAI package, but not used by local LLM
  });

  try {
    // Construct messages array with system prompt if provided
    let messagesForLLM = [...messages];
    
    if (systemPrompt && systemPrompt.trim() !== '') {
      messagesForLLM = [
        { role: 'system', content: systemPrompt },
        ...messagesForLLM
      ];
    }

    const chatCompletion = await openai.chat.completions.create({
      messages: messagesForLLM,
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
  const systemPrompt = req.body.systemPrompt; // Get the system prompt

  // Construct messages array for LLM, including history and current message.
  // The 'userMessage' might be an empty string if the user sent an empty input,
  // in which case it will be added as a message with empty content.
  const messagesForLLM = chatHistory.map(msg => ({ role: msg.sender, content: msg.text }));

  // Only add the new user message if it's not an empty string AND if there's no history,
  // or if there is history. The frontend ensures that we don't send an entirely empty
  // request (no history, no message).
  if (userMessage !== '' || messagesForLLM.length === 0) {
      messagesForLLM.push({ role: 'user', content: userMessage });
  }

  // If after processing, messagesForLLM is still empty, it means only an empty message was passed
  // and there was existing history. This implies the frontend only wanted to resend history
  // without a new message. The LLM typically needs a message from the user.
  // Re-evaluate if this logic path needs to enforce a user message if history is present.
  // For now, if messagesForLLM becomes empty, it indicates an issue or an edge case
  // where the frontend should have prevented the call. The earlier check in chat.js
  // `if (chatMessages.length === 0 && message === '')` should prevent this.
  if (messagesForLLM.length === 0) {
      console.warn('Backend received an empty message list for LLM. This should ideally be prevented by the frontend.');
      return res.status(400).send('No valid messages to send to LLM.');
  }

  try {
    // Pass the llmBaseUrl and systemPrompt to the chatWithLLM function
    const llmResponse = await chatWithLLM(messagesForLLM, llmBaseUrl, systemPrompt);
    res.json({ reply: llmResponse });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get response from LLM' });
  }
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

// module.exports = chatWithLLM; // No longer needed as it's an internal function now
