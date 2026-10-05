import React, { useState } from 'react';
import {
  BookX,
  Sparkles,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import api from '../services/api.js';

export function MistakeNotebookView({ mistakes = [], onNavigateToQuestionBank }) {
  const [aiSummary, setAiSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [filterSubject, setFilterSubject] = useState('ALL');

  const filteredMistakes = mistakes.filter((m) => {
    if (filterSubject === 'ALL') return true;
    return m.subjectId === filterSubject || m.subjectName === filterSubject;
  });

  const handleGenerateSummary = async () => {
    if (!mistakes.length) return;
    setLoadingSummary(true);
    try {
      const categories = mistakes.map((m) => m.category || 'Concept Gap');
      const weakTopics = mistakes.map((m) => m.topicName || m.topicId || 'General');

      const res = await api.fetchAIMistakeSummary({
        totalMistakes: mistakes.length,
        categories,
        weakTopics,
      });

      if (res && res.summary) {
        setAiSummary(res.summary);
      }
    } catch (err) {
      console.error('[MistakeNotebook] Error in summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Mistake Notebook</h1>
            <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold">
              {mistakes.length} Logged
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Review test errors with cognitive classifications and diagnostic feedback.
          </p>
        </div>

        {mistakes.length > 0 && (
          <button
            onClick={handleGenerateSummary}
            disabled={loadingSummary}
            className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer disabled:opacity-50 self-start sm:self-auto shadow-xs"
          >
            {loadingSummary ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )}
            <span>Generate Error Synthesis</span>
          </button>
        )}
      </div>

      {/* Summary Box */}
      {aiSummary && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-4 space-y-1.5 text-xs">
          <div className="flex items-center space-x-1.5 text-blue-900 font-semibold">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <span>Academic Error Synthesis</span>
          </div>
          <p className="text-slate-800 whitespace-pre-line leading-relaxed font-mono text-[11px]">
            {aiSummary}
          </p>
        </div>
      )}

      {/* Empty State */}
      {mistakes.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center space-y-3 max-w-md mx-auto shadow-xs">
          <div className="w-10 h-10 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <BookX className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-slate-800">No Mistakes Recorded Yet</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              When solving questions or taking mocks, incorrect responses are automatically indexed here with cognitive trap classifications.
            </p>
          </div>
          <button
            onClick={onNavigateToQuestionBank}
            className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition inline-flex items-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <span>Practice in Question Bank</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredMistakes.map((m, idx) => (
            <div
              key={m.id || idx}
              className="bg-white border border-rose-200 rounded-lg p-4 sm:p-5 space-y-3 shadow-xs"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                    Mistake #{idx + 1}
                  </span>
                  <span className="text-xs font-semibold text-slate-800">{m.subjectName}</span>
                  <span className="text-slate-400">•</span>
                  <span className="text-xs text-slate-500">{m.topicName}</span>
                </div>

                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                  {m.category || 'Cognitive Trap'}
                </span>
              </div>

              <div className="text-xs sm:text-sm text-slate-800 leading-relaxed whitespace-pre-line font-normal">
                {m.questionText}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200 space-y-0.5">
                  <span className="text-rose-600 text-[11px] font-medium flex items-center space-x-1">
                    <XCircle className="w-3 h-3" />
                    <span>Your Response:</span>
                  </span>
                  <div className="font-mono font-semibold text-slate-800">
                    {Array.isArray(m.userAnswer)
                      ? m.userAnswer.join(', ')
                      : String(m.userAnswer || 'None')}
                  </div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-md border border-slate-200 space-y-0.5">
                  <span className="text-emerald-700 text-[11px] font-medium flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>Official Key:</span>
                  </span>
                  <div className="font-mono font-semibold text-emerald-700">
                    {Array.isArray(m.correctAnswer)
                      ? m.correctAnswer.join(', ')
                      : String(m.correctAnswer)}
                  </div>
                </div>
              </div>

              {m.explanation && (
                <div className="bg-slate-50 p-3 rounded-md border border-slate-200 text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                  <strong className="text-slate-900">Official Derivation:</strong> {m.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default MistakeNotebookView;
