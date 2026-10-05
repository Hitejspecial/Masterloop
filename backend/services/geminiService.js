import { GoogleGenAI } from '@google/genai';

let aiClient = null;

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!aiClient && apiKey) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

/**
 * Generate academic explanation for a question using Gemini with deterministic fallback.
 */
export async function generateQuestionExplanation({
  questionText,
  subject,
  topic,
  options = [],
  correctAnswer,
  explanation,
  userChoice,
}) {
  const ai = getGeminiClient();

  if (!ai) {
    return {
      success: true,
      mode: 'deterministic_fallback',
      analysis:
        `Detailed Academic Review:\n\n` +
        `• Topic: ${subject || 'General'} → ${topic || 'Core'}\n` +
        `• Question: ${questionText}\n` +
        `• Correct Answer: ${JSON.stringify(correctAnswer)}\n` +
        (userChoice ? `• Your Selection: ${JSON.stringify(userChoice)}\n` : '') +
        `• Authoritative Solution: ${explanation}\n\n` +
        `Key Takeaway: Review foundational principles and step-by-step mathematical derivation for ${topic || 'this topic'}.`,
    };
  }

  try {
    const prompt =
      `You are an expert exam professor and analytical tutor. Explain this question rigorously, concisely, and academically.\n` +
      `Question: ${questionText}\n` +
      `Options: ${JSON.stringify(options)}\n` +
      `Correct Answer: ${JSON.stringify(correctAnswer)}\n` +
      (userChoice ? `User selected: ${JSON.stringify(userChoice)}\n` : '') +
      `Official Reference Explanation: ${explanation}\n\n` +
      `Explain why the correct answer holds mathematically, logically, or algorithmically. If the candidate selected an incorrect answer, explain the likely underlying conceptual trap. Keep it under 250 words.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return {
      success: true,
      mode: 'gemini',
      analysis: response.text || explanation,
    };
  } catch (error) {
    console.error('[Gemini Service] Explanation generation error:', error);
    return {
      success: true,
      mode: 'deterministic_fallback',
      analysis: `${explanation}\n\n(Note: AI service is currently unavailable. Official reference solution provided above.)`,
    };
  }
}

/**
 * Generate diagnostic advice based on aggregated mistake patterns.
 */
export async function generateMistakeAnalysis({ totalMistakes, categories = {}, weakTopics = [] }) {
  const ai = getGeminiClient();

  if (!ai) {
    const weakList = weakTopics.map((w) => (typeof w === 'string' ? w : w.topicName || w.name)).join(', ');
    return {
      success: true,
      mode: 'deterministic_fallback',
      summary:
        `Diagnostic Summary:\n` +
        `• Total Tracked Errors: ${totalMistakes}\n` +
        `• Dominant Mistake Distribution: ${JSON.stringify(categories)}\n` +
        `• Priority Revision Areas: ${weakList || 'Core Topics'}\n\n` +
        `Target Strategy: Allocate 60% of next week's practice blocks to targeted single-topic problem sets for your lowest accuracy areas.`,
    };
  }

  try {
    const prompt =
      `You are a senior exam prep analytics advisor. Review this candidate's error profile:\n` +
      `Total Mistakes: ${totalMistakes}\n` +
      `Mistake Categories: ${JSON.stringify(categories)}\n` +
      `Weak Topics: ${JSON.stringify(weakTopics)}\n\n` +
      `Provide a 3-bullet, highly actionable, strategic recommendation for their next study sessions. Focus on time allocation, revision techniques, and error prevention. No generic platitudes.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return {
      success: true,
      mode: 'gemini',
      summary: response.text,
    };
  } catch (error) {
    console.error('[Gemini Service] Mistake analysis error:', error);
    return {
      success: true,
      mode: 'deterministic_fallback',
      summary: `Focus on resolving recurring calculation and conceptual mistakes through targeted revision of your lowest scoring topics.`,
    };
  }
}

export default {
  generateQuestionExplanation,
  generateMistakeAnalysis,
};
