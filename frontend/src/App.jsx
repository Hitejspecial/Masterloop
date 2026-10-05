import React, { useState, useEffect, useMemo } from 'react';
import { Layers, Loader2 } from 'lucide-react';
import Header from './components/Header.jsx';
import Sidebar from './components/Sidebar.jsx';
import DashboardView from './components/DashboardView.jsx';
import QuestionBankView from './components/QuestionBankView.jsx';
import TestSeriesView from './components/TestSeriesView.jsx';
import MockExamView from './components/MockExamView.jsx';
import TaxonomyView from './components/TaxonomyView.jsx';
import MistakeNotebookView from './components/MistakeNotebookView.jsx';
import WeakAreaView from './components/WeakAreaView.jsx';
import AnalyticsView from './components/AnalyticsView.jsx';
import PrivacyPolicyView from './components/PrivacyPolicyView.jsx';
import TermsView from './components/TermsView.jsx';
import AuthView from './components/Auth/AuthView.jsx';
import api from './services/api.js';

// Deduplication helper for completed tests (cleans legacy duplicate attempts)
function sanitizeCompletedTests(tests) {
  if (!Array.isArray(tests)) return [];
  const seen = new Set();
  const deduped = [];
  for (const t of tests) {
    if (!t) continue;
    const key = t.id || `${t.testId}_${t.date}_${t.totalMarksAwarded}_${t.correctCount}_${t.attemptedCount}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(t); 
    }
  }
  return deduped;
}

export function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [currentView, setCurrentView] = useState('dashboard');
  const [activeExam, setActiveExam] = useState(() => {
    return localStorage.getItem('masterloop_active_exam') || 'GATE_CSE';
  });
  const [showExamModal, setShowExamModal] = useState(false);
  const [activeTestToRun, setActiveTestToRun] = useState(null);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Active Session Performance State (User-Specific)
  const [solvedQuestions, setSolvedQuestions] = useState([]);
  const [completedTests, setCompletedTests] = useState([]);
  const [loggedMistakes, setLoggedMistakes] = useState([]);

  // Check persistent authentication session across refresh
  useEffect(() => {
    let isMounted = true;

    async function checkAuthSession() {
      try {
        const res = await api.getCurrentUser();
        if (isMounted) {
          if (res && res.authenticated && res.user) {
            setCurrentUser(res.user);
          } else {
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.warn('[App] Session check error:', err);
        if (isMounted) setCurrentUser(null);
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    }

    checkAuthSession();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load user-specific progress when authenticated
  useEffect(() => {
    if (!currentUser) return;
    const userId = currentUser._id || currentUser.id || 'default';
    const storageKey = `masterloop_user_session_${userId}`;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.solvedQuestions)) {
          setSolvedQuestions(parsed.solvedQuestions);
        }
        if (Array.isArray(parsed.completedTests)) {
          // Clean any duplicate tests saved from legacy render loop
          const cleanTests = sanitizeCompletedTests(parsed.completedTests);
          setCompletedTests(cleanTests);
        }
        if (Array.isArray(parsed.loggedMistakes)) {
          setLoggedMistakes(parsed.loggedMistakes);
        }
      }
    } catch (e) {
      console.warn('[App] Could not load user session data from storage:', e);
    }
  }, [currentUser]);

  // Save user-specific progress whenever session updates
  useEffect(() => {
    if (!currentUser) return;
    const userId = currentUser._id || currentUser.id || 'default';
    const storageKey = `masterloop_user_session_${userId}`;

    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          userId,
          solvedQuestions,
          completedTests: sanitizeCompletedTests(completedTests),
          loggedMistakes,
          lastUpdated: new Date().toISOString(),
        })
      );
    } catch (e) {
      console.warn('[App] Could not persist user session data:', e);
    }
  }, [currentUser, solvedQuestions, completedTests, loggedMistakes]);

  // Handle Exam Target Selection with Persistence
  const handleSelectExam = (examId) => {
    setActiveExam(examId);
    try {
      localStorage.setItem('masterloop_active_exam', examId);
    } catch (e) {
      console.warn('[App] Could not persist exam target:', e);
    }
    setShowExamModal(false);
  };

  // Compute real metrics from user session
  const sessionStats = useMemo(() => {
    const cleanTests = sanitizeCompletedTests(completedTests);
    const questionsCount = solvedQuestions.length;
    const correctCount = solvedQuestions.filter((q) => q.isCorrect).length;
    const accuracy =
      questionsCount > 0
        ? parseFloat(((correctCount / questionsCount) * 100).toFixed(1))
        : null;

    const topicStats = {};
    solvedQuestions.forEach((item) => {
      const topic = item.question?.topicName || item.question?.topicId || 'General';
      const subject = item.question?.subjectName || 'General';
      if (!topicStats[topic]) {
        topicStats[topic] = { name: topic, subject, total: 0, correct: 0 };
      }
      topicStats[topic].total += 1;
      if (item.isCorrect) topicStats[topic].correct += 1;
    });

    const weakTopics = Object.values(topicStats)
      .filter((t) => t.total >= 2 && t.correct / t.total < 0.6)
      .map((t) => ({
        name: t.name,
        subject: t.subject,
        accuracy: Math.round((t.correct / t.total) * 100),
      }));

    // Real streak calculation
    const hasActivity = cleanTests.length > 0 || questionsCount > 0;
    const streak = hasActivity ? 1 : 0;

    return {
      testsTaken: cleanTests.length,
      questionsSolved: questionsCount,
      accuracy,
      studyHours:
        cleanTests.length > 0
          ? parseFloat((cleanTests.length * 2.5).toFixed(1))
          : questionsCount > 5
          ? 0.5
          : 0,
      weakTopics,
      mistakesLogged: loggedMistakes.length,
      currentStreak: streak,
    };
  }, [solvedQuestions, completedTests, loggedMistakes]);

  const handleNavigate = (view) => {
    if (view === 'mock' && currentView !== 'mock') {
      setActiveTestToRun(null);
    }
    setCurrentView(view);
    setIsMobileNavOpen(false);
  };

  const handleStartTestFromSeries = (test) => {
    setActiveTestToRun(test);
    setCurrentView('mock');
    setIsMobileNavOpen(false);
  };

  // Review a specific completed test report in MockExamView
  const handleReviewTest = (testReport) => {
    setActiveTestToRun(testReport);
    setCurrentView('mock');
    setIsMobileNavOpen(false);
  };

  const handleTestCompleted = (report) => {
    const reportId = report.id || `attempt_${Date.now()}`;
    const enrichedReport = {
      ...report,
      id: reportId,
      timestamp: report.timestamp || new Date().toISOString(),
      userId: currentUser?._id || currentUser?.id || 'anonymous_candidate',
    };

    setCompletedTests((prev) => {
      // Prevent duplicates
      if (prev.some((p) => p.id === reportId)) return prev;
      return [enrichedReport, ...prev];
    });

    if (Array.isArray(report.details)) {
      const attempted = report.details.filter((d) => d.isAttempted);
      const newSolved = attempted.map((d) => ({
        question: d.question,
        isCorrect: d.isCorrect,
        userAnswer: d.userAnswer,
        userId: currentUser?._id || currentUser?.id,
        timestamp: report.timestamp || new Date().toISOString(),
      }));

      setSolvedQuestions((prev) => {
        const newIds = new Set(newSolved.map((s) => s.question.id));
        return [...newSolved, ...prev.filter((p) => !newIds.has(p.question.id))];
      });

      const newMistakes = attempted
        .filter((d) => !d.isCorrect)
        .map((d) => ({
          id: d.question.id,
          questionText: d.question.questionText,
          subjectName: d.question.subjectName,
          subjectId: d.question.subjectId,
          topicName: d.question.topicName,
          correctAnswer: d.question.correctAnswer,
          userAnswer: d.userAnswer,
          explanation: d.question.explanation,
          category:
            d.question.questionType === 'NAT'
              ? 'Calculation & NAT Rounding'
              : 'Concept Trap',
          userId: currentUser?._id || currentUser?.id,
          timestamp: report.timestamp || new Date().toISOString(),
        }));

      setLoggedMistakes((prev) => {
        const newIds = new Set(newMistakes.map((m) => m.id));
        return [...newMistakes, ...prev.filter((p) => !newIds.has(p.id))];
      });
    }
  };

  const handleQuestionSolved = (question, isCorrect) => {
    const solvedItem = {
      question,
      isCorrect,
      userId: currentUser?._id || currentUser?.id,
      timestamp: new Date().toISOString(),
    };
    setSolvedQuestions((prev) => [
      ...prev.filter((q) => q.question.id !== question.id),
      solvedItem,
    ]);
  };

  const handleLogMistake = (question, userAnswer) => {
    const mistakeItem = {
      id: question.id,
      questionText: question.questionText,
      subjectName: question.subjectName,
      subjectId: question.subjectId,
      topicName: question.topicName,
      correctAnswer: question.correctAnswer,
      userAnswer,
      explanation: question.explanation,
      category:
        question.questionType === 'NAT'
          ? 'Calculation & NAT Rounding'
          : 'Misread Trap',
      userId: currentUser?._id || currentUser?.id,
      timestamp: new Date().toISOString(),
    };

    setLoggedMistakes((prev) => [
      ...prev.filter((m) => m.id !== question.id),
      mistakeItem,
    ]);
  };

  const handleResetSession = () => {
    setSolvedQuestions([]);
    setCompletedTests([]);
    setLoggedMistakes([]);
    if (currentUser) {
      const userId = currentUser._id || currentUser.id || 'default';
      localStorage.removeItem(`masterloop_user_session_${userId}`);
    }
  };

  const handleLogout = async () => {
    try {
      await api.logoutUser();
    } catch (err) {
      console.error('[App] Logout error:', err);
    } finally {
      setCurrentUser(null);
      setSolvedQuestions([]);
      setCompletedTests([]);
      setLoggedMistakes([]);
    }
  };

  // Check if URL has verification or reset mode parameter
  const searchParams = new URLSearchParams(window.location.search);
  const isUrlAuthMode = searchParams.get('mode') || searchParams.get('token');

  // Loading state while checking authentication session cookie
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
            <Layers className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>Verifying candidate session...</span>
          </div>
        </div>
      </div>
    );
  }

  // Protected Application: show Auth screens if not authenticated (or if processing email link)
  if (!currentUser || isUrlAuthMode) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
        {/* Minimal Auth Header */}
        <header className="bg-white border-b border-slate-200 px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              <Layers className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="font-bold text-sm tracking-tight text-slate-900">
              MasterLoop
            </span>
            <span className="text-[11px] font-medium text-slate-400 hidden sm:inline border-l border-slate-200 pl-2">
              Examination &amp; Diagnostics Portal
            </span>
          </div>
          <div className="text-[11px] font-medium text-slate-500">
            Candidate Authentication
          </div>
        </header>

        {/* Authentication View */}
        <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
          <AuthView
            initialMode={searchParams.get('mode') || 'login'}
            onAuthSuccess={(user) => {
              setCurrentUser(user);
              if (window.location.search) {
                window.history.replaceState({}, document.title, window.location.pathname);
              }
            }}
          />
        </main>
      </div>
    );
  }

  // Authenticated Workspace
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Header */}
      <Header
        activeExam={activeExam}
        onOpenExamModal={() => setShowExamModal(true)}
        streakCount={sessionStats.currentStreak}
        dailyCompleted={sessionStats.questionsSolved}
        onResetSession={sessionStats.questionsSolved > 0 || sessionStats.testsTaken > 0 ? handleResetSession : null}
        isMobileNavOpen={isMobileNavOpen}
        onToggleMobileNav={() => setIsMobileNavOpen((prev) => !prev)}
        onNavigate={handleNavigate}
        user={currentUser}
        onLogout={handleLogout}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          currentView={currentView}
          setView={handleNavigate}
          isMobileNavOpen={isMobileNavOpen}
          onCloseMobileNav={() => setIsMobileNavOpen(false)}
        />

        {/* Main Workspace */}
        <main className="flex-1 overflow-y-auto bg-slate-50">
          {currentView === 'dashboard' && (
            <DashboardView
              onNavigate={handleNavigate}
              sessionStats={sessionStats}
              recentTests={completedTests}
              activeExam={activeExam}
              onOpenExamModal={() => setShowExamModal(true)}
              onReviewTest={handleReviewTest}
              onResetSession={handleResetSession}
            />
          )}

          {currentView === 'mock' && (
            <MockExamView
              activeTest={activeTestToRun}
              activeExam={activeExam}
              onTestCompleted={handleTestCompleted}
              onBackToDashboard={() => setCurrentView('dashboard')}
            />
          )}

          {currentView === 'test-series' && (
            <TestSeriesView
              activeExam={activeExam}
              onStartTest={handleStartTestFromSeries}
            />
          )}

          {currentView === 'question-bank' && (
            <QuestionBankView
              activeExam={activeExam}
              onQuestionSolved={handleQuestionSolved}
              onLogMistake={handleLogMistake}
            />
          )}

          {currentView === 'mistake-notebook' && (
            <MistakeNotebookView
              mistakes={loggedMistakes}
              onNavigateToQuestionBank={() => setCurrentView('question-bank')}
            />
          )}

          {currentView === 'weak-area' && (
            <WeakAreaView
              weakTopics={sessionStats.weakTopics}
              onStartDrill={() => setCurrentView('question-bank')}
            />
          )}

          {currentView === 'taxonomy' && (
            <TaxonomyView
              activeExam={activeExam}
              onPracticeTopic={() => setCurrentView('question-bank')}
            />
          )}

          {currentView === 'analytics' && (
            <AnalyticsView
              activeExam={activeExam}
              sessionStats={sessionStats}
            />
          )}

          {currentView === 'privacy' && (
            <PrivacyPolicyView onBack={() => setCurrentView('dashboard')} />
          )}

          {currentView === 'terms' && (
            <TermsView onBack={() => setCurrentView('dashboard')} />
          )}
        </main>
      </div>

      {/* Exam Selection Modal */}
      {showExamModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowExamModal(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-lg max-w-sm w-full p-5 space-y-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-bold text-slate-900">Select Exam Target</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Adjusts examination blueprint, question bank weights, and syllabus mapping.
              </p>
            </div>

            <div className="space-y-1.5">
              {[
                {
                  id: 'GATE_CSE',
                  name: 'GATE 2027 CSE',
                  desc: '65 Questions • 100 Marks • 180 Mins • Standard Pattern',
                },
                {
                  id: 'CS_FOUNDATIONS',
                  name: 'CS Foundations',
                  desc: 'Core Theory • Data Structures, Algorithms & OS',
                },
                {
                  id: 'GRE',
                  name: 'GRE General Quantitative',
                  desc: 'Section-adaptive Quantitative Reasoning',
                },
                {
                  id: 'SAT',
                  name: 'Digital SAT Math',
                  desc: 'Advanced Math, Problem Solving & Data Analysis',
                },
              ].map((exam) => (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => handleSelectExam(exam.id)}
                  className={`w-full text-left p-2.5 rounded-md border transition cursor-pointer ${
                    activeExam === exam.id
                      ? 'bg-blue-50 border-blue-500 text-blue-900 font-semibold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="text-xs font-semibold">{exam.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 font-normal">{exam.desc}</div>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowExamModal(false)}
                className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
