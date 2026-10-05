import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  Database,
  Loader2,
} from 'lucide-react';
import api from '../services/api.js';

export function AnalyticsView({ sessionStats = {} }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const res = await api.fetchQuestions({ limit: 500 });
        if (isMounted && res && res.questions) {
          setQuestions(res.questions);
        }
      } catch (err) {
        console.error('[Analytics] Error loading questions:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const subjectDistribution = useMemo(() => {
    const counts = {};
    questions.forEach((q) => {
      const name = q.subjectName || q.subjectId || 'Other';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [questions]);

  const difficultyDistribution = useMemo(() => {
    const counts = { EASY: 0, MEDIUM: 0, HARD: 0 };
    questions.forEach((q) => {
      const diff = (q.difficulty || 'MEDIUM').toUpperCase();
      counts[diff] = (counts[diff] || 0) + 1;
    });
    return counts;
  }, [questions]);

  const typeDistribution = useMemo(() => {
    const counts = { MCQ: 0, MSQ: 0, NAT: 0 };
    questions.forEach((q) => {
      const t = q.questionType || 'MCQ';
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [questions]);

  const {
    testsTaken = 0,
    questionsSolved = 0,
    accuracy = null,
    studyHours = 0,
  } = sessionStats;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="pb-2 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Subject &amp; Performance Analytics</h1>
          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
            Repository Insights
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Detailed metrics across syllabus subjects, question formats, and session test records.
        </p>
      </div>

      {/* User Session Analytics Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
          <span>Active Session Metrics</span>
        </h2>

        {questionsSolved === 0 && testsTaken === 0 ? (
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-md text-center">
            <p className="text-xs text-slate-500">
              No examination attempts recorded yet in this session. Take a Mock Test or practice in Question Bank to generate real accuracy, speed, and topic mastery charts.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-mono font-medium">Accuracy</span>
              <div className="text-xl font-bold text-blue-700 font-mono mt-0.5">
                {accuracy !== null ? `${accuracy}%` : 'N/A'}
              </div>
            </div>
            <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-mono font-medium">Questions Solved</span>
              <div className="text-xl font-bold text-slate-800 font-mono mt-0.5">{questionsSolved}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-mono font-medium">Mocks Submitted</span>
              <div className="text-xl font-bold text-slate-800 font-mono mt-0.5">{testsTaken}</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-md border border-slate-200">
              <span className="text-[10px] text-slate-500 uppercase font-mono font-medium">Practice Time</span>
              <div className="text-xl font-bold text-slate-800 font-mono mt-0.5">{studyHours} hrs</div>
            </div>
          </div>
        )}
      </div>

      {/* Distribution */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            <span>Question Distribution ({questions.length} Questions)</span>
          </h2>
          <span className="text-[11px] text-slate-500">Verified Questions</span>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Subject Distribution */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3.5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Questions per Subject
              </h3>

              <div className="space-y-2.5">
                {subjectDistribution.map(([subj, count]) => {
                  const percent = ((count / (questions.length || 1)) * 100).toFixed(0);
                  return (
                    <div key={subj} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-800">{subj}</span>
                        <span className="font-mono text-slate-500">
                          {count} ({percent}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full bg-blue-600"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Type & Difficulty Distribution */}
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Question Format Breakdown
                </h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs bg-slate-50 p-2 rounded-md border border-slate-200">
                    <span className="text-slate-700">MCQ (Single Choice)</span>
                    <span className="font-mono font-semibold text-slate-900">{typeDistribution.MCQ || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs bg-slate-50 p-2 rounded-md border border-slate-200">
                    <span className="text-slate-700">MSQ (Multiple Select)</span>
                    <span className="font-mono font-semibold text-slate-900">{typeDistribution.MSQ || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs bg-slate-50 p-2 rounded-md border border-slate-200">
                    <span className="text-slate-700">NAT (Numerical Answer Type)</span>
                    <span className="font-mono font-semibold text-slate-900">{typeDistribution.NAT || 0}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Difficulty Levels
                </h3>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs bg-slate-50 p-2 rounded-md border border-slate-200">
                    <span className="text-emerald-700 font-medium">Easy</span>
                    <span className="font-mono font-semibold text-slate-900">{difficultyDistribution.EASY || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs bg-slate-50 p-2 rounded-md border border-slate-200">
                    <span className="text-amber-700 font-medium">Medium</span>
                    <span className="font-mono font-semibold text-slate-900">{difficultyDistribution.MEDIUM || 0}</span>
                  </div>
                  <div className="flex justify-between text-xs bg-slate-50 p-2 rounded-md border border-slate-200">
                    <span className="text-rose-700 font-medium">Hard</span>
                    <span className="font-mono font-semibold text-slate-900">{difficultyDistribution.HARD || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AnalyticsView;
