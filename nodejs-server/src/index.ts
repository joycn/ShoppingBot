import express from 'express';
import { config } from 'dotenv';
import { OpenAI } from 'openai';
import path from 'path';

// Load environment variables
config();

// Enable debug logging
const DEBUG = true;

const app = express();
const port = 3000;

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL
});

// Debug middleware
app.use((req, res, next) => {
  if (DEBUG) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    console.log('Request body:', req.body);
  }
  next();
});

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// SSE endpoint for chat responses
app.post('/api/chat', async (req, res) => {
  try {
    // Get message from request body
    const message = req.body.message;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (DEBUG) {
      console.log('Creating chat completion with message:', message);
      console.log('Using model: gpt-4o-mini');
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Create chat completion with streaming
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: message }],
      stream: true,
    });

    if (DEBUG) {
      console.log('Stream created successfully');
    }

    // Stream the response
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        if (DEBUG) {
          console.log('Streaming chunk:', content);
        }
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    // End the stream
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (error: any) {
    console.error('Error details:', {
      message: error.message,
      status: error.status,
      headers: error.headers,
      request_id: error.request_id,
      code: error.code,
      type: error.type
    });
    
    if (!res.headersSent) {
      res.status(500).json({ 
        error: 'Internal server error',
        details: error.message,
        status: error.status
      });
    }
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
  if (DEBUG) {
    console.log('Debug mode is enabled');
    console.log('OpenAI configuration:', {
      baseURL: openai.baseURL,
      apiKey: openai.apiKey ? '***' + openai.apiKey.slice(-4) : undefined
    });
  }
});
