import express from 'express';
import { Question } from '../models/Question.js';
import { getConnectionStatus } from '../config/db.js';
import { getLocalQuestions } from '../services/dataLoader.js';

const router = express.Router();

/**
 * Filter an in-memory array of questions (used for robust fallback mode)
 */
function filterInMemoryQuestions(questions, query) {
  const {
    examId,
    exam,
    subjectId,
    subject,
    topicId,
    topic,
    subtopicId,
    difficulty,
    questionType,
    type,
    sourceType,
    ids,
    search,
    limit = 500,
    skip = 0,
  } = query;

  const targetExam = examId || exam;
  const targetSubject = subjectId || subject;
  const targetTopic = topicId || topic;
  const targetType = questionType || type;

  let filtered = [...questions];

  if (targetExam && targetExam !== 'ALL') {
    filtered = filtered.filter((q) => (q.examId || 'GATE_CSE') === targetExam);
  }
  if (targetSubject && targetSubject !== 'ALL') {
    filtered = filtered.filter((q) => q.subjectId === targetSubject);
  }
  if (targetTopic && targetTopic !== 'ALL') {
    filtered = filtered.filter((q) => q.topicId === targetTopic);
  }
  if (subtopicId && subtopicId !== 'ALL') {
    filtered = filtered.filter((q) => q.subtopicId === subtopicId);
  }
  if (difficulty && difficulty !== 'ALL') {
    filtered = filtered.filter((q) => (q.difficulty || '').toUpperCase() === difficulty.toUpperCase());
  }
  if (targetType && targetType !== 'ALL') {
    filtered = filtered.filter((q) => q.questionType === targetType);
  }
  if (sourceType && sourceType !== 'ALL') {
    filtered = filtered.filter((q) => q.sourceType === sourceType);
  }
  if (ids) {
    const idList = typeof ids === 'string' ? ids.split(',').map((s) => s.trim()) : ids;
    const idSet = new Set(idList);
    filtered = filtered.filter((q) => idSet.has(q.id) || (q.sourceId && idSet.has(q.sourceId)));
  }
  if (search) {
    const term = search.toLowerCase();
    filtered = filtered.filter(
      (q) =>
        (q.questionText && q.questionText.toLowerCase().includes(term)) ||
        (q.explanation && q.explanation.toLowerCase().includes(term)) ||
        (q.topicName && q.topicName.toLowerCase().includes(term))
    );
  }

  const total = filtered.length;
  const paged = filtered.slice(Number(skip), Number(skip) + Number(limit));

  return { total, questions: paged };
}

/**
 * GET /api/questions
 * Primary Question API endpoint.
 * Returns questions from MongoDB Atlas when connected, or fallback JSON dataset if offline.
 */
router.get('/', async (req, res) => {
  try {
    const {
      examId,
      exam,
      subjectId,
      subject,
      topicId,
      topic,
      subtopicId,
      difficulty,
      questionType,
      type,
      sourceType,
      ids,
      search,
      limit = 500,
      skip = 0,
    } = req.query;

    const dbStatus = getConnectionStatus();

    // 1. PRIMARY PATH: MongoDB Atlas
    if (dbStatus.isConnected) {
      const filter = {};

      const targetExam = examId || exam;
      const targetSubject = subjectId || subject;
      const targetTopic = topicId || topic;
      const targetType = questionType || type;

      if (targetExam && targetExam !== 'ALL') filter.examId = targetExam;
      if (targetSubject && targetSubject !== 'ALL') filter.subjectId = targetSubject;
      if (targetTopic && targetTopic !== 'ALL') filter.topicId = targetTopic;
      if (subtopicId && subtopicId !== 'ALL') filter.subtopicId = subtopicId;
      if (difficulty && difficulty !== 'ALL') filter.difficulty = difficulty.toUpperCase();
      if (targetType && targetType !== 'ALL') filter.questionType = targetType;
      if (sourceType && sourceType !== 'ALL') filter.sourceType = sourceType;

      if (ids) {
        const idList = typeof ids === 'string' ? ids.split(',').map((s) => s.trim()) : ids;
        filter.$or = [{ id: { $in: idList } }, { sourceId: { $in: idList } }];
      }

      if (search) {
        filter.$text = { $search: search };
      }

      const total = await Question.countDocuments(filter);
      const questions = await Question.find(filter)
        .skip(Number(skip))
        .limit(Number(limit))
        .lean();

      // If MongoDB is connected and populated, return the primary data
      if (questions.length > 0 || (total === 0 && Object.keys(filter).length > 0)) {
        return res.json({
          success: true,
          source: 'mongodb',
          total,
          count: questions.length,
          questions,
        });
      }
    }

    // 2. FALLBACK PATH: Cached Local JSON Dataset (145 Questions)
    const localPool = getLocalQuestions();
    const { total, questions } = filterInMemoryQuestions(localPool, req.query);

    return res.json({
      success: true,
      source: dbStatus.isConnected ? 'mongodb_empty_fallback' : 'fallback_json',
      total,
      count: questions.length,
      questions,
      notice: dbStatus.isConnected
        ? 'MongoDB collection is empty. Run npm run seed to populate.'
        : 'MongoDB is offline. Serving complete 145-question JSON repository seamlessly.',
    });
  } catch (error) {
    console.error('[Question Route] GET / error:', error);
    // On unexpected query error, return local fallback safely
    try {
      const localPool = getLocalQuestions();
      const { total, questions } = filterInMemoryQuestions(localPool, req.query);
      return res.json({
        success: true,
        source: 'resilient_fallback_on_error',
        total,
        count: questions.length,
        questions,
      });
    } catch {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve questions',
        details: error.message,
      });
    }
  }
});

/**
 * GET /api/questions/:id
 * Retrieve a single question by its logical ID.
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const dbStatus = getConnectionStatus();

    if (dbStatus.isConnected) {
      const question = await Question.findOne({
        $or: [{ id }, { sourceId: id }],
      }).lean();

      if (question) {
        return res.json({
          success: true,
          source: 'mongodb',
          question,
        });
      }
    }

    // Fallback search in local JSON
    const localPool = getLocalQuestions();
    const found = localPool.find((q) => q.id === id || q.sourceId === id);

    if (found) {
      return res.json({
        success: true,
        source: 'fallback_json',
        question: found,
      });
    }

    return res.status(404).json({
      success: false,
      error: `Question with ID '${id}' not found`,
    });
  } catch (error) {
    console.error('[Question Route] GET /:id error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve question',
      details: error.message,
    });
  }
});

/**
 * POST /api/questions/resolve
 * Resolve a list of questionIds to full question documents.
 */
router.post('/resolve', async (req, res) => {
  try {
    const { questionIds } = req.body;
    if (!Array.isArray(questionIds)) {
      return res.status(400).json({ success: false, error: 'questionIds array required' });
    }

    const dbStatus = getConnectionStatus();
    let questions = [];

    if (dbStatus.isConnected) {
      questions = await Question.find({
        $or: [{ id: { $in: questionIds } }, { sourceId: { $in: questionIds } }],
      }).lean();
    }

    // Fill any missing from local pool
    if (questions.length < questionIds.length) {
      const localPool = getLocalQuestions();
      const existingIds = new Set(questions.map((q) => q.id));
      for (const qId of questionIds) {
        if (!existingIds.has(qId)) {
          const match = localPool.find((q) => q.id === qId || q.sourceId === qId);
          if (match) {
            questions.push(match);
            existingIds.add(match.id);
          }
        }
      }
    }

    return res.json({
      success: true,
      count: questions.length,
      questions,
    });
  } catch (error) {
    console.error('[Question Route] POST /resolve error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
