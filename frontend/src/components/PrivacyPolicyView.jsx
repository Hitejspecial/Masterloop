import React from 'react';
import { ShieldCheck, ArrowLeft } from 'lucide-react';

export function PrivacyPolicyView({ onBack }) {
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
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Privacy Policy</h1>
        </div>
        <p className="text-xs text-slate-500">
          Last revised: October 2026. MasterLoop is committed to user data privacy and transparent operational standards.
        </p>
      </div>

      {/* Policy Content */}
      <div className="space-y-6 text-xs text-slate-700 leading-relaxed bg-white border border-slate-200 rounded-lg p-6 shadow-xs">
        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">1. Information We Process</h2>
          <p>
            MasterLoop operates as an examination simulation, performance diagnostic, and question practice system. In providing these services, the platform processes:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
            <li>Session attempt records, including question response choices, time-per-question metrics, and submitted mock test scores.</li>
            <li>Error diagnostic categorizations derived from incorrect responses (e.g., formula recall, numerical calculation discrepancies).</li>
            <li>System operational telemetry required strictly for maintaining session stability and test delivery.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">2. Purpose of Processing</h2>
          <p>
            Data collected through active sessions is used exclusively to:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-600 pl-2">
            <li>Calculate accurate score breakdowns based on official GATE CSE marking schemes (including fractional negative deductions).</li>
            <li>Populate the Mistake Notebook and identify topic-level weak areas requiring remedial practice.</li>
            <li>Provide relevant academic derivations and explanations.</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">3. Third-Party Services &amp; Storage</h2>
          <p>
            Explanations and diagnostic summaries requested by the user are processed via secure server-side academic processing pipelines. No identifiable personal information is sold, rented, or distributed to advertising networks.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">4. Data Retention &amp; Control</h2>
          <p>
            Users retain control over their session test records. Session data can be cleared or reset directly from the interface at any time.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">5. Security Standards</h2>
          <p>
            All communications occur over encrypted TLS connections. Sensitive configuration parameters remain confined strictly to server environments.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-bold text-slate-900">6. Inquiries</h2>
          <p>
            For compliance queries regarding data handling within MasterLoop, direct correspondence to the platform administrator.
          </p>
        </section>
      </div>
    </div>
  );
}

export default PrivacyPolicyView;
