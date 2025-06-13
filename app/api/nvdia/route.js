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

    const { messages } = await req.json();

    // Create stream controller
    const { stream, controller } = createStream();
    const encoder = new TextEncoder();

    // Prepare payload for NVIDIA
    // NVIDIA expects array of messages with role & content
    const payload = {
      model: "meta/llama-4-maverick-17b-128e-instruct",
      messages: messages,
      max_tokens: 512,
      temperature: 1.0,
      top_p: 1.0,
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
      try {
        const response = await axios.post(
          "https://integrate.api.nvidia.com/v1/chat/completions",
          payload,
          {
            headers,
            responseType: "stream",
          }
        );

        // Listen to data stream chunks
        response.data.on("data", (chunk) => {
          const textChunk = chunk.toString();

          // NVIDIA streams SSE formatted data, forward as-is
          controller.enqueue(encoder.encode(textChunk));

          // Optionally parse and stop if [DONE] received
          if (textChunk.includes("[DONE]")) {
            controller.close();
          }
        });

        response.data.on("end", () => {
          controller.close();
        });

        response.data.on("error", (err) => {
          console.error("Stream error:", err);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
          );
          controller.close();
        });
      } catch (err) {
        console.error("NVIDIA stream request error:", err);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
        );
        controller.close();
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
