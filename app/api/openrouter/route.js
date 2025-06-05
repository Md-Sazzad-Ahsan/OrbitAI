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

    const { messages } = await req.json();
    
    const modifiedMessages = [
      {
        role: "system",
        content: "You are a polite, gentle, and helpful multi-modal assistant. Always respond in clean Markdown format. Try to provide Latest information."
      },
      ...messages
    ];

    const completion = await openai.chat.completions.create({
      messages: modifiedMessages,
      model: "deepseek/deepseek-chat-v3-0324:free",
      stream: false,
      max_tokens: 1000,
      temperature: 0.5
    });

    const responseContent = completion.choices[0]?.message?.content || "No response from assistant.";
    console.log('Generated response length:', responseContent.length);

    return NextResponse.json({ 
      reply: responseContent
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