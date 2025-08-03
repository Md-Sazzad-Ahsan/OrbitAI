import { NextResponse } from 'next/server';

// Default Ollama API URL (assuming default port)
// Using 127.0.0.1 instead of localhost for better Windows compatibility
const OLLAMA_API_URL = process.env.OLLAMA_API_URL || 'http://127.0.0.1:11434';

// Test connection to Ollama server
async function testOllamaConnection() {
  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(3000) // 3 second timeout
    });
    
    if (!response.ok) {
      throw new Error(`Ollama API returned ${response.status}: ${response.statusText}`);
    }
    
    return true;
  } catch (error) {
    console.error('Ollama connection error:', error);
    throw new Error(`Failed to connect to Ollama at ${OLLAMA_API_URL}. Is Ollama running?`);
  }
}

// List of available models in order of preference
const AVAILABLE_MODELS = [
  'llama3.1:8b',
  'qwen2.5-coder:1.5b-base',
  'qwen3:latest',
  'deepseek-coder-v2:latest',
];

// Get the first available model
async function getAvailableModel() {
  try {
    const response = await fetch(`${OLLAMA_API_URL}/api/tags`);
    if (!response.ok) throw new Error('Failed to fetch models');
    
    const data = await response.json();
    const installedModels = data.models?.map(m => m.name) || [];
    
    // Find the first available model from our preferred list
    const availableModel = AVAILABLE_MODELS.find(model => 
      installedModels.includes(model)
    );
    
    if (!availableModel) {
      const installedList = installedModels.length > 0 
        ? `Installed models: ${installedModels.join(', ')}` 
        : 'No models installed';
      throw new Error(
        `None of the preferred models are installed. ${installedList}.\n` +
        'Please install one of them using: ollama pull <model-name>'
      );
    }
    
    return availableModel;
  } catch (error) {
    console.error('Error getting available models:', error);
    throw new Error(`Failed to get available models: ${error.message}`);
  }
}

export async function POST(request) {
  try {
    // First verify Ollama is running
    await testOllamaConnection();
    
    const { messages, personalization, model: requestedModel } = await request.json();
    
    // Get the best available model if none specified or if the requested one isn't available
    const model = requestedModel || await getAvailableModel();

    if (!messages) {
      return NextResponse.json(
        { error: 'Messages are required' },
        { status: 400 }
      );
    }

    // Create system message with clear instructions
    let systemContent = [
      'You are a helpful AI assistant.',
      'Respond naturally to the user in a conversational way.',
      'Do not generate code unless explicitly asked.',
      'If the user greets you, respond with a simple, friendly greeting.',
      'Keep responses concise and to the point.'
    ];

    // Add personalization if available
    if (personalization) {
      const { name, profession, traits, additionalInfo } = personalization;
      if (name || profession) {
        systemContent.unshift(`You are chatting with ${name || 'the user'}${profession ? `, who is a ${profession}.` : '.'}`);
      }
      if (traits) {
        systemContent.push(`Your behavior should follow these guidelines: ${traits}`);
      }
      if (additionalInfo) {
        systemContent.push(`Additional context: ${additionalInfo}`);
      }
    }

    const systemMessage = {
      role: 'system',
      content: systemContent.join(' ')
    };

    const modifiedMessages = [
      systemMessage,
      ...messages
    ];

    // Format messages for Ollama with better context handling
    const ollamaMessages = modifiedMessages.map(msg => {
      // Handle different message formats
      let content = '';
      
      if (Array.isArray(msg.content)) {
        // Handle array content (e.g., from images)
        content = msg.content
          .map(item => typeof item === 'string' ? item : item.text || '')
          .filter(Boolean)
          .join('\n');
      } else if (typeof msg.content === 'string') {
        content = msg.content;
      }
      
      // Clean up the content
      content = content.trim();
      
      return {
        role: msg.role,
        content: content
      };
    }).filter(msg => msg.content); // Remove empty messages

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Optimized parameters for faster responses
          const response = await fetch(`${OLLAMA_API_URL}/api/chat`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model,
              messages: ollamaMessages,
              stream: true,
              options: {
                temperature: 0.7,     // Balanced temperature for natural responses
                top_p: 0.9,          // Broader sampling for better quality
                top_k: 40,           // Limit candidates to prevent code generation
                num_ctx: 2048,       // Balanced context window
                num_predict: 500,     // Shorter responses
                repeat_penalty: 1.1,  // Prevent repetition
                num_thread: 4,        // Use available CPU threads
                stop: ['\nUser:', '\n\n', '###', '```'], // Stop on code blocks too
                mirostat: 1,          // Use mirostat 1 for more controlled responses
                mirostat_tau: 4.0,    // Lower tau for more focused responses
                mirostat_eta: 0.05,   // Slower learning rate
              },
            }),
          });

          if (!response.ok) {
            const error = await response.text();
            throw new Error(`Ollama API error: ${error}`);
          }

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
              if (line.trim() === '') continue;
              try {
                const chunk = JSON.parse(line);
                if (chunk.message?.content) {
                  controller.enqueue(
                    `data: ${JSON.stringify({ reply: chunk.message.content })}\n\n`
                  );
                }
              } catch (e) {
                console.error('Error parsing Ollama response:', e);
              }
            }
          }
          
          controller.enqueue('data: [DONE]\n\n');
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(
            `data: ${JSON.stringify({ error: 'Error generating response' })}\n\n`
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in Ollama API route:', error);
    
    // Provide more helpful error messages for common issues
    let errorMessage = error.message || 'Error processing your request';
    let statusCode = 500;
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('Failed to connect')) {
      errorMessage = `Cannot connect to Ollama at ${OLLAMA_API_URL}. Please ensure Ollama is running and accessible.`;
      statusCode = 503; // Service Unavailable
    } else if (error.message.includes('timeout')) {
      errorMessage = 'Connection to Ollama timed out. The server might be busy or not responding.';
      statusCode = 504; // Gateway Timeout
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: statusCode }
    );
  }
}

export async function GET() {
  try {
    // List available models
    const response = await fetch(`${OLLAMA_API_URL}/api/tags`);
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch models: ${error}`);
    }
    
    const data = await response.json();
    return NextResponse.json({
      models: data.models.map(m => ({
        id: m.name,
        name: m.name,
        details: {
          parameter_size: m.details?.parameter_size,
          quantization_level: m.details?.quantization_level,
        },
        modified_at: m.modified_at,
        size: m.size,
      }))
    });
  } catch (error) {
    console.error('Error fetching Ollama models:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch models', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
