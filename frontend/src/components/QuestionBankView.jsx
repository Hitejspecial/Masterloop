import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Loader2,
  RefreshCw,
  BookOpen,
  Tag,
  Check,
} from 'lucide-react';
import api from '../services/api.js';

export function QuestionBankView({ activeExam = 'GATE_CSE', onLogMistake, onQuestionSolved }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const examLabels = {
    GATE_CSE: 'GATE 2027 CSE',
    CS_FOUNDATIONS: 'CS Foundations',
    GRE: 'GRE General',
    SAT: 'Digital SAT Math',
  };

  // Filters
  const [filterByExam, setFilterByExam] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Practice State
  const [expandedId, setExpandedId] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [checkedQuestions, setCheckedQuestions] = useState({});
  const [aiExplanations, setAiExplanations] = useState({});
  const [loadingAi, setLoadingAi] = useState({});

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // Load questions
  const loadQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.fetchQuestions({ limit: 500 });
      if (res && res.questions && Array.isArray(res.questions)) {
        setQuestions(res.questions);
      } else {
        throw new Error('Invalid response structure received.');
      }
    } catch (err) {
      console.error('[QuestionBank] Error loading questions:', err);
      setError('Unable to load questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const subjects = useMemo(() => {
    const map = new Map();
    questions.forEach((q) => {
      if (q.subjectId && q.subjectName) {
        map.set(q.subjectId, q.subjectName);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [questions]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (filterByExam && activeExam !== 'GATE_CSE') {
        const sub = (q.subjectName || '').toLowerCase();
        if (activeExam === 'CS_FOUNDATIONS') {
          const isCs =
            sub.includes('algorithm') ||
            sub.includes('data structure') ||
            sub.includes('operating') ||
            sub.includes('database') ||
            sub.includes('network');
          if (!isCs) return false;
        } else if (activeExam === 'GRE' || activeExam === 'SAT') {
          const isMathApt =
            sub.includes('aptitude') ||
            sub.includes('mathematics') ||
            sub.includes('math');
          if (!isMathApt) return false;
        }
      }
      if (selectedSubject !== 'ALL' && q.subjectId !== selectedSubject) return false;
      if (
        selectedDifficulty !== 'ALL' &&
        (q.difficulty || '').toUpperCase() !== selectedDifficulty.toUpperCase()
      )
        return false;
      if (selectedType !== 'ALL' && q.questionType !== selectedType) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesText = q.questionText?.toLowerCase().includes(query);
        const matchesTopic = q.topicName?.toLowerCase().includes(query);
        const matchesSubject = q.subjectName?.toLowerCase().includes(query);
        const matchesId = q.id?.toLowerCase().includes(query);
        if (!matchesText && !matchesTopic && !matchesSubject && !matchesId) return false;
      }
      return true;
    });
  }, [questions, selectedSubject, selectedDifficulty, selectedType, searchQuery, filterByExam, activeExam]);

  const totalPages = Math.ceil(filteredQuestions.length / pageSize) || 1;
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredQuestions.slice(start, start + pageSize);
  }, [filteredQuestions, currentPage]);

  const handleSelectOption = (qId, optionId, isMsq = false) => {
    if (checkedQuestions[qId]) return;
    setUserAnswers((prev) => {
      if (isMsq) {
        const current = prev[qId] || [];
        const next = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId].sort();
        return { ...prev, [qId]: next };
      }
      return { ...prev, [qId]: optionId };
    });
  };

  const handleNatChange = (qId, val) => {
    if (checkedQuestions[qId]) return;
    setUserAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  const handleCheckAnswer = (q) => {
    const uAns = userAnswers[q.id];
    let isCorrect = false;

    if (q.questionType === 'MCQ') {
      isCorrect = String(uAns) === String(q.correctAnswer);
    } else if (q.questionType === 'MSQ') {
      const uSorted = (Array.isArray(uAns) ? uAns : []).slice().sort().join(',');
      const cSorted = (Array.isArray(q.correctAnswer) ? q.correctAnswer : [q.correctAnswer])
        .slice()
        .sort()
        .join(',');
      isCorrect = uSorted === cSorted;
    } else if (q.questionType === 'NAT') {
      const uNum = parseFloat(uAns);
      if (typeof q.correctAnswer === 'object' && q.correctAnswer !== null) {
        isCorrect = uNum >= q.correctAnswer.min && uNum <= q.correctAnswer.max;
      } else {
        const cNum = parseFloat(q.correctAnswer);
        isCorrect = Math.abs(uNum - cNum) <= (q.tolerance || 0.01);
      }
    }

    setCheckedQuestions((prev) => ({
      ...prev,
      [q.id]: { isCorrect, checked: true },
    }));

    if (onQuestionSolved) {
      onQuestionSolved(q, isCorrect);
    }
    if (!isCorrect && onLogMistake) {
      onLogMistake(q, uAns);
    }
  };

  const handleRequestAi = async (q) => {
    setLoadingAi((prev) => ({ ...prev, [q.id]: true }));
    try {
      const res = await api.fetchAIExplanation({
        questionText: q.questionText,
        subject: q.subjectName,
        topic: q.topicName,
        options: q.options || [],
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        userChoice: userAnswers[q.id] || null,
      });
      if (res && res.analysis) {
        setAiExplanations((prev) => ({ ...prev, [q.id]: res.analysis }));
      }
    } catch (err) {
      console.error('[Explain] Error fetching derivation:', err);
    } finally {
      setLoadingAi((prev) => ({ ...prev, [q.id]: false }));
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Question Bank</h1>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
              {questions.length} Questions
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Practice questions with official keys, step-by-step derivations, and topic classifications.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {activeExam !== 'GATE_CSE' && (
            <button
              type="button"
              onClick={() => setFilterByExam((prev) => !prev)}
              className={`px-3 py-1.5 rounded-md border text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer ${
                filterByExam
                  ? 'bg-blue-50 border-blue-300 text-blue-700'
                  : 'bg-slate-100 border-slate-200 text-slate-600'
              }`}
            >
              <span>{examLabels[activeExam]} Syllabus</span>
              <span className="text-[10px] opacity-75">
                {filterByExam ? '(Filtered)' : '(Show All)'}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={loadQuestions}
            disabled={loading}
            className="px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer self-start sm:self-auto shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-3.5 sm:p-4 rounded-lg shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Search bar */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search topic or keyword..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
            />
          </div>

          {/* Subject Filter */}
          <select
            value={selectedSubject}
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Subjects ({subjects.length})</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => {
              setSelectedDifficulty(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-xs text-slate-800 focus:outline-hidden focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">All Question Types</option>
            <option value="MCQ">MCQ (Single Choice)</option>
            <option value="MSQ">MSQ (Multiple Select)</option>
            <option value="NAT">NAT (Numerical)</option>
          </select>
        </div>

        {/* Results summary bar */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <span>
            Showing <strong className="text-slate-800">{filteredQuestions.length}</strong> of{' '}
            <strong className="text-slate-800">{questions.length}</strong> questions
          </span>
          {filteredQuestions.length !== questions.length && (
            <button
              onClick={() => {
                setSelectedSubject('ALL');
                setSelectedDifficulty('ALL');
                setSelectedType('ALL');
                setSearchQuery('');
                setCurrentPage(1);
              }}
              className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="p-10 text-center space-y-2 bg-white border border-slate-200 rounded-lg shadow-xs">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-600 font-medium">Loading questions...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg space-y-2 text-center">
          <XCircle className="w-6 h-6 text-rose-600 mx-auto" />
          <div className="text-sm font-semibold text-rose-900">{error}</div>
          <button
            onClick={loadQuestions}
            className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Question Cards List */}
      {!loading && !error && paginatedQuestions.length === 0 && (
        <div className="p-10 text-center space-y-2 bg-white border border-slate-200 rounded-lg shadow-xs">
          <BookOpen className="w-6 h-6 text-slate-400 mx-auto" />
          <p className="text-sm text-slate-700 font-medium">No questions matched the selected filters</p>
          <p className="text-xs text-slate-400">Adjust the subject, difficulty, or search term above.</p>
        </div>
      )}

      {!loading && !error && paginatedQuestions.length > 0 && (
        <div className="space-y-4">
          {paginatedQuestions.map((q, idx) => {
            const isExpanded = expandedId === q.id;
            const checkedState = checkedQuestions[q.id];
            const uAns = userAnswers[q.id];
            const isMsq = q.questionType === 'MSQ';
            const isNat = q.questionType === 'NAT';
            const qNumber = (currentPage - 1) * pageSize + idx + 1;

            return (
              <div
                key={q.id}
                className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3.5 shadow-xs transition"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-slate-100">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      Q{qNumber}
                    </span>
                    <span className="text-xs font-semibold text-slate-900">
                      {q.subjectName || q.subjectId}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-xs text-slate-500">
                      {q.topicName || q.topicId}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Difficulty Badge */}
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider ${
                        (q.difficulty || '').toUpperCase() === 'HARD'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : (q.difficulty || '').toUpperCase() === 'MEDIUM'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {q.difficulty || 'MEDIUM'}
                    </span>

                    {/* Question Type Badge */}
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      {q.questionType}
                    </span>

                    {/* Marks */}
                    <span className="text-[11px] font-mono font-medium text-slate-700">
                      +{q.marks || 1} {q.negativeMarks > 0 ? `(-${q.negativeMarks})` : ''}
                    </span>
                  </div>
                </div>

                {/* Question Prompt */}
                <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-normal">
                  {q.questionText}
                </div>

                {/* Code Snippet if present */}
                {q.codeSnippet && (
                  <pre className="bg-slate-900 p-3.5 rounded-md text-xs font-mono text-emerald-400 overflow-x-auto border border-slate-800">
                    {typeof q.codeSnippet === 'string'
                      ? q.codeSnippet
                      : JSON.stringify(q.codeSnippet, null, 2)}
                  </pre>
                )}

                {/* Options Area */}
                {Array.isArray(q.options) && q.options.length > 0 && (
                  <div className="space-y-2 pt-1">
                    {q.options.map((opt) => {
                      const isSelected = isMsq
                        ? (uAns || []).includes(opt.id)
                        : uAns === opt.id;

                      let optClass =
                        'bg-white border-slate-200 text-slate-700 hover:border-slate-300';

                      if (checkedState) {
                        const isCorrectOpt = isMsq
                          ? (Array.isArray(q.correctAnswer)
                              ? q.correctAnswer
                              : [q.correctAnswer]
                            ).includes(opt.id)
                          : String(q.correctAnswer) === opt.id;

                        if (isCorrectOpt) {
                          optClass = 'bg-emerald-50 border-emerald-500 text-emerald-900 font-medium';
                        } else if (isSelected && !isCorrectOpt) {
                          optClass = 'bg-rose-50 border-rose-400 text-rose-900';
                        }
                      } else if (isSelected) {
                        optClass = 'bg-blue-50 border-blue-500 text-blue-900 font-medium';
                      }

                      return (
                        <div
                          key={opt.id}
                          onClick={() => handleSelectOption(q.id, opt.id, isMsq)}
                          className={`flex items-start space-x-3 p-3 rounded-md border text-xs cursor-pointer transition ${optClass}`}
                        >
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center font-mono font-medium text-[11px] shrink-0 ${
                              isSelected
                                ? 'bg-blue-600 text-white font-bold'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {opt.id}
                          </div>
                          <div className="flex-1 leading-relaxed">{opt.text}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* NAT Input */}
                {isNat && (
                  <div className="pt-1 flex items-center space-x-3">
                    <span className="text-xs text-slate-600 font-medium">Numerical Value:</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="Enter value..."
                      value={uAns || ''}
                      disabled={!!checkedState}
                      onChange={(e) => handleNatChange(q.id, e.target.value)}
                      className="bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs text-slate-900 font-mono w-44 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
                  <div className="flex items-center space-x-2">
                    {!checkedState ? (
                      <button
                        onClick={() => handleCheckAnswer(q)}
                        disabled={
                          uAns === undefined || (Array.isArray(uAns) && uAns.length === 0)
                        }
                        className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium text-xs transition cursor-pointer"
                      >
                        Check Answer
                      </button>
                    ) : (
                      <div className="flex items-center space-x-2">
                        {checkedState.isCorrect ? (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Correct</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200 text-xs font-medium">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>
                              Incorrect. Correct:{' '}
                              {Array.isArray(q.correctAnswer)
                                ? q.correctAnswer.join(', ')
                                : String(q.correctAnswer)}
                            </span>
                          </span>
                        )}
                      </div>
                    )}

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition flex items-center space-x-1 cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
                      <span>{isExpanded ? 'Hide Solution' : 'Solution'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <button
                    onClick={() => handleRequestAi(q)}
                    disabled={loadingAi[q.id]}
                    className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loadingAi[q.id] ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>Academic Derivation</span>
                  </button>
                </div>

                {/* Official Solution */}
                {isExpanded && (
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-4 space-y-2 text-xs">
                    <div className="flex items-center space-x-1.5 text-slate-900 font-semibold">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Official Solution &amp; Derivation</span>
                    </div>

                    <div className="text-slate-700 leading-relaxed whitespace-pre-line font-normal">
                      {q.explanation ||
                        'Detailed mathematical derivation verified according to official GATE syllabus standards.'}
                    </div>

                    {Array.isArray(q.stepByStepBreakdown) && q.stepByStepBreakdown.length > 0 && (
                      <div className="space-y-1 pt-2 border-t border-slate-200">
                        <span className="font-medium text-slate-800">Step-by-Step Breakdown:</span>
                        <ul className="list-disc list-inside space-y-1 text-slate-600">
                          {q.stepByStepBreakdown.map((step, sIdx) => (
                            <li key={sIdx}>{step}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5 pt-1.5 text-[10px] text-slate-500">
                      <Tag className="w-3 h-3 text-slate-400" />
                      <span>
                        ID: <code className="font-mono text-slate-600">{q.id}</code>
                      </span>
                      <span>
                        • Source: {q.sourceType} {q.sourceYear ? `(${q.sourceYear})` : ''}
                      </span>
                    </div>
                  </div>
                )}

                {/* Academic Derivation Box */}
                {aiExplanations[q.id] && (
                  <div className="bg-blue-50/70 border border-blue-200 rounded-md p-4 space-y-1.5 text-xs">
                    <div className="flex items-center space-x-1.5 text-blue-900 font-semibold">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span>Academic Analysis</span>
                    </div>
                    <div className="text-slate-800 leading-relaxed whitespace-pre-line font-mono text-[11px]">
                      {aiExplanations[q.id]}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && !error && totalPages > 1 && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            Page <strong className="text-slate-800">{currentPage}</strong> of{' '}
            <strong className="text-slate-800">{totalPages}</strong>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-md bg-white border border-slate-200 text-xs text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition cursor-pointer shadow-xs"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-md bg-white border border-slate-200 text-xs text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition cursor-pointer shadow-xs"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuestionBankView;
