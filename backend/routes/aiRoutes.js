import express from 'express';
import { generateQuestionExplanation, generateMistakeAnalysis } from '../services/geminiService.js';

const router = express.Router();

/**
 * POST /api/ai/explain
 * Generates an academic explanation for a question and user choice.
 */
router.post('/explain', async (req, res) => {
  try {
    const { questionText, subject, topic, options, correctAnswer, explanation, userChoice } = req.body;

    if (!questionText || !correctAnswer) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: questionText and correctAnswer are mandatory.',
      });
    }

    const result = await generateQuestionExplanation({
      questionText,
      subject,
      topic,
      options,
      correctAnswer,
      explanation: explanation || '',
      userChoice,
    });

    return res.json(result);
  } catch (error) {
    console.error('[AI Route] /explain error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate explanation',
      details: error.message,
    });
  }
});

/**
 * POST /api/ai/mistake-summary
 * Generates high-yield study advice based on error patterns.
 */
router.post('/mistake-summary', async (req, res) => {
  try {
    const { totalMistakes = 0, categories = {}, weakTopics = [] } = req.body;

    const result = await generateMistakeAnalysis({
      totalMistakes,
      categories,
      weakTopics,
    });

    return res.json(result);
  } catch (error) {
    console.error('[AI Route] /mistake-summary error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to generate mistake summary',
      details: error.message,
    });
  }
});

export default router;
