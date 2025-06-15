import axios from "axios";
import { NextResponse } from "next/server";

console.log("NVIDIA NIM Environment check:", {
  hasApiKey: !!process.env.NVIDIA_API_KEY,
  keyLength: process.env.NVIDIA_API_KEY?.length,
  nodeEnv: process.env.NODE_ENV,
});

export async function POST(req) {
  try {
    if (!process.env.NVIDIA_API_KEY) {
      return NextResponse.json(
        { error: "NVIDIA API key not configured" },
        { status: 401 }
      );
    }

    const { messages } = await req.json();

    const payload = {
      model: "meta/llama-4-maverick-17b-128e-instruct",
      messages,
      max_tokens: 512,
      temperature: 1.0,
      top_p: 1.0,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
      stream: true, // stream = true, but we buffer and return JSON
    };

    const headers = {
      Authorization: `Bearer ${process.env.NVIDIA_API_KEY}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
    };

    const response = await axios.post(
      "https://integrate.api.nvidia.com/v1/chat/completions",
      payload,
      {
        headers,
        responseType: "stream",
      }
    );

    let fullText = "";

    return await new Promise((resolve, reject) => {
      response.data.on("data", (chunk) => {
        const lines = chunk.toString().split("\n\n");
        for (const line of lines) {
          if (line.trim().startsWith("data: ")) {
            const jsonStr = line.replace("data: ", "").trim();
            if (jsonStr === "[DONE]") {
              resolve(
                NextResponse.json({
                  reply: fullText,
                })
              );
              return;
            }

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed?.choices?.[0]?.delta?.content;
              if (content) fullText += content;
            } catch (err) {
              console.error("JSON parse error:", err);
            }
          }
        }
      });

      response.data.on("end", () => {
        resolve(NextResponse.json({ reply: fullText }));
      });

      response.data.on("error", (err) => {
        console.error("Streaming error:", err);
        reject(
          NextResponse.json(
            { error: err.message || "Stream error" },
            { status: 500 }
          )
        );
      });
    });
  } catch (error) {
    console.error("NVIDIA API error:", error);
    return NextResponse.json(
      {
        error: "Failed to get response from NVIDIA AI assistant",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
