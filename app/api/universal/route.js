import { OpenAI } from "openai";
import axios from "axios";
import { NextResponse } from "next/server";

// Configuration for different providers
const PROVIDERS = {
  openai: {
    baseURL: "https://api.openai.com/v1",
    envKey: "OPENAI_API_KEY",
    headers: {},
    formatRequest: (messages, options) => ({
      model: options.model || "gpt-3.5-turbo",
      messages,
      stream: true,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 1024,
    }),
    formatResponse: (chunk) => chunk.choices[0]?.delta?.content || '',
  },
  openrouter: {
    baseURL: "https://openrouter.ai/api/v1",
    envKey: "OPENROUTER_API_KEY",
    headers: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "OrbitAI Multi-model Assistant",
    },
    formatRequest: (messages, options) => ({
      model: options.model || "deepseek/deepseek-chat-v3:free",
      messages,
      stream: true,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 1024,
    }),
    formatResponse: (chunk) => chunk.choices[0]?.delta?.content || '',
  },
  huggingface: {
    baseURL: "https://router.huggingface.co/nebius/v1",
    envKey: "HUGGINGFACE_API_KEY",
    headers: {},
    formatRequest: (messages, options) => ({
      model: options.model || "deepseek-ai/DeepSeek-R1-0528",
      messages,
      stream: true,
      temperature: options.temperature || 0.5,
      max_tokens: options.max_tokens || 1000,
    }),
    formatResponse: (chunk) => chunk.choices[0]?.delta?.content || '',
  },
  nvidia: {
    baseURL: "https://integrate.api.nvidia.com/v1",
    envKey: "NVIDIA_API_KEY",
    headers: {
      Accept: "text/event-stream",
    },
    formatRequest: (messages, options) => ({
      model: options.model || "meta/llama-4-maverick-17b-128e-instruct",
      messages,
      stream: true,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 1024,
      top_p: 0.9,
    }),
    formatResponse: (chunk) => {
      const lines = chunk.toString().split('\n').filter(line => line.trim() !== '');
      let content = '';
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.replace(/^data: /, '');
          if (data === '[DONE]') return null;
          try {
            const parsed = JSON.parse(data);
            content += parsed.choices?.[0]?.delta?.content || '';
          } catch (e) {
            console.error('Error parsing chunk:', e);
          }
        }
      }
      return content;
    },
  },
};

// Helper to create a stream
function createStream() {
  let controller;
  const stream = new ReadableStream({
    start(c) {
      controller = c;
    },
  });
  return { stream, controller };
}

export async function POST(req) {
  try {
    const { messages, personalization, provider: providerName, model, ...options } = await req.json();
    
    // Validate provider
    const provider = PROVIDERS[providerName];
    if (!provider) {
      return NextResponse.json(
        { error: `Unsupported provider: ${providerName}` },
        { status: 400 }
      );
    }

    // Check API key
    const apiKey = process.env[provider.envKey];
    if (!apiKey) {
      return NextResponse.json(
        { error: `${providerName} API key not configured` },
        { status: 401 }
      );
    }

    // Create system message with personalization
    let systemMessage = {
      role: "system",
      content: "You are a helpful AI assistant."
    };

    if (personalization) {
      const { name, profession, traits, additionalInfo } = personalization;
      systemMessage.content = `You are a helpful AI assistant. You are chatting with ${name || 'the user'}, who is a ${profession || 'professional'}.

Your behavior should follow these guidelines:
${traits || 'Be helpful, accurate, and follow the user\'s instructions.'}`;
      
      if (additionalInfo) {
        systemMessage.content += `

Additional context about the user that you should consider:
${additionalInfo}`;
      }
    }

    // Prepare messages with system message
    const chatMessages = [systemMessage, ...messages];
    
    // Create stream
    const { stream, controller } = createStream();
    const encoder = new TextEncoder();

    // Process request asynchronously
    (async () => {
      try {
        const client = new OpenAI({
          apiKey,
          baseURL: provider.baseURL,
          defaultHeaders: {
            ...provider.headers,
            'Content-Type': 'application/json',
          },
        });

        // Format request based on provider
        const requestBody = provider.formatRequest(chatMessages, { ...options, model });

        // Special handling for NVIDIA which uses raw axios
        if (providerName === 'nvidia') {
          const response = await axios.post(
            `${provider.baseURL}/chat/completions`,
            requestBody,
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                ...provider.headers,
              },
              responseType: 'stream',
            }
          );

          response.data.on('data', (chunk) => {
            const content = provider.formatResponse(chunk);
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ reply: content })}\n\n`));
            }
          });

          response.data.on('end', () => {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          });

          response.data.on('error', (err) => {
            console.error('Stream error:', err);
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`));
            controller.close();
          });
        } else {
          // Standard OpenAI-compatible providers
          const stream = await client.chat.completions.create(requestBody);
          
          for await (const chunk of stream) {
            const content = provider.formatResponse(chunk);
            if (content) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ reply: content })}\n\n`));
            }
          }
          
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      } catch (error) {
        console.error(`[${providerName}] Error:`, error);
        const errorMessage = error.response?.data || error.message || 'Unknown error';
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errorMessage })}\n\n`));
        controller.close();
      }
    })();

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Universal API error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', details: error.message },
      { status: 500 }
    );
  }
}

// Helper endpoint to list available providers and models
export async function GET() {
  const providers = Object.entries(PROVIDERS).map(([key, config]) => ({
    id: key,
    name: key.charAt(0).toUpperCase() + key.slice(1),
    envKey: config.envKey,
    models: {
      default: config.formatRequest([], {}).model,
      // Add more models as needed
    },
    configurableOptions: {
      temperature: {
        type: 'number',
        default: 0.7,
        min: 0,
        max: 2,
        step: 0.1,
      },
      max_tokens: {
        type: 'number',
        default: 1024,
        min: 1,
        max: 4096,
      },
    },
  }));

  return NextResponse.json({ providers });
}
