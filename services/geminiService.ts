import { GoogleGenAI } from "@google/genai";

export async function generatePlanetVisual(description: string): Promise<string> {
  try {
    // Critical: Always initialize a new instance to capture the latest process.env.API_KEY
    // The key is injected dynamically after the user selects it.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          {
            text: `Generate a photorealistic, cinematic 8k image of ${description}. The view should be from orbit, showing the curvature of the planet against the blackness of space. 
            Lighting should be dramatic (chiaroscuro), highlighting surface textures, craters, or clouds. 
            Ensure scientific plausibility while maintaining artistic grandeur. 
            No text or labels overlay.`,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      },
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        const base64EncodeString: string = part.inlineData.data;
        return `data:image/png;base64,${base64EncodeString}`;
      }
    }
    throw new Error("No image data found in response");
  } catch (error) {
    console.error("Image generation error:", error);
    throw error;
  }
}