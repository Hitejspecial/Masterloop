import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Sparkles,
  Loader2,
  AlertTriangle,
  RotateCcw,
  BookOpen,
} from 'lucide-react';
import api from '../services/api.js';

export function MockExamView({
  activeTest = null,
  activeExam = 'GATE_CSE',
  onTestCompleted,
  onBackToDashboard,
}) {
  const [testData, setTestData] = useState(activeTest);
  const [questions, setQuestions] = useState(activeTest?.questions || []);
  const [loading, setLoading] = useState(!activeTest?.questions?.length);
  const [error, setError] = useState(null);

  // Exam Engine State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [markedForReview, setMarkedForReview] = useState({});
  const [visitedQuestions, setVisitedQuestions] = useState(new Set([0]));
  const [timeLeft, setTimeLeft] = useState(180 * 60); // 180 mins
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [activeSectionId, setActiveSectionId] = useState('ALL');
  const [finalScoreReport, setFinalScoreReport] = useState(null);

  // AI Explanations in Review
  const [aiAnalysis, setAiAnalysis] = useState({});
  const [loadingAi, setLoadingAi] = useState({});

  useEffect(() => {
    let isMounted = true;

    async function initTest() {
      // 1. Check if opening in Review mode (completed test report passed)
      if (activeTest && Array.isArray(activeTest.details) && activeTest.details.length > 0) {
        setTestData(activeTest);
        setQuestions(activeTest.details.map((d) => d.question));
        setFinalScoreReport(activeTest);
        setIsSubmitted(true);
        setLoading(false);
        return;
      }

      // 2. Check if active test paper was provided
      if (activeTest && activeTest.questions && activeTest.questions.length > 0) {
        setTestData(activeTest);
        setQuestions(activeTest.questions);
        setTimeLeft((activeTest.durationMinutes || 180) * 60);
        setIsSubmitted(false);
        setFinalScoreReport(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setIsSubmitted(false);
      setFinalScoreReport(null);

      try {
        const testId = activeTest?.id;
        if (testId) {
          const res = await api.fetchTestById(testId, true);
          if (res && res.test && res.test.questions && res.test.questions.length > 0) {
            if (isMounted) {
              setTestData(res.test);
              setQuestions(res.test.questions);
              setTimeLeft((res.test.durationMinutes || 180) * 60);
            }
            return;
          }
        }

        // Exam Target specific configuration
        let examConfig = {
          examId: 'GATE_CSE',
          limit: 65,
          title: 'GATE CSE 2027 Full Mock Simulation',
          durationMinutes: 180,
          totalMarks: 100,
        };

        if (activeExam === 'CS_FOUNDATIONS') {
          examConfig = {
            examId: 'CS_FOUNDATIONS',
            limit: 35,
            title: 'CS Foundations Comprehensive Assessment',
            durationMinutes: 90,
            totalMarks: 50,
          };
        } else if (activeExam === 'GRE') {
          examConfig = {
            examId: 'GRE',
            limit: 40,
            title: 'GRE General Quantitative Benchmark',
            durationMinutes: 70,
            totalMarks: 80,
          };
        } else if (activeExam === 'SAT') {
          examConfig = {
            examId: 'SAT',
            limit: 44,
            title: 'Digital SAT Math Practice Simulation',
            durationMinutes: 70,
            totalMarks: 800,
          };
        }

        const qRes = await api.fetchQuestions({ limit: 150 });
        if (isMounted && qRes && qRes.questions && qRes.questions.length > 0) {
          let pool = qRes.questions;
          // Filter if subject matching exists
          if (activeExam === 'CS_FOUNDATIONS') {
            const csSubjects = new Set(['Algorithms', 'Data Structures', 'Operating Systems', 'Databases', 'Computer Networks']);
            const csFiltered = pool.filter((q) => csSubjects.has(q.subjectName));
            if (csFiltered.length >= 10) pool = csFiltered;
          } else if (activeExam === 'GRE' || activeExam === 'SAT') {
            const mathSubjects = new Set(['General Aptitude', 'Engineering Mathematics', 'Discrete Mathematics']);
            const mathFiltered = pool.filter((q) => mathSubjects.has(q.subjectName));
            if (mathFiltered.length >= 5) pool = mathFiltered;
          }

          const selectedQuestions = pool.slice(0, examConfig.limit);

          setTestData({
            id: `mock-${activeExam.toLowerCase()}-${Date.now()}`,
            title: examConfig.title,
            durationMinutes: examConfig.durationMinutes,
            totalMarks: examConfig.totalMarks,
          });
          setQuestions(selectedQuestions);
          setTimeLeft(examConfig.durationMinutes * 60);
        } else {
          throw new Error('Unable to load questions. Please check connection and try again.');
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || 'Unable to start mock exam.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initTest();
    return () => {
      isMounted = false;
    };
  }, [activeTest, activeExam]);

  // Countdown Timer
  useEffect(() => {
    if (loading || isSubmitted || timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, isSubmitted, timeLeft]);

  useEffect(() => {
    setVisitedQuestions((prev) => new Set([...prev, currentIndex]));
  }, [currentIndex]);

  const currentQ = questions[currentIndex];

  const sections = useMemo(() => {
    const map = new Map();
    questions.forEach((q) => {
      const sId = q.sectionId || 'gate-cs';
      const sName = q.sectionName || q.subjectName || 'Computer Science & IT';
      map.set(sId, sName);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [questions]);

  // Handle Option Selection
  const handleSelectOption = (optId, isMsq) => {
    if (!currentQ || isSubmitted) return;
    const qId = currentQ.id;

    setUserAnswers((prev) => {
      if (isMsq) {
        const cur = prev[qId] || [];
        const next = cur.includes(optId)
          ? cur.filter((id) => id !== optId)
          : [...cur, optId].sort();
        return { ...prev, [qId]: next };
      }
      return { ...prev, [qId]: optId };
    });
  };

  const handleNatInput = (val) => {
    if (!currentQ || isSubmitted) return;
    setUserAnswers((prev) => ({ ...prev, [currentQ.id]: val }));
  };

  const handleClearResponse = () => {
    if (!currentQ || isSubmitted) return;
    setUserAnswers((prev) => {
      const copy = { ...prev };
      delete copy[currentQ.id];
      return copy;
    });
  };

  const handleToggleMarkForReview = () => {
    if (!currentQ || isSubmitted) return;
    setMarkedForReview((prev) => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id],
    }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Calculate score report cleanly and deterministically
  const calculateScoreReport = () => {
    let totalMarksAwarded = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unattemptedCount = 0;
    const details = [];

    questions.forEach((q) => {
      const uAns = userAnswers[q.id];
      const hasAnswered =
        uAns !== undefined &&
        uAns !== null &&
        (Array.isArray(uAns) ? uAns.length > 0 : String(uAns).trim() !== '');

      let isCorrect = false;
      const marks = Number(q.marks) || 1;
      const negMarks =
        q.negativeMarks !== undefined
          ? Number(q.negativeMarks)
          : q.questionType === 'MCQ'
          ? marks / 3
          : 0;

      if (!hasAnswered) {
        unattemptedCount++;
        details.push({
          question: q,
          userAnswer: null,
          isCorrect: false,
          isAttempted: false,
          score: 0,
        });
        return;
      }

      if (q.questionType === 'MCQ') {
        isCorrect = String(uAns).trim() === String(q.correctAnswer).trim();
      } else if (q.questionType === 'MSQ') {
        const uArr = (Array.isArray(uAns) ? uAns : [uAns]).map(String).sort().join(',');
        const cArr = (Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer])
          .map(String)
          .sort()
          .join(',');
        isCorrect = uArr === cArr;
      } else if (q.questionType === 'NAT') {
        const uVal = parseFloat(uAns);
        if (!isNaN(uVal)) {
          if (typeof q.correctAnswer === 'object' && q.correctAnswer !== null) {
            isCorrect = uVal >= (q.correctAnswer.min ?? 0) && uVal <= (q.correctAnswer.max ?? 0);
          } else {
            const cVal = parseFloat(q.correctAnswer);
            isCorrect = !isNaN(cVal) && Math.abs(uVal - cVal) <= (Number(q.tolerance) || 0.01);
          }
        }
      }

      let qScore = 0;
      if (isCorrect) {
        correctCount++;
        qScore = marks;
      } else {
        incorrectCount++;
        qScore = -negMarks;
      }

      totalMarksAwarded += qScore;
      details.push({
        question: q,
        userAnswer: uAns,
        isCorrect,
        isAttempted: true,
        score: parseFloat(qScore.toFixed(2)),
      });
    });

    const attemptedCount = correctCount + incorrectCount;
    const accuracy =
      attemptedCount > 0 ? parseFloat(((correctCount / attemptedCount) * 100).toFixed(1)) : 0;
    const totalMaxMarks = questions.reduce((acc, q) => acc + (Number(q.marks) || 1), 0);

    return {
      id: `attempt_${Date.now()}`,
      testId: testData?.id || 'mock',
      testTitle: testData?.title || 'Full Mock Exam',
      totalMarksAwarded: parseFloat(Math.max(0, totalMarksAwarded).toFixed(2)),
      totalMaxMarks,
      correctCount,
      incorrectCount,
      unattemptedCount,
      attemptedCount,
      accuracy,
      date: new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
      timestamp: new Date().toISOString(),
      duration: `${testData?.durationMinutes || 180} Min`,
      details,
    };
  };

  // Submit test: execute ONCE, never in render
  const handleSubmitTest = () => {
    setShowSubmitModal(false);
    const report = calculateScoreReport();
    setFinalScoreReport(report);
    setIsSubmitted(true);

    if (onTestCompleted) {
      onTestCompleted(report);
    }
  };

  const handleRequestAi = async (q, uAns) => {
    setLoadingAi((prev) => ({ ...prev, [q.id]: true }));
    try {
      const res = await api.fetchAIExplanation({
        questionText: q.questionText,
        subject: q.subjectName,
        topic: q.topicName,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        userChoice: uAns,
      });
      if (res && res.analysis) {
        setAiAnalysis((prev) => ({ ...prev, [q.id]: res.analysis }));
      }
    } catch (err) {
      console.error('[Explain] Error in review analysis:', err);
    } finally {
      setLoadingAi((prev) => ({ ...prev, [q.id]: false }));
    }
  };

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s
      .toString()
      .padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="p-16 text-center space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
        <h2 className="text-sm font-semibold text-slate-800">Loading Examination Paper...</h2>
        <p className="text-xs text-slate-500">Preparing test questions and syllabus modules...</p>
      </div>
    );
  }

  if (error || !questions.length) {
    return (
      <div className="p-8 max-w-md mx-auto text-center space-y-3 bg-white border border-slate-200 rounded-lg shadow-xs">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
        <h2 className="text-sm font-semibold text-slate-800">Unable to Start Mock Exam</h2>
        <p className="text-xs text-slate-500">{error || 'No questions available.'}</p>
        <button
          onClick={onBackToDashboard}
          className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const scoreReport = finalScoreReport;

  // ==================== SCORECARD / RESULT VIEW ====================
  if (isSubmitted && scoreReport) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        {/* Result Header */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 sm:p-6 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
            <div>
              <span className="text-[10px] font-mono text-blue-700 uppercase tracking-wider bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-semibold">
                Official Examination Scorecard
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1.5">
                {scoreReport.testTitle}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Official Benchmark • Completed {scoreReport.date}
              </p>
            </div>

            <div className="flex items-center space-x-2.5">
              <button
                type="button"
                onClick={() => {
                  setIsSubmitted(false);
                  setFinalScoreReport(null);
                  setUserAnswers({});
                  setMarkedForReview({});
                  setCurrentIndex(0);
                  setTimeLeft((testData?.durationMinutes || 180) * 60);
                }}
                className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>
              <button
                type="button"
                onClick={onBackToDashboard}
                className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition cursor-pointer"
              >
                Dashboard
              </button>
            </div>
          </div>

          {/* Key Score Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-md text-center space-y-0.5">
              <div className="text-[11px] text-slate-500">Final Score</div>
              <div className="text-2xl font-bold text-blue-700 font-mono">
                {scoreReport.totalMarksAwarded}
                <span className="text-xs text-slate-500 font-normal"> / {scoreReport.totalMaxMarks}</span>
              </div>
              <div className="text-[10px] text-slate-400">Score with Negative Marking</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-md text-center space-y-0.5">
              <div className="text-[11px] text-slate-500">Accuracy</div>
              <div className="text-2xl font-bold text-slate-800 font-mono">{scoreReport.accuracy}%</div>
              <div className="text-[10px] text-slate-500">
                {scoreReport.correctCount} of {scoreReport.attemptedCount} Attempted
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-md text-center space-y-0.5">
              <div className="text-[11px] text-slate-500">Correct / Incorrect</div>
              <div className="text-2xl font-bold text-slate-800 font-mono flex items-center justify-center space-x-1.5">
                <span className="text-emerald-600">{scoreReport.correctCount}</span>
                <span className="text-slate-400">/</span>
                <span className="text-rose-600">{scoreReport.incorrectCount}</span>
              </div>
              <div className="text-[10px] text-slate-500">{scoreReport.unattemptedCount} Unattempted</div>
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-md text-center space-y-0.5">
              <div className="text-[11px] text-slate-500">Status</div>
              <div className="text-sm font-semibold text-slate-800 mt-1">Completed</div>
              <div className="text-[10px] text-slate-400">Saved to session</div>
            </div>
          </div>
        </div>

        {/* Detailed Question Review List */}
        <div className="space-y-3.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Question Solutions &amp; Derivations ({questions.length})</span>
            </h2>
            <span className="text-xs text-slate-500">Review derivations for each question</span>
          </div>

          <div className="space-y-3.5">
            {scoreReport.details.map((item, idx) => {
              const q = item.question;
              const hasAi = !!aiAnalysis[q.id];

              return (
                <div
                  key={q.id}
                  className={`bg-white border rounded-lg p-4 sm:p-5 space-y-3 shadow-xs transition ${
                    item.isCorrect
                      ? 'border-emerald-200'
                      : item.isAttempted
                      ? 'border-rose-200'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                        Q{idx + 1}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">
                        {q.subjectName || q.subjectId}
                      </span>
                      <span className="text-slate-400">•</span>
                      <span className="text-xs text-slate-500">{q.topicName || q.topicId}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      {item.isCorrect ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Correct (+{item.score})</span>
                        </span>
                      ) : item.isAttempted ? (
                        <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium flex items-center space-x-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Incorrect ({item.score})</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-xs font-medium flex items-center space-x-1">
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                          <span>Unattempted (0)</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Text */}
                  <div className="text-xs sm:text-sm text-slate-900 leading-relaxed whitespace-pre-line font-normal select-text">
                    {q.questionText}
                  </div>

                  {/* Code snippet if present */}
                  {q.codeSnippet && (
                    <pre className="bg-slate-900 p-3 rounded-md text-xs font-mono text-emerald-400 overflow-x-auto border border-slate-800">
                      {typeof q.codeSnippet === 'string'
                        ? q.codeSnippet
                        : JSON.stringify(q.codeSnippet, null, 2)}
                    </pre>
                  )}

                  {/* Answer Summary Comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 rounded bg-slate-50 border border-slate-200">
                      <span className="text-slate-500 font-medium">Your Response: </span>
                      <span
                        className={`font-semibold font-mono ${
                          item.isCorrect
                            ? 'text-emerald-700'
                            : item.isAttempted
                            ? 'text-rose-700'
                            : 'text-slate-500'
                        }`}
                      >
                        {item.userAnswer !== null && item.userAnswer !== undefined
                          ? Array.isArray(item.userAnswer)
                            ? item.userAnswer.join(', ')
                            : String(item.userAnswer)
                          : 'Not Attempted'}
                      </span>
                    </div>

                    <div className="p-2.5 rounded bg-emerald-50/60 border border-emerald-200 text-emerald-900">
                      <span className="text-emerald-700 font-medium">Correct Key: </span>
                      <span className="font-bold font-mono">
                        {typeof q.correctAnswer === 'object' && q.correctAnswer !== null
                          ? `${q.correctAnswer.min} to ${q.correctAnswer.max}`
                          : Array.isArray(q.correctAnswer)
                          ? q.correctAnswer.join(', ')
                          : String(q.correctAnswer)}
                      </span>
                    </div>
                  </div>

                  {/* Official Explanation */}
                  <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-md text-xs space-y-1.5">
                    <div className="font-semibold text-slate-800 flex items-center space-x-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      <span>Official Solution &amp; Derivation:</span>
                    </div>
                    <p className="text-slate-600 whitespace-pre-line text-xs leading-relaxed">
                      {q.explanation || 'No step-by-step derivation provided for this item.'}
                    </p>
                  </div>

                  {/* Request AI Explanation */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRequestAi(q, item.userAnswer)}
                      disabled={loadingAi[q.id]}
                      className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer"
                    >
                      {loadingAi[q.id] ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                      )}
                      <span>{hasAi ? 'Update Academic Derivation' : 'Academic Derivation'}</span>
                    </button>
                  </div>

                  {hasAi && (
                    <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-md text-xs space-y-1 font-mono text-slate-800">
                      <div className="text-blue-900 font-semibold mb-1">Academic Analysis:</div>
                      <p className="whitespace-pre-line text-[11px] leading-relaxed">{aiAnalysis[q.id]}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ==================== ACTIVE TEST ENVIRONMENT ====================
  const uAnswer = userAnswers[currentQ?.id];
  const isMsq = currentQ?.questionType === 'MSQ';
  const isNat = currentQ?.questionType === 'NAT';
  const isMarked = markedForReview[currentQ?.id];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col bg-slate-50 text-slate-900 select-none">
      {/* Test Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-xs sm:text-sm font-bold text-slate-900">
            {testData?.title || 'GATE CSE 2027 Full Mock Simulation'}
          </h1>
          <div className="flex items-center space-x-1.5 mt-1">
            <button
              type="button"
              onClick={() => setActiveSectionId('ALL')}
              className={`text-[10px] px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                activeSectionId === 'ALL'
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'text-slate-600 hover:text-slate-900 bg-slate-100'
              }`}
            >
              All Sections
            </button>
            {sections.map((sec) => (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSectionId(sec.id)}
                className={`text-[10px] px-2 py-0.5 rounded font-medium transition cursor-pointer ${
                  activeSectionId === sec.id
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'text-slate-600 hover:text-slate-900 bg-slate-100'
                }`}
              >
                {sec.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Countdown Clock */}
          <div className="flex items-center space-x-1.5 bg-slate-100 border border-slate-200 px-3 py-1 rounded-md font-mono text-xs">
            <Clock
              className={`w-3.5 h-3.5 ${timeLeft < 300 ? 'text-rose-600' : 'text-blue-600'}`}
            />
            <span className="font-bold text-slate-900 tracking-widest">{formatTime(timeLeft)}</span>
          </div>

          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition cursor-pointer shadow-xs"
          >
            Submit Test
          </button>
        </div>
      </header>

      {/* Main Examination Workspace */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Question Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 flex flex-col justify-between space-y-6 bg-white">
          <div className="space-y-4 max-w-3xl">
            {/* Header: Question Number, Section, Marks */}
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span className="text-slate-400">•</span>
                <span className="text-xs text-slate-600 font-medium">
                  {currentQ?.subjectName} — {currentQ?.topicName}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-slate-700 font-medium">+{currentQ?.marks || 1}</span>
                {currentQ?.negativeMarks > 0 && (
                  <span className="text-xs font-mono text-rose-600 font-medium">-{currentQ?.negativeMarks}</span>
                )}
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">
                  {currentQ?.questionType}
                </span>
              </div>
            </div>

            {/* Question Text */}
            <div className="text-xs sm:text-sm text-slate-900 leading-relaxed whitespace-pre-line font-normal select-text">
              {currentQ?.questionText}
            </div>

            {/* Code Snippet if present */}
            {currentQ?.codeSnippet && (
              <pre className="bg-slate-900 p-3.5 rounded-md text-xs font-mono text-emerald-400 overflow-x-auto border border-slate-800">
                {typeof currentQ.codeSnippet === 'string'
                  ? currentQ.codeSnippet
                  : JSON.stringify(currentQ.codeSnippet, null, 2)}
              </pre>
            )}

            {/* MCQ / MSQ Options */}
            {Array.isArray(currentQ?.options) && currentQ.options.length > 0 && (
              <div className="space-y-2 pt-1">
                {currentQ.options.map((opt) => {
                  const isSelected = isMsq
                    ? (uAnswer || []).includes(opt.id)
                    : uAnswer === opt.id;

                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectOption(opt.id, isMsq)}
                      className={`flex items-start space-x-3 p-3 rounded-md border text-xs cursor-pointer transition ${
                        isSelected
                          ? 'bg-blue-50 border-blue-500 text-blue-900 font-medium'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center font-mono font-medium text-[11px] shrink-0 ${
                          isSelected ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {opt.id}
                      </div>
                      <div className="flex-1 leading-relaxed select-text">{opt.text}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* NAT Input */}
            {isNat && (
              <div className="pt-2 bg-slate-50 p-4 rounded-md border border-slate-200 max-w-sm space-y-2">
                <label className="text-xs text-slate-700 font-medium">Numerical Answer:</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="Enter value..."
                    value={uAnswer || ''}
                    onChange={(e) => handleNatInput(e.target.value)}
                    className="bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-900 font-mono w-full focus:outline-hidden focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleClearResponse}
                    className="px-2.5 py-1.5 rounded-md bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-medium whitespace-nowrap cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-4 border-t border-slate-100">
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleToggleMarkForReview}
                className={`px-3 py-1.5 rounded-md border text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer ${
                  isMarked
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${isMarked ? 'fill-indigo-600 text-indigo-600' : 'text-slate-400'}`} />
                <span>{isMarked ? 'Marked for Review' : 'Mark for Review'}</span>
              </button>

              <button
                type="button"
                onClick={handleClearResponse}
                disabled={uAnswer === undefined}
                className="px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium transition cursor-pointer"
              >
                Clear Response
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-3 py-1.5 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium flex items-center space-x-1 transition cursor-pointer shadow-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>

              {currentIndex === questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  className="px-4 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
                >
                  <span>Submit Exam</span>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-4 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center space-x-1 transition cursor-pointer shadow-xs"
                >
                  <span>Save &amp; Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Palette */}
        <aside className="w-full lg:w-72 border-t lg:border-t-0 lg:border-l border-slate-200 bg-slate-50 p-4 flex flex-col justify-between shrink-0 space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <span className="text-xs font-bold text-slate-900">Question Palette</span>
              <span className="text-[11px] font-mono text-slate-600">
                {Object.keys(userAnswers).length} / {questions.length} Answered
              </span>
            </div>

            {/* Official Legend */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600 bg-white p-2.5 rounded-md border border-slate-200">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                <span>Answered</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-600 inline-block" />
                <span>Marked</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-rose-600 inline-block" />
                <span>Not Answered</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-200 inline-block" />
                <span>Not Visited</span>
              </div>
            </div>

            {/* Question Number Buttons */}
            <div className="grid grid-cols-5 gap-1.5 max-h-80 overflow-y-auto pr-0.5">
              {questions.map((q, idx) => {
                const isCur = idx === currentIndex;
                const ans = userAnswers[q.id];
                const hasAnswer =
                  ans !== undefined &&
                  (Array.isArray(ans) ? ans.length > 0 : String(ans).trim() !== '');
                const isM = markedForReview[q.id];
                const isVisited = visitedQuestions.has(idx);

                let btnBg = 'bg-slate-200 text-slate-700 border-slate-300';

                if (hasAnswer && isM) {
                  btnBg = 'bg-indigo-700 text-white font-medium border-indigo-800';
                } else if (hasAnswer) {
                  btnBg = 'bg-emerald-600 text-white font-medium border-emerald-700';
                } else if (isM) {
                  btnBg = 'bg-indigo-600 text-white font-medium border-indigo-700';
                } else if (isVisited) {
                  btnBg = 'bg-rose-600 text-white font-medium border-rose-700';
                }

                if (isCur) {
                  btnBg += ' ring-2 ring-blue-600 ring-offset-1 ring-offset-slate-50';
                }

                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-8 rounded border text-xs font-mono flex items-center justify-center transition cursor-pointer ${btnBg}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition cursor-pointer shadow-xs"
            >
              Submit Test Paper
            </button>
          </div>
        </aside>
      </div>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowSubmitModal(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-lg max-w-sm w-full p-5 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-slate-900">Confirm Test Submission</h3>
            <p className="text-xs text-slate-500">
              Submit test paper and finalize score calculations?
            </p>

            <div className="grid grid-cols-3 gap-2 text-center text-xs py-1">
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200">
                <span className="text-slate-500 text-[10px]">Answered</span>
                <div className="font-bold text-emerald-600 text-base font-mono mt-0.5">
                  {Object.keys(userAnswers).length}
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200">
                <span className="text-slate-500 text-[10px]">Marked</span>
                <div className="font-bold text-indigo-600 text-base font-mono mt-0.5">
                  {Object.values(markedForReview).filter(Boolean).length}
                </div>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200">
                <span className="text-slate-500 text-[10px]">Unanswered</span>
                <div className="font-bold text-slate-700 text-base font-mono mt-0.5">
                  {questions.length - Object.keys(userAnswers).length}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Continue Test
              </button>
              <button
                type="button"
                onClick={handleSubmitTest}
                className="flex-1 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition cursor-pointer shadow-xs"
              >
                Submit Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MockExamView;
