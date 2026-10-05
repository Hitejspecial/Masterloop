import express from 'express';
import { Test } from '../models/Test.js';
import { Question } from '../models/Question.js';
import { getConnectionStatus } from '../config/db.js';
import { getLocalTests, getLocalQuestions } from '../services/dataLoader.js';

const router = express.Router();

/**
 * Helper to resolve questions for a test
 */
async function resolveTestQuestions(questionIds, isMongoConnected) {
  if (!questionIds || questionIds.length === 0) return [];

  let questions = [];
  if (isMongoConnected) {
    questions = await Question.find({
      $or: [{ id: { $in: questionIds } }, { sourceId: { $in: questionIds } }],
    }).lean();
  }

  // Fallback to local pool if needed
  if (questions.length < questionIds.length) {
    const localPool = getLocalQuestions();
    const existingIds = new Set(questions.map((q) => q.id));
    for (const qId of questionIds) {
      if (!existingIds.has(qId)) {
        const found = localPool.find((q) => q.id === qId || q.sourceId === qId);
        if (found) {
          questions.push(found);
          existingIds.add(found.id);
        }
      }
    }
  }

  // Preserve order matching questionIds array in test
  const questionMap = new Map();
  questions.forEach((q) => {
    questionMap.set(q.id, q);
    if (q.sourceId) questionMap.set(q.sourceId, q);
  });

  return questionIds.map((id) => questionMap.get(id)).filter(Boolean);
}

/**
 * GET /api/tests
 * List all available tests.
 * Supports filters: testType, targetExam, subjectId
 */
router.get('/', async (req, res) => {
  try {
    const { testType, targetExam, subjectId } = req.query;
    const dbStatus = getConnectionStatus();

    // 1. PRIMARY: MongoDB Atlas
    if (dbStatus.isConnected) {
      const filter = {};
      if (testType) filter.testType = testType;
      if (targetExam) filter.targetExam = targetExam;
      if (subjectId) filter.subjectId = subjectId;

      const tests = await Test.find(filter).lean();
      if (tests.length > 0) {
        return res.json({
          success: true,
          source: 'mongodb',
          count: tests.length,
          tests,
        });
      }
    }

    // 2. FALLBACK: Local JSON
    let localTests = getLocalTests();
    if (testType) localTests = localTests.filter((t) => t.testType === testType);
    if (targetExam) localTests = localTests.filter((t) => t.targetExam === targetExam);
    if (subjectId) localTests = localTests.filter((t) => t.subjectId === subjectId);

    return res.json({
      success: true,
      source: dbStatus.isConnected ? 'mongodb_empty_fallback' : 'fallback_json',
      count: localTests.length,
      tests: localTests,
    });
  } catch (error) {
    console.error('[Test Route] GET / error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch tests',
      details: error.message,
    });
  }
});

/**
 * GET /api/tests/:id
 * Retrieve a specific test by ID.
 * Optional query parameter ?resolveQuestions=true will populate complete question documents.
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { resolveQuestions } = req.query;
    const dbStatus = getConnectionStatus();

    let test = null;
    let source = 'fallback_json';

    if (dbStatus.isConnected) {
      test = await Test.findOne({ id }).lean();
      if (test) source = 'mongodb';
    }

    if (!test) {
      const localTests = getLocalTests();
      test = localTests.find((t) => t.id === id);
    }

    if (!test) {
      return res.status(404).json({
        success: false,
        error: `Test with ID '${id}' not found`,
      });
    }

    // If caller wants questions resolved
    if (resolveQuestions === 'true' || resolveQuestions === '1') {
      const resolved = await resolveTestQuestions(test.questionIds, dbStatus.isConnected);
      return res.json({
        success: true,
        source,
        test: {
          ...test,
          questions: resolved,
        },
      });
    }

    return res.json({
      success: true,
      source,
      test,
    });
  } catch (error) {
    console.error('[Test Route] GET /:id error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch test',
      details: error.message,
    });
  }
});

export default router;
