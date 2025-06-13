import { OpenAI } from "openai";
import { NextResponse } from "next/server";

// Add debugging for environment variables
console.log("HuggingFace Environment check:", {
  hasApiKey: !!process.env.HUGGINGFACE_API_KEY,
  keyLength: process.env.HUGGINGFACE_API_KEY?.length,
  nodeEnv: process.env.NODE_ENV,
});

// Create a text encoder for streaming responses
const encoder = new TextEncoder();

// Create a simple stream controller
function createStream() {
  let streamController;
  const stream = new ReadableStream({
    start(controller) {
      streamController = controller;
    },
  });
  return { stream, controller: streamController };
}

export async function POST(req) {
  try {
    if (!process.env.HUGGINGFACE_API_KEY) {
      return NextResponse.json(
        { error: "HuggingFace API key not configured" },
        { status: 401 }
      );
    }

    const { messages } = await req.json();
    
    // Create a stream for the response
    const { stream, controller } = createStream();
    
    // Process the request asynchronously
    (async () => {
      try {
        const client = new OpenAI({
          baseURL: "https://router.huggingface.co/nebius/v1",
          apiKey: process.env.HUGGINGFACE_API_KEY,
        });

        console.log("Sending streaming request to HuggingFace Nebius API");
        
        // Use streaming for faster response
        const completion = await client.chat.completions.create({
          model: "deepseek-ai/DeepSeek-R1-0528",
          messages: [
            {
              role: "system",
              content: "You are a polite, gentle, and helpful AI assistant"+"Always respond in short and clean Markdown format."+"Do not include thinking tags like <think>, </think>"
            },
            ...messages
          ],
          stream: true,  // Enable streaming
          temperature: 0.5,
          max_tokens: 1000,
        });

        // Stream the response
        let fullResponse = '';
        for await (const chunk of completion) {
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullResponse += content;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ reply: content })}\n\n`));
          }
        }
        
        console.log("Completed streaming response from HuggingFace Nebius API");
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
        
      } catch (error) {
        console.error("Streaming error:", error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`));
        controller.close();
      }
    })();

    // Return the streaming response
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error("HuggingFace API error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate response" },
      { status: 500 }
    );
  }
}
