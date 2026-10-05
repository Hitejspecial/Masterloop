import React, { useState, useEffect } from 'react';
import {
  Crosshair,
  ArrowRight,
  TrendingDown,
  Loader2,
} from 'lucide-react';
import api from '../services/api.js';

export function WeakAreaView({ weakTopics = [], onStartDrill }) {
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function loadSubjects() {
      try {
        const res = await api.fetchTaxonomy();
        if (isMounted && res && res.taxonomy) {
          setSubjects(res.taxonomy);
        }
      } catch (err) {
        console.error('[WeakArea] Error loading subjects:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadSubjects();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="pb-2 border-b border-slate-200">
        <div className="flex items-center space-x-2">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Weak Area Practice</h1>
          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
            Remedial Engine
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Identifies topics with accuracy under 60% and launches targeted practice drills.
        </p>
      </div>

      {/* Identified Deficits */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
          <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
          <span>Identified Deficits</span>
        </h2>

        {weakTopics.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-5 text-center space-y-1 shadow-xs">
            <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
              No weak areas identified yet. As you solve questions in the Question Bank or submit Full Mocks, topics with lower accuracy will automatically be surfaced here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {weakTopics.map((topic, idx) => (
              <div
                key={idx}
                className="bg-white border border-rose-200 p-3.5 rounded-lg flex items-center justify-between shadow-xs"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900">{topic.name}</div>
                  <div className="text-[10px] text-slate-500">{topic.subject}</div>
                </div>
                <div className="flex items-center space-x-2.5">
                  <span className="text-xs font-mono font-bold text-rose-600">{topic.accuracy}%</span>
                  <button
                    onClick={() => onStartDrill && onStartDrill(topic.subjectId || topic.id)}
                    className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition cursor-pointer shadow-xs"
                  >
                    Drill
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subject Diagnostic Drills */}
      <div className="space-y-3 pt-4 border-t border-slate-200">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
            <Crosshair className="w-3.5 h-3.5 text-blue-600" />
            <span>Subject Drills</span>
          </h2>
          <span className="text-[11px] text-slate-500">Pick any subject to filter question sets</span>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {subjects.map((sub) => (
              <div
                key={sub.id}
                className="bg-white border border-slate-200 hover:border-slate-300 p-3.5 rounded-lg flex flex-col justify-between space-y-3 shadow-xs transition"
              >
                <div>
                  <div className="text-xs font-semibold text-slate-900">{sub.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {sub.topics?.length || 0} core topics
                  </div>
                </div>

                <button
                  onClick={() => onStartDrill && onStartDrill(sub.id)}
                  className="w-full py-1.5 rounded-md bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-medium transition flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <span>Practice Subject</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default WeakAreaView;
