import 'web-streams-polyfill';
import express from 'express';
import { config } from 'dotenv';
import { OpenAI } from 'openai';
import path from 'path';
import fs from 'fs';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from 'langchain/document';

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

// Sample product data - in a real application, this would come from a database
const products = [
  {
    id: 1,
    name: "Premium Wireless Headphones",
    description: "High-quality wireless headphones with noise cancellation, 30-hour battery life, and premium sound quality. Perfect for music lovers and professionals.",
    price: 249.99,
    category: "Electronics",
    tags: ["audio", "wireless", "noise-cancellation"]
  },
  {
    id: 2,
    name: "Smart Fitness Watch",
    description: "Track your fitness goals with this advanced smartwatch. Features heart rate monitoring, sleep tracking, and 50+ sport modes. Water-resistant and week-long battery life.",
    price: 199.99,
    category: "Wearables",
    tags: ["fitness", "smartwatch", "health"]
  },
  {
    id: 3,
    name: "Ultra-Slim Laptop",
    description: "Powerful and portable laptop with 16GB RAM, 512GB SSD, and the latest processor. Perfect for work and entertainment with a stunning 4K display.",
    price: 1299.99,
    category: "Computers",
    tags: ["laptop", "portable", "high-performance"]
  },
  {
    id: 4,
    name: "Professional Camera Kit",
    description: "Complete photography kit with a 24MP DSLR camera, 3 premium lenses, tripod, and carrying case. Ideal for professional photographers and serious hobbyists.",
    price: 1499.99,
    category: "Photography",
    tags: ["camera", "professional", "photography"]
  },
  {
    id: 5,
    name: "Smart Home Hub",
    description: "Control your entire smart home with this centralized hub. Compatible with all major smart home devices and voice assistants. Easy setup and intuitive app.",
    price: 129.99,
    category: "Smart Home",
    tags: ["smart home", "automation", "IoT"]
  }
];

// Initialize vector store for product embeddings
async function initVectorStore() {
  try {
    // Create documents from products
    const documents = products.map(product => {
      return new Document({
        pageContent: `${product.name}: ${product.description}`,
        metadata: {
          id: product.id,
          name: product.name,
          price: product.price,
          category: product.category,
          tags: product.tags
        }
      });
    });

    // Initialize embeddings with OpenAI
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    // Create vector store
    const vectorStore = await Chroma.fromDocuments(documents, embeddings, {
      collectionName: "product_embeddings",
      url: process.env.CHROMA_URL || "http://localhost:8000", // Default ChromaDB URL
    });

    if (DEBUG) {
      console.log('Vector store initialized with', documents.length, 'products');
    }

    return vectorStore;
  } catch (error) {
    console.error('Error initializing vector store:', error);
    throw error;
  }
}

// Initialize vector store at startup
let vectorStore: Chroma;
(async () => {
  try {
    vectorStore = await initVectorStore();
  } catch (error) {
    console.error('Failed to initialize vector store:', error);
    process.exit(1);
  }
})();

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

// Function to retrieve relevant products based on query
async function retrieveRelevantProducts(query: string, limit = 3) {
  try {
    const results = await vectorStore.similaritySearch(query, limit);
    return results;
  } catch (error) {
    console.error('Error retrieving products:', error);
    return [];
  }
}

// Function to format product recommendations for the chat
function formatProductRecommendations(products: Document[]) {
  if (products.length === 0) {
    return "I couldn't find any products matching your requirements.";
  }

  let response = "Based on your needs, here are some product recommendations:\n\n";
  
  products.forEach((product, index) => {
    const metadata = product.metadata;
    response += `${index + 1}. **${metadata.name}** - $${metadata.price}\n`;
    response += `   ${product.pageContent.split(': ')[1]}\n`;
    response += `   Category: ${metadata.category}, Tags: ${metadata.tags.join(', ')}\n\n`;
  });
  
  response += "Would you like more details about any of these products?";
  return response;
}

// SSE endpoint for chat responses
app.post('/api/chat', async (req, res) => {
  try {
    // Get message from request body
    const message = req.body.message;
    const chatHistory = req.body.history || [];

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    if (DEBUG) {
      console.log('Creating chat completion with message:', message);
      console.log('Chat history length:', chatHistory.length);
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Retrieve relevant products based on the user query
    const relevantProducts = await retrieveRelevantProducts(message);
    
    if (DEBUG) {
      console.log('Retrieved relevant products:', 
        relevantProducts.map(p => p.metadata.name));
    }

    // Format product information for the context
    const productContext = formatProductRecommendations(relevantProducts);
    
    // Prepare messages for OpenAI
    const systemMessage = {
      role: 'system',
      content: `You are a helpful shopping assistant that recommends products based on customer needs.
When recommending products, use the product information provided in the context.
If you don't have relevant product information, suggest general categories or ask for more details.
Always be friendly, helpful, and concise. Don't make up product information that isn't provided.`
    };
    
    // Combine chat history, system message, and new user message
    const messages = [
      systemMessage,
      ...chatHistory,
      { role: 'user', content: message },
      { 
        role: 'system', 
        content: `Here are some products that might be relevant to the user's query:\n${productContext}`
      }
    ];

    // Create chat completion with streaming
    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages,
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

// Endpoint to get all products
app.get('/api/products', (req, res) => {
  res.json(products);
});

// Endpoint to search products
app.get('/api/products/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const results = await retrieveRelevantProducts(query, 5);
    res.json(results.map(doc => doc.metadata));
  } catch (error: any) {
    res.status(500).json({ 
      error: 'Error searching products',
      details: error.message
    });
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
