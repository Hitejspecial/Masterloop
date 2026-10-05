import React from 'react';
import { FileText, ArrowLeft } from 'lucide-react';

export function TermsView({ onBack }) {
  return (
    <div className="p-6 md:p-10 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-3 pb-6 border-b border-slate-200">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs text-slate-500 hover:text-slate-900 transition cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Dashboard</span>
        </button>

        <div className="flex items-center space-x-2 pt-1">
          <FileText className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Terms &amp; Conditions</h1>
        </div>
        <p className="text-xs text-slate-500">
          Last revised: October 2026. Standard terms governing usage of MasterLoop examination engine.
        </p>
      </div>

      {/* Terms Content */}
      <div className="space-y-6 text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">1. Platform Scope &amp; Purpose</h2>
          <p>
            MasterLoop is an academic examination simulation and diagnostics environment designed for candidates preparing for competitive computer science assessments, specifically the Graduate Aptitude Test in Engineering (GATE CSE). The platform provides question banks, timed test environments, and diagnostic analytics.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">2. Intellectual Property &amp; Exam Content</h2>
          <p>
            Questions, answer keys, official solutions, and syllabus taxonomies provided on MasterLoop are curated for educational reference and benchmarking. Previous years' examination questions remain the intellectual property of their respective examining bodies (e.g., Organizing Institutes of GATE / IITs). Custom question explanations and diagnostic categorizations are proprietary to MasterLoop.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">3. User Responsibilities &amp; Acceptable Use</h2>
          <p>
            Users agree not to:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
            <li>Attempt automated scraping, unauthorized reverse-engineering, or bulk extraction of platform data.</li>
            <li>Bypass rate limiting or access boundaries.</li>
            <li>Misrepresent test scores, analytics, or institutional affiliation.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">4. Scoring &amp; Diagnostic Disclaimer</h2>
          <p>
            While test scoring engines implement official IIT GATE CSE marking conventions (including negative marking formulas and numerical tolerances), mock scores are predictive benchmarks and do not guarantee official examination outcomes or ranks.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">5. Service Availability</h2>
          <p>
            MasterLoop is maintained to high reliability standards. However, access may occasionally be interrupted for scheduled maintenance or network updates. MasterLoop assumes no liability for session interruptions occurring during uncompleted practice sets.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">6. Modifications to Terms</h2>
          <p>
            These terms may be revised periodically. Continued use of MasterLoop following published amendments constitutes acceptance of the modified terms.
          </p>
        </section>
      </div>
    </div>
  );
}

export default TermsView;
