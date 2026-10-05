import React, { useState, useEffect } from 'react';
import {
  GitBranch,
  Search,
  ChevronRight,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import api from '../services/api.js';

export function TaxonomyView({ onPracticeTopic }) {
  const [taxonomyData, setTaxonomyData] = useState([]);
  const [mistakeCategories, setMistakeCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('syllabus');
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadTaxonomy = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.fetchTaxonomy();
      if (res && res.taxonomy) {
        setTaxonomyData(res.taxonomy);
        setMistakeCategories(res.mistakeCategories || []);
        if (res.taxonomy.length > 0 && !selectedSubjectId) {
          setSelectedSubjectId(res.taxonomy[0].id);
        }
      } else {
        throw new Error('Invalid syllabus response.');
      }
    } catch (err) {
      console.error('[Taxonomy] Error loading taxonomy:', err);
      setError('Unable to load syllabus taxonomy. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTaxonomy();
  }, []);

  const selectedSubject =
    taxonomyData.find((s) => s.id === selectedSubjectId) || taxonomyData[0];

  const filteredTopics = (selectedSubject?.topics || []).filter((top) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const inName = top.name?.toLowerCase().includes(q);
    const inSubtopics = (top.subtopics || []).some((sub) =>
      typeof sub === 'string'
        ? sub.toLowerCase().includes(q)
        : sub.name?.toLowerCase().includes(q)
    );
    return inName || inSubtopics;
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Syllabus &amp; Weightage</h1>
            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
              Official Curriculum
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Official GATE CSE curriculum hierarchy, topic breakdowns, and error diagnostics.
          </p>
        </div>

        <button
          onClick={loadTaxonomy}
          disabled={loading}
          className="px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-medium flex items-center space-x-1.5 transition cursor-pointer self-start sm:self-auto shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('syllabus')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
            activeTab === 'syllabus'
              ? 'bg-blue-600 text-white font-semibold shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Syllabus Subject Hierarchy ({taxonomyData.length})
        </button>
        <button
          onClick={() => setActiveTab('mistakes')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${
            activeTab === 'mistakes'
              ? 'bg-blue-600 text-white font-semibold shadow-xs'
              : 'bg-white text-slate-600 border border-slate-200 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Cognitive Mistake Schema ({mistakeCategories.length})
        </button>
      </div>

      {loading && (
        <div className="p-10 text-center space-y-2 bg-white border border-slate-200 rounded-lg shadow-xs">
          <Loader2 className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
          <p className="text-xs text-slate-600 font-medium">Loading syllabus taxonomy...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-lg text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-rose-600 mx-auto" />
          <div className="text-sm font-semibold text-rose-900">{error}</div>
          <button
            onClick={loadTaxonomy}
            className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-medium text-xs cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Syllabus Tab Content */}
      {!loading && !error && activeTab === 'syllabus' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Subject List */}
          <div className="lg:col-span-4 space-y-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1">
              GATE CSE Subjects
            </span>
            <div className="space-y-1 max-h-[68vh] overflow-y-auto pr-1">
              {taxonomyData.map((subj) => {
                const isSelected = subj.id === selectedSubjectId;
                return (
                  <button
                    key={subj.id}
                    onClick={() => setSelectedSubjectId(subj.id)}
                    className={`w-full text-left p-2.5 sm:p-3 rounded-md border transition cursor-pointer flex items-center justify-between shadow-xs ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-900 font-semibold'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="text-xs">{subj.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 font-normal">
                        Code: {subj.code || subj.id} • {subj.topics?.length || 0} Topics
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Topic Breakdown */}
          <div className="lg:col-span-8 space-y-3.5">
            <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-3.5 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{selectedSubject?.name}</h2>
                  <p className="text-xs text-slate-500">
                    Syllabus section code: <span className="font-mono text-blue-600 font-medium">{selectedSubject?.code || selectedSubject?.id}</span>
                  </p>
                </div>

                <div className="relative w-full sm:w-60">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search topics..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Topics List */}
              <div className="space-y-2.5">
                {filteredTopics.map((top, idx) => (
                  <div
                    key={top.id || idx}
                    className="bg-slate-50 border border-slate-200 rounded-md p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="w-4 h-4 rounded bg-white text-slate-600 font-mono text-[10px] font-semibold flex items-center justify-center border border-slate-200">
                          {idx + 1}
                        </span>
                        <h3 className="text-xs font-semibold text-slate-800">{top.name}</h3>
                      </div>
                      {top.weightage && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white text-slate-600 border border-slate-200">
                          Weight: {top.weightage}
                        </span>
                      )}
                    </div>

                    {/* Subtopics */}
                    {Array.isArray(top.subtopics) && top.subtopics.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {top.subtopics.map((sub, sIdx) => {
                          const subName = typeof sub === 'string' ? sub : sub.name;
                          return (
                            <span
                              key={sIdx}
                              className="text-[10px] px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-medium"
                            >
                              {subName}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mistake Schema Tab Content */}
      {!loading && !error && activeTab === 'mistakes' && (
        <div className="space-y-3.5">
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 mb-1">
              Cognitive Mistake Taxonomy (9 Categories)
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              When an incorrect question response is submitted during mocks or practice, the error is categorized according to this taxonomy.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {mistakeCategories.map((cat, idx) => (
                <div
                  key={cat.id || idx}
                  className="bg-slate-50 border border-slate-200 rounded-md p-3.5 space-y-1.5"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded bg-white border border-slate-200 text-slate-700 text-xs font-mono font-semibold flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <h3 className="text-xs font-semibold text-slate-900">{cat.name || cat.label}</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {cat.description || 'Systematic exam trap identified from standard test analytics.'}
                  </p>
                  {cat.remedy && (
                    <div className="text-[11px] text-slate-700 pt-1 border-t border-slate-200">
                      <strong className="text-blue-700 font-medium">Remedy:</strong> {cat.remedy}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TaxonomyView;
