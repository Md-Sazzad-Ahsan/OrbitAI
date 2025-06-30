import axios from "axios";
import { NextResponse } from "next/server";

console.log("NVIDIA NIM Environment check:", {
  hasApiKey: !!process.env.NVIDIA_API_KEY,
  keyLength: process.env.NVIDIA_API_KEY?.length,
  nodeEnv: process.env.NODE_ENV,
});

// Helper: create a stream and controller
function createStream() {
  let controllerRef;
  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
    },
  });
  return { stream, controller: controllerRef };
}

export async function POST(req) {
  try {
    if (!process.env.NVIDIA_API_KEY) {
      return NextResponse.json(
        { error: "NVIDIA API key not configured" },
        { status: 401 }
      );
    }

    const { messages, personalization } = await req.json();

    // Create stream controller
    const { stream, controller } = createStream();
    const encoder = new TextEncoder();

    // Create system message with personalization if available
    let systemMessage = {
      role: "system",
      content: "You are a helpful AI assistant."
    };

    // Add personalization to system message if available
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

    // Prepare payload for NVIDIA
    // NVIDIA expects array of messages with role & content
    const payload = {
      model: "meta/llama-4-maverick-17b-128e-instruct",
      messages: [systemMessage, ...messages],
      max_tokens: 1024,
      temperature: 0.7,
      top_p: 0.9,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      stream: true,
    };

    const headers = {
      Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream", // SSE streaming
    };

    (async () => {
      let controllerClosed = false;
      
      const safeCloseController = () => {
        if (controllerClosed) return;
        controllerClosed = true;
        try {
          controller.close();
        } catch (e) {
          // Ignore errors when closing an already closed controller
          if (!e.message.includes('already closed')) {
            console.error('Error closing controller:', e);
          }
        }
      };

      try {
        const response = await axios.post(
          "https://integrate.api.nvidia.com/v1/chat/completions",
          payload,
          {
            headers,
            responseType: "stream",
          }
        );

        response.data.on("data", (chunk) => {
          if (controllerClosed) return;
          
          try {
            const textChunk = chunk.toString();
            controller.enqueue(encoder.encode(textChunk));
            
            if (textChunk.includes("[DONE]")) {
              safeCloseController();
            }
          } catch (e) {
            console.error('Error processing chunk:', e);
            safeCloseController();
          }
        });

        response.data.on("end", safeCloseController);
        response.data.on("error", (err) => {
          console.error("Stream error:", err);
          if (!controllerClosed) {
            try {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
              );
            } catch (e) {
              console.error('Error enqueuing error message:', e);
            }
            safeCloseController();
          }
        });
      } catch (err) {
        console.error("NVIDIA stream request error:", err);
        if (!controllerClosed) {
          try {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
            );
          } catch (e) {
            console.error('Error enqueuing error message:', e);
          }
          safeCloseController();
        }
      }
    })();

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("NVIDIA API error:", error.response?.data || error.message);
    return NextResponse.json(
      {
        error: "Failed to get response from NVIDIA AI assistant",
        details: error.response?.data || error.message,
      },
      { status: 500 }
    );
  }
}
