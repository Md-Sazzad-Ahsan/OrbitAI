import OpenAI from "openai";
import { NextResponse } from "next/server";

// Helper function to convert file to base64 in Node.js environment
async function fileToBase64(file) {
  const chunks = [];
  const reader = file.stream().getReader();
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  
  // Convert chunks to a single Uint8Array
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  // Convert to base64
  return Buffer.from(result).toString('base64');
}

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "OrbitAI Multi-model Assistant"
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

    let text, image, personalization;

    // Check if the request is multipart/form-data
    if (req.headers.get('content-type')?.includes('multipart/form-data')) {
      const formData = await req.formData();
      text = formData.get('text');
      image = formData.get('image');
      personalization = formData.get('personalization');
    } else {
      // Handle JSON request
      const jsonData = await req.json();
      text = jsonData.messages?.find(m => m.role === 'user')?.content || '';
      personalization = jsonData.personalization;
    }
    
    // Create system message with personalization if available
    let systemMessage = {
      role: "system",
      content: "You are a helpful AI assistant that can understand images. Analyze the provided images carefully and provide detailed, accurate responses."
    };
    
    let userMessage = {
      role: "user",
      content: [
        { type: "text", text: text || "Please analyze this image" }
      ]
    };
    
    // If there's an image, add it to the message
    if (image && typeof image !== 'string') {
      try {
        const base64Image = await fileToBase64(image);
        const mimeType = image.type || 'image/jpeg'; // Default to jpeg if type not available
        
        userMessage.content.push({
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${base64Image}`
          }
        });
      } catch (error) {
        console.error('Error processing image:', error);
        return NextResponse.json(
          { error: "Error processing the uploaded image" },
          { status: 400 }
        );
      }
    }
    
    // Parse personalization if provided
    let parsedPersonalization = null;
    if (personalization) {
      try {
        parsedPersonalization = JSON.parse(personalization);
      } catch (e) {
        console.error('Error parsing personalization:', e);
      }
    }

    // Add personalization to system message if available
    if (parsedPersonalization) {
      const { name, profession, traits, additionalInfo } = parsedPersonalization;
      systemMessage.content = `You are OrbitAI, an AI assistant that can understand images. You are chatting with ${name || 'the user'}, who is a ${profession || 'professional'}.

Your behavior should follow these guidelines:
${traits || 'Be helpful, accurate, and follow the user\'s instructions when analyzing images.'}`;
      
      if (additionalInfo) {
        systemMessage.content += `

Additional context about the user that you should consider:
${additionalInfo}`;
      }
    }

    const modifiedMessages = [
      systemMessage,
      userMessage
    ];

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const apiResponse = await openai.chat.completions.create({
            messages: modifiedMessages,
            model: "google/gemma-3-27b-it:free",
            stream: true,
            max_tokens: 2048,
            temperature: 0.3
          });

          // Handle the stream
          try {
            for await (const chunk of apiResponse) {
              if (!chunk.choices?.length) continue;
              
              const content = chunk.choices[0]?.delta?.content;
              if (content) {
                controller.enqueue(
                  `data: ${JSON.stringify({ reply: content })}\n\n`
                );
              }
            }
            
            controller.enqueue('data: [DONE]\n\n');
            controller.close();
          } catch (streamError) {
            console.error('Stream processing error:', streamError);
            throw streamError;
          }
        } catch (error) {
          console.error('Gemma API Error:', error);
          const errorMessage = error.error?.message || error.message || 'Error generating response';
          controller.enqueue(
            `data: ${JSON.stringify({ error: errorMessage })}\n\n`
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
    console.error('Gemma API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error processing your request' },
      { status: 500 }
    );
  }
}
