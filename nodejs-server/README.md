# TypeScript OpenAI Chat API

A TypeScript-based API server that provides a streaming chat interface with OpenAI's GPT models.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with your OpenAI configuration:
```
OPENAI_API_KEY=your-api-key-here
OPENAI_BASE_URL=https://api.openai.com/v1
```

3. Start the development server:
```bash
npm run dev
```

## API Endpoints

### POST /api/chat
Streams chat responses from OpenAI.

Request body:
```json
{
  "message": "Your message here"
}
```

Response: Server-Sent Events (SSE) stream with chunks of the response.

### GET /api/health
Health check endpoint.

Response:
```json
{
  "status": "ok"
}
```

## Scripts

- `npm run dev` - Run in development mode
- `npm run build` - Build the TypeScript code
- `npm start` - Run the built JavaScript code
