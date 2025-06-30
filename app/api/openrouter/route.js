import OpenAI from "openai";
import { NextResponse } from "next/server";

// Add debugging for environment variables
console.log("Environment check:", {
  hasApiKey: !!process.env.OPENROUTER_API_KEY,
  keyLength: process.env.OPENROUTER_API_KEY?.length,
  nodeEnv: process.env.NODE_ENV,
});

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "OrbitAI Multi-model Assistant",
    "Content-Type": "application/json",
  },
});

export async function POST(req) {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: "OpenRouter API key not configured" },
        { status: 401 }
      );
    }

    const { messages, personalization } = await req.json();
    
    // Create system message with personalization if available
    let systemMessage = {
      role: "system",
      content: "You are a polite, gentle, and helpful multi-modal assistant.Try to provide Latest information."
    };

    // Add personalization to system message if available
    if (personalization) {
      const { name, profession, traits, additionalInfo } = personalization;
      systemMessage.content = `You are OrbitAI, an AI assistant. You are chatting with ${name || 'the user'}, who is a ${profession || 'professional'}.

Your behavior should follow these guidelines:
${traits || 'Be helpful, accurate, and follow the user\'s instructions.'}`;
      
      if (additionalInfo) {
        systemMessage.content += `

Additional context about the user that you should consider:
${additionalInfo}`;
      }
    }

    const modifiedMessages = [
      systemMessage,
      ...messages
    ];

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const stream = await openai.chat.completions.create({
            messages: modifiedMessages,
            model: "deepseek/deepseek-chat-v3:free",
            stream: true,
            max_tokens: 1024,
            temperature: 0.5
          });

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || '';
            if (content) {
              controller.enqueue(
                `data: ${JSON.stringify({ reply: content })}\n\n`
              );
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
    console.error('OpenRouter API Error:', error);
    return NextResponse.json(
      { 
        error: "Failed to get response from AI assistant",
        details: error.message 
      },
      { status: 500 }
    );
  }
}