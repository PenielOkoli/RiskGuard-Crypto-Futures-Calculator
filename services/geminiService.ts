import { GoogleGenAI, Type } from "@google/genai";
import { AIAnalysisResult } from "../types";

// Initialize Gemini Client
// We use process.env.API_KEY as per instructions.
const getAiClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Analyzes a TradingView screenshot to extract trade parameters.
 */
export const analyzeChartImage = async (base64Image: string): Promise<AIAnalysisResult> => {
  try {
    const ai = getAiClient();
    
    // We remove the data:image/png;base64, prefix if present for the API call
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, '');

    const prompt = `
      Analyze this trading chart screenshot. 
      Identify if there is a Long or Short position tool visible.
      Extract the specific numerical values for:
      1. Entry Price
      2. Stop Loss Price
      3. Take Profit Price (Target)
      
      If you cannot clearly see a specific value, return null for that field.
      Also provide a very brief reasoning of what you found.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png", // Assuming PNG for simplicity, usually safe for screenshots
              data: cleanBase64
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            entry: { type: Type.NUMBER, description: "The entry price of the trade" },
            stopLoss: { type: Type.NUMBER, description: "The stop loss price level" },
            takeProfit: { type: Type.NUMBER, description: "The take profit or target price level" },
            reasoning: { type: Type.STRING, description: "Brief explanation of what was detected" }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");
    
    return JSON.parse(text) as AIAnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze image. Please try again.");
  }
};

/**
 * Get strategic advice based on the calculated parameters.
 */
export const getTradeAdvice = async (
  risk: number, 
  rr: number, 
  slPercent: number
): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `
      I am planning a crypto futures trade with the following parameters:
      - Risk Amount: $${risk}
      - Risk/Reward Ratio: ${rr.toFixed(2)}
      - Stop Loss Width: ${slPercent.toFixed(2)}%

      Give me a 1-sentence quick assessment of this risk profile. 
      Is the stop loss too tight? Is the R:R favorable?
      Keep it professional and concise.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "Trade parameters look nominal.";
  } catch (error) {
    console.error("Gemini Advice Error:", error);
    return "Unable to fetch AI advice at this time.";
  }
};
