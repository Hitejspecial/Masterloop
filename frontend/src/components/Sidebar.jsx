import React from 'react';
import {
  LayoutDashboard,
  PlayCircle,
  FolderKanban,
  FileQuestion,
  BookX,
  Crosshair,
  GitBranch,
  BarChart3,
  ShieldCheck,
  FileText,
} from 'lucide-react';

export function Sidebar({
  currentView,
  setView,
  isMobileNavOpen = false,
  onCloseMobileNav,
}) {
  const navItems = [
    { id: 'dashboard', label: 'My Dashboard', icon: LayoutDashboard },
    { id: 'mock', label: 'Full Mock Exam', icon: PlayCircle },
    { id: 'test-series', label: 'Test Series', icon: FolderKanban },
    { id: 'question-bank', label: 'Question Bank', icon: FileQuestion },
    { id: 'mistake-notebook', label: 'Mistake Notebook', icon: BookX },
    { id: 'weak-area', label: 'Weak Area Practice', icon: Crosshair },
    { id: 'taxonomy', label: 'Syllabus & Weightage', icon: GitBranch },
    { id: 'analytics', label: 'Subject Analytics', icon: BarChart3 },
  ];

  const handleItemClick = (id) => {
    setView(id);
    if (onCloseMobileNav) {
      onCloseMobileNav();
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileNavOpen && (
        <div
          onClick={onCloseMobileNav}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed lg:static top-12 bottom-0 left-0 z-40 w-60 border-r border-slate-200 bg-white flex flex-col justify-between p-3.5 shrink-0 transition-transform duration-200 lg:translate-x-0 ${
          isMobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2.5">
              Portal Modules
            </span>
            <nav className="mt-1.5 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id)}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs transition cursor-pointer text-left ${
                      isActive
                        ? 'bg-blue-600 text-white font-medium shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-normal'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Footer Links */}
        <div className="pt-3 border-t border-slate-100 space-y-1">
          <button
            onClick={() => handleItemClick('privacy')}
            className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition cursor-pointer text-left ${
              currentView === 'privacy'
                ? 'text-blue-600 bg-blue-50 font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy Policy</span>
          </button>

          <button
            onClick={() => handleItemClick('terms')}
            className={`w-full flex items-center space-x-2 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition cursor-pointer text-left ${
              currentView === 'terms'
                ? 'text-blue-600 bg-blue-50 font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Terms &amp; Conditions</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
