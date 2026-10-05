import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderKanban,
  Clock,
  Award,
  PlayCircle,
  Search,
  RefreshCw,
  Loader2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import api from '../services/api.js';

export function TestSeriesView({ activeExam = 'GATE_CSE', onStartTest }) {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterType, setFilterType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [resolvingTestId, setResolvingTestId] = useState(null);

  const examLabels = {
    GATE_CSE: 'GATE 2027 CSE',
    CS_FOUNDATIONS: 'CS Foundations',
    GRE: 'GRE General',
    SAT: 'Digital SAT Math',
  };

  const loadTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.fetchTests();
      if (res && res.tests && Array.isArray(res.tests)) {
        setTests(res.tests);
      } else {
        throw new Error('Invalid test response format.');
      }
    } catch (err) {
      console.error('[TestSeries] Error loading tests:', err);
      setError('Unable to load test papers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTests();
  }, []);

  const filteredTests = useMemo(() => {
    return tests.filter((t) => {
      if (filterType !== 'ALL' && t.testType !== filterType) return false;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = t.title?.toLowerCase().includes(query);
        const matchesSubject = t.subjectName?.toLowerCase().includes(query);
        const matchesDesc = t.description?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesSubject && !matchesDesc) return false;
      }
      return true;
    });
  }, [tests, filterType, searchQuery]);

  const handleLaunchTest = async (test) => {
    setResolvingTestId(test.id);
    try {
      const res = await api.fetchTestById(test.id, true);
      const testToRun = res?.test || test;
      if (onStartTest) {
        onStartTest(testToRun);
      }
    } catch (err) {
      console.error('[TestSeries] Error preparing test questions:', err);
      if (onStartTest) {
        onStartTest(test);
      }
    } finally {
      setResolvingTestId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Test Series Catalog</h1>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
              {tests.length} Papers
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Full-length benchmark papers and subject drills following the {examLabels[activeExam] || activeExam} curriculum pattern.
          </p>
        </div>

        <button
          onClick={loadTests}
          disabled={loading}
          className="px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-slate-200 p-3.5 sm:p-4 rounded-lg shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Type Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'ALL', label: `All Papers (${tests.length})` },
            { id: 'FULL_MOCK', label: 'Full Mocks (65 Qs)' },
            { id: 'SUBJECT_TEST', label: 'Subject Tests' },
            { id: 'TOPIC_TEST', label: 'Topic Drills' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
                filterType === tab.id
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'bg-slate-50 text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search test papers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
          />
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="p-10 text-center space-y-2 bg-white border border-slate-200 rounded-lg shadow-xs">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-600 font-medium">Loading test catalog...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg space-y-2 text-center">
          <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
          <div className="text-sm font-semibold text-rose-900">{error}</div>
          <button
            onClick={loadTests}
            className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Test Series Grid */}
      {!loading && !error && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTests.map((test) => {
            const isResolving = resolvingTestId === test.id;
            const qCount = test.questionIds
              ? test.questionIds.length
              : test.questions
              ? test.questions.length
              : 0;

            return (
              <div
                key={test.id}
                className="bg-white border border-slate-200 hover:border-slate-300 rounded-lg p-4 sm:p-5 flex flex-col justify-between space-y-3.5 shadow-xs transition"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 uppercase font-medium">
                      {test.testType?.replace('_', ' ') || 'TEST'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500">
                      {test.targetExam || 'GATE 2027 CSE'}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 leading-snug">
                    {test.title}
                  </h3>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {test.description || 'Full pattern mock exam with standard marks distribution.'}
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-slate-50 p-2 rounded-md border border-slate-200">
                      <div className="text-[10px] text-slate-500 flex items-center justify-center space-x-1">
                        <FileText className="w-3 h-3" />
                        <span>Questions</span>
                      </div>
                      <div className="text-xs font-bold text-slate-800 font-mono mt-0.5">{qCount}</div>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-md border border-slate-200">
                      <div className="text-[10px] text-slate-500 flex items-center justify-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>Duration</span>
                      </div>
                      <div className="text-xs font-bold text-slate-800 font-mono mt-0.5">
                        {test.durationMinutes || 180}m
                      </div>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-md border border-slate-200">
                      <div className="text-[10px] text-slate-500 flex items-center justify-center space-x-1">
                        <Award className="w-3 h-3" />
                        <span>Marks</span>
                      </div>
                      <div className="text-xs font-bold text-slate-800 font-mono mt-0.5">
                        {test.totalMarks || 100}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleLaunchTest(test)}
                    disabled={isResolving}
                    className="w-full py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition flex items-center justify-center space-x-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    {isResolving ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Loading Test Paper...</span>
                      </>
                    ) : (
                      <>
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Start Test</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TestSeriesView;
