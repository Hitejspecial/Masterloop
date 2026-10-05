import React from 'react';
import { BookOpen, RotateCcw, Menu, X, Bookmark, Layers, LogOut, User as UserIcon } from 'lucide-react';

export function Header({
  activeExam = 'GATE_CSE',
  onOpenExamModal,
  streakCount = 0,
  dailyCompleted = 0,
  onResetSession,
  isMobileNavOpen = false,
  onToggleMobileNav,
  onNavigate,
  user = null,
  onLogout = null,
}) {
  const examLabels = {
    GATE_CSE: 'GATE 2027 CSE',
    GRE: 'GRE General',
    SAT: 'Digital SAT',
    CS_FOUNDATIONS: 'CS Foundations',
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 py-2.5 flex items-center justify-between">
      {/* Brand & Active Exam */}
      <div className="flex items-center space-x-3 sm:space-x-4">
        {/* Mobile menu toggle */}
        <button
          onClick={onToggleMobileNav}
          className="lg:hidden p-1.5 rounded-md text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 cursor-pointer"
          aria-label="Toggle navigation"
        >
          {isMobileNavOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>

        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
            <Layers className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900">
            MasterLoop
          </span>
        </div>

        {/* Exam selector chip */}
        <button
          onClick={onOpenExamModal}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-semibold text-blue-700 transition cursor-pointer"
        >
          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
          <span>{examLabels[activeExam] || activeExam}</span>
          <span className="text-[10px] text-blue-500 ml-0.5">▾</span>
        </button>
      </div>

      {/* Right User Controls */}
      <div className="flex items-center space-x-2.5 text-xs">
        {onNavigate && (
          <button
            onClick={() => onNavigate('question-bank')}
            className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5 text-slate-500" />
            <span>Practice Qs</span>
          </button>
        )}

        {/* Streak indicator */}
        <div className="flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-700">
          <span className="text-slate-500">Streak:</span>
          <span className="font-bold text-slate-900">{streakCount}</span>
        </div>

        {/* Questions Solved */}
        <div className="hidden xs:flex items-center space-x-1 bg-slate-100 px-2.5 py-1 rounded-md text-[11px] font-medium text-slate-700">
          <span className="text-slate-500">Solved:</span>
          <span className="font-bold text-slate-900">{dailyCompleted}</span>
        </div>

        {onResetSession && (
          <button
            onClick={onResetSession}
            title="Reset Session Data"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-slate-100 transition cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}

        {/* User Profile & Logout */}
        {user && (
          <div className="flex items-center space-x-2 pl-1 border-l border-slate-200">
            <div
              className="flex items-center space-x-2 py-1 px-2 rounded-md bg-slate-50 border border-slate-200"
              title={`${user.name} (${user.email})`}
            >
              <div className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold text-[10px] flex items-center justify-center">
                {getInitials(user.name)}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <span className="text-[11px] font-semibold text-slate-900 leading-tight max-w-[120px] truncate">
                  {user.name}
                </span>
                <span className="text-[9px] text-slate-500 leading-tight max-w-[120px] truncate">
                  {user.email}
                </span>
              </div>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                title="Sign out of MasterLoop"
                className="flex items-center space-x-1 px-2.5 py-1.5 rounded-md border border-slate-200 hover:border-rose-300 hover:bg-rose-50 text-slate-600 hover:text-rose-700 transition cursor-pointer text-xs font-medium"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;
