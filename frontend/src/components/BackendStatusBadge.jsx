import React, { useState, useEffect } from 'react';
import { Database, Server, Sparkles } from 'lucide-react';
import { getBackendHealth } from '../services/api.js';

export function BackendStatusBadge() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function check() {
      const data = await getBackendHealth();
      if (mounted) {
        setHealth(data);
        setLoading(false);
      }
    }
    check();
    const interval = setInterval(check, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
        <span>Connecting to API...</span>
      </div>
    );
  }

  const isServerOk = health?.status === 'ok';
  const isMongoConnected = health?.database?.isConnected;
  const hasGemini = health?.geminiConfigured;

  return (
    <div className="flex items-center space-x-2.5 text-[11px] bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md">
      {/* Express Backend Status */}
      <div className="flex items-center space-x-1" title="Express API Server Status">
        <Server className={`w-3 h-3 ${isServerOk ? 'text-emerald-400' : 'text-rose-400'}`} />
        <span className="text-slate-400">API:</span>
        <span className={`font-mono ${isServerOk ? 'text-emerald-400' : 'text-rose-400'}`}>
          {isServerOk ? 'Online' : 'Offline'}
        </span>
      </div>

      <span className="text-slate-700">|</span>

      {/* MongoDB Status */}
      <div
        className="flex items-center space-x-1"
        title={isMongoConnected ? 'Connected to MongoDB Atlas' : 'Local Fallback active'}
      >
        <Database className={`w-3 h-3 ${isMongoConnected ? 'text-emerald-400' : 'text-amber-400'}`} />
        <span className="text-slate-400">DB:</span>
        <span
          className={`font-mono ${
            isMongoConnected ? 'text-emerald-400' : 'text-amber-400'
          }`}
        >
          {isMongoConnected ? 'MongoDB' : 'Fallback'}
        </span>
      </div>

      <span className="text-slate-700">|</span>

      {/* Academic Engine */}
      <div className="flex items-center space-x-1" title="Academic Derivations Status">
        <Sparkles className={`w-3 h-3 ${hasGemini ? 'text-teal-400' : 'text-slate-500'}`} />
        <span className="text-slate-400">Engine:</span>
        <span className={`font-mono ${hasGemini ? 'text-teal-400' : 'text-slate-500'}`}>
          {hasGemini ? 'Ready' : 'Offline'}
        </span>
      </div>
    </div>
  );
}

export default BackendStatusBadge;
