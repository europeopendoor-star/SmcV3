import { GoogleGenAI } from '@google/genai';

// In vite.config.ts, process.env.GEMINI_API_KEY is injected into the client bundle
const apiKey = process.env.GEMINI_API_KEY || '';

let ai: GoogleGenAI | null = null;
if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const generatePerformanceReview = async (stats: any): Promise<string> => {
  if (!ai) {
    throw new Error('Gemini API key is not configured.');
  }

  const prompt = `
    You are an expert, institutional-grade Forex trading coach specializing in Smart Money Concepts (SMC) and Sniper entries.
    Analyze the following trading performance data for a trader:

    - Total Trades Taken: ${stats.totalTrades}
    - Overall Win Rate: ${stats.winRate}%
    - Total Pips Caught: ${stats.totalPips > 0 ? '+' : ''}${stats.totalPips}
    - Average Risk-to-Reward (R:R) Ratio: ${stats.avgRR}
    - SMC Trades Taken (Higher Timeframe): ${stats.smcTrades}
    - Sniper Trades Taken (Lower Timeframe Execution): ${stats.sniperTrades}

    Write a concise, professional 3-paragraph performance review.
    1st Paragraph: Analyze their overall profitability and win rate compared to their R:R.
    2nd Paragraph: Comment on their balance of SMC vs. Sniper entries, offering a technical insight.
    3rd Paragraph: Provide one actionable piece of trading psychology advice to maintain consistency.

    Use formatting like bolding to make it readable. Do not use generic pleasantries, be direct and analytical like a prop-firm risk manager.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error: any) {
    console.error("Gemini Error:", error);
    throw new Error(error.message || 'Failed to generate review.');
  }
};
