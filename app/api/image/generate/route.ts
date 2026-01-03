import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key not configured" },
        { status: 500 }
      );
    }

    const ai = new GoogleGenAI({ apiKey });
    const imageModel =
      process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

    const response = await ai.models.generateContent({
      model: imageModel,
      contents: prompt,
      config: {
        responseModalities: ["Text", "Image"],
      },
    });

    if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const mimeType = part.inlineData.mimeType || "image/png";
          return NextResponse.json({
            imageUrl: `data:${mimeType};base64,${part.inlineData.data}`,
          });
        }
      }
    }

    return NextResponse.json({ error: "No image generated" }, { status: 500 });
  } catch (error) {
    console.error("Image generation failed:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Image generation failed";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
