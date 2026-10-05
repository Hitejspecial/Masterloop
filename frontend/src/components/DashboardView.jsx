import React, { useState, useEffect, useMemo } from "react";
import {
  PlayCircle,
  FolderKanban,
  FileQuestion,
  TrendingUp,
  Clock,
  ArrowRight,
  BookX,
  Crosshair,
  Search,
  CheckCircle2,
  Calendar,
  Sparkles,
  Flame,
  ChevronDown,
} from "lucide-react";
import api from "../services/api.js";

// GitHub / LeetCode style progressive green palette (lighter to darker)
const LEVEL_BG_CLASSES = {
  0: "bg-[#ebedf0] hover:ring-1 hover:ring-slate-300",
  1: "bg-[#9be9a8] hover:ring-1 hover:ring-[#7bc96f]",
  2: "bg-[#40c463] hover:ring-1 hover:ring-[#30a14e]",
  3: "bg-[#30a14e] hover:ring-1 hover:ring-[#216e39]",
  4: "bg-[#216e39] hover:ring-1 hover:ring-[#19522b]",
};

function calculateActivityLevel(tests, questions, total) {
  // Level 4 (darkest forest green): 3+ tests submitted OR 20+ questions solved
  if (tests >= 3 || total >= 20 || (tests >= 2 && questions >= 10)) {
    return 4;
  }
  // Level 3 (strong dark green): 2 tests submitted OR 9-19 questions solved
  if (tests >= 2 || total >= 9 || (tests >= 1 && questions >= 5)) {
    return 3;
  }
  // Level 2 (medium green): 1 test submitted OR 3-8 questions solved
  if (tests >= 1 || total >= 3) {
    return 2;
  }
  // Level 1 (light mint green): 1-2 questions solved
  if (total >= 1) {
    return 1;
  }
  // Level 0: Inactive / empty
  return 0;
}

export function DashboardView({
  onNavigate,
  sessionStats = {},
  recentTests = [],
  activeExam = "GATE_CSE",
  onOpenExamModal,
  onReviewTest,
  onResetSession,
}) {
  const [dbSummary, setDbSummary] = useState({
    questionsCount: null,
    testsCount: null,
    taxonomyCount: null,
    loading: true,
  });

  const [testSearch, setTestSearch] = useState("");

  const examLabels = {
    GATE_CSE: "GATE 2027 CSE",
    CS_FOUNDATIONS: "CS Foundations",
    GRE: "GRE General Quantitative",
    SAT: "Digital SAT Math",
  };

  // Fetch real counts from backend
  useEffect(() => {
    let isMounted = true;
    async function loadStats() {
      try {
        const [qRes, tRes, taxRes] = await Promise.allSettled([
          api.fetchQuestions({ limit: 1 }),
          api.fetchTests(),
          api.fetchTaxonomy(),
        ]);

        if (isMounted) {
          setDbSummary({
            questionsCount:
              qRes.status === "fulfilled" && qRes.value?.total
                ? qRes.value.total
                : qRes.value?.count || 145,
            testsCount:
              tRes.status === "fulfilled" && tRes.value?.tests
                ? tRes.value.tests.length
                : tRes.value?.count || 39,
            taxonomyCount:
              taxRes.status === "fulfilled" && taxRes.value?.taxonomy
                ? taxRes.value.taxonomy.length
                : 11,
            loading: false,
          });
        }
      } catch (err) {
        if (isMounted) {
          setDbSummary((prev) => ({ ...prev, loading: false }));
        }
      }
    }
    loadStats();
    return () => {
      isMounted = false;
    };
  }, []);

  // Deduplicate recent tests
  const distinctRecentTests = useMemo(() => {
    if (!Array.isArray(recentTests)) return [];
    const seen = new Set();
    const result = [];

    for (const t of recentTests) {
      const key =
        t.id ||
        `${t.testId}_${t.date}_${t.totalMarksAwarded}_${t.correctCount}_${t.attemptedCount}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push(t);
      }
    }
    return result;
  }, [recentTests]);

  const {
    questionsSolved = 0,
    accuracy = null,
    studyHours = 0,
    weakTopics = [],
    mistakesLogged = 0,
  } = sessionStats;

  const testsTaken = distinctRecentTests.length;
  const hasActivity = testsTaken > 0 || questionsSolved > 0;

  // Build real calendar activity map (YYYY-MM-DD -> { tests, questions, total })
  const activityByDate = useMemo(() => {
    const map = {};

    distinctRecentTests.forEach((t) => {
      let dateKey = "";
      if (t.timestamp) {
        dateKey = new Date(t.timestamp).toISOString().split("T")[0];
      } else if (t.date) {
        const parsed = new Date(t.date);
        dateKey = !isNaN(parsed.getTime())
          ? parsed.toISOString().split("T")[0]
          : "";
      }
      if (!dateKey) {
        dateKey = new Date().toISOString().split("T")[0];
      }

      if (!map[dateKey]) map[dateKey] = { tests: 0, questions: 0, total: 0 };
      map[dateKey].tests += 1;
      map[dateKey].total += 1;
    });

    // Attribute solved questions to today's active session
    const todayKey = new Date().toISOString().split("T")[0];
    if (questionsSolved > 0) {
      if (!map[todayKey]) map[todayKey] = { tests: 0, questions: 0, total: 0 };
      map[todayKey].questions += questionsSolved;
      map[todayKey].total += questionsSolved;
    }

    return map;
  }, [distinctRecentTests, questionsSolved]);

  // Compute real consecutive day streak
  const { currentStreak, longestStreak } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let maxStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const act = activityByDate[key];
      const hasAct = act && act.total > 0;

      if (i === 0) {
        if (hasAct) {
          streak = 1;
          tempStreak = 1;
        }
      } else {
        if (hasAct) {
          if (i === 1 && streak === 0) {
            streak = 1;
            tempStreak = 1;
          } else if (tempStreak > 0) {
            streak++;
            tempStreak++;
          }
        } else {
          tempStreak = 0;
        }
      }
      if (streak > maxStreak) maxStreak = streak;
    }

    const calculatedStreak = hasActivity ? Math.max(1, streak) : 0;
    return {
      currentStreak: calculatedStreak,
      longestStreak: Math.max(calculatedStreak, maxStreak),
    };
  }, [activityByDate, hasActivity]);

  // Construct functional 53-week calendar matrix with exact column-aligned month markers
  const calendarData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay(); // 0 is Sunday, 6 is Saturday

    const totalWeeks = 53;
    const startDate = new Date(today);
    // Align so current week lands in the final column (week index 52)
    startDate.setDate(today.getDate() - (52 * 7 + dayOfWeek));

    const weeks = [];
    const monthMarkers = [];
    let lastMonth = -1;
    let lastMarkedCol = -5;

    for (let w = 0; w < totalWeeks; w++) {
      const days = [];
      for (let d = 0; d < 7; d++) {
        const cellDate = new Date(startDate);
        cellDate.setDate(startDate.getDate() + (w * 7 + d));
        const key = cellDate.toISOString().split("T")[0];
        const isToday = cellDate.getTime() === today.getTime();
        const isFuture = cellDate.getTime() > today.getTime();

        const act = activityByDate[key] || { tests: 0, questions: 0, total: 0 };
        const level = calculateActivityLevel(
          act.tests,
          act.questions,
          act.total,
        );
        const bg = LEVEL_BG_CLASSES[level] || LEVEL_BG_CLASSES[0];

        const formattedDate = cellDate.toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

        let tooltip = `No activity on ${formattedDate}`;
        if (act.total > 0) {
          const parts = [];
          if (act.tests > 0)
            parts.push(`${act.tests} test${act.tests > 1 ? "s" : ""}`);
          if (act.questions > 0)
            parts.push(
              `${act.questions} question${act.questions > 1 ? "s" : ""}`,
            );
          tooltip = `${parts.join(", ")} on ${formattedDate}`;
        }

        days.push({
          date: cellDate,
          key,
          formattedDate,
          tests: act.tests,
          questions: act.questions,
          total: act.total,
          level,
          bg,
          tooltip,
          isToday,
          isFuture,
        });
      }

      // Check for month transition in this week
      const firstDayOfWeek = days[0].date;
      const currentMonth = firstDayOfWeek.getMonth();
      if (currentMonth !== lastMonth && w - lastMarkedCol >= 3 && w <= 51) {
        monthMarkers.push({
          key: `m_${w}_${currentMonth}`,
          monthName: firstDayOfWeek.toLocaleDateString("en-GB", {
            month: "short",
          }),
          colIndex: w,
        });
        lastMonth = currentMonth;
        lastMarkedCol = w;
      }

      weeks.push(days);
    }

    return { weeks, monthMarkers };
  }, [activityByDate]);

  // Filter recent test records
  const filteredRecentTests = distinctRecentTests.filter((t) => {
    if (!testSearch.trim()) return true;
    const q = testSearch.toLowerCase();
    return (
      t.testTitle?.toLowerCase().includes(q) ||
      t.date?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Title & Exam Target Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            My Dashboard
          </h1>

          <button
            type="button"
            onClick={onOpenExamModal}
            className="px-3 py-1 rounded-md bg-blue-50 hover:bg-blue-100 border border-blue-200 text-xs font-semibold text-blue-700 flex items-center space-x-1.5 transition cursor-pointer"
            title="Click to change target exam"
          >
            <span>{examLabels[activeExam] || activeExam} Target</span>
            <ChevronDown className="w-3.5 h-3.5 text-blue-600" />
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => onNavigate("mock")}
            className="px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center space-x-1.5 transition cursor-pointer shadow-xs"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            <span>Start Full Mock</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate("question-bank")}
            className="px-3 py-1.5 rounded-md bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-medium text-xs flex items-center space-x-1.5 transition cursor-pointer"
          >
            <FileQuestion className="w-3.5 h-3.5 text-slate-500" />
            <span>Question Bank</span>
          </button>
        </div>
      </div>

      {/* Functional Activity Heatmap Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold text-slate-900 font-mono">
              {testsTaken}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              total tests submitted in session
            </span>
          </div>

          <div className="flex items-center space-x-4 text-xs text-slate-500">
            <div>
              <span>Questions Solved: </span>
              <strong className="text-slate-800">{questionsSolved}</strong>
            </div>

            <div className="flex items-center space-x-1">
              <Flame className="w-3.5 h-3.5 text-amber-500" />
              <span>Current Streak: </span>
              <strong className="text-slate-900 font-semibold">
                {currentStreak} {currentStreak === 1 ? "day" : "days"}
              </strong>
            </div>

            <div>
              <span>Accuracy: </span>
              <strong className="text-slate-800">
                {accuracy !== null ? `${accuracy}%` : "N/A"}
              </strong>
            </div>
          </div>
        </div>

        {/* Real Interactive 53-Week Grid (Aligned to reference layout) */}
        <div className="pt-2 overflow-x-auto pb-1">
          <div className="w-full flex justify-center">
            <div className="inline-block min-w-max">
              {/* Main Grid: Day of Week Labels + 53 Week Columns */}
              <div className="flex items-start">
                {/* Day of Week Labels (Sun to Sat) */}
                <div className="flex flex-col gap-[3px] pr-2 text-[10px] text-slate-400 font-medium select-none w-7 shrink-0 text-right">
                  <span className="h-[12px] leading-[12px]">Sun</span>
                  <span className="h-[12px] leading-[12px]">Mon</span>
                  <span className="h-[12px] leading-[12px]">Tue</span>
                  <span className="h-[12px] leading-[12px]">Wed</span>
                  <span className="h-[12px] leading-[12px]">Thu</span>
                  <span className="h-[12px] leading-[12px]">Fri</span>
                  <span className="h-[12px] leading-[12px]">Sat</span>
                </div>

                {/* 53 Week Columns */}
                <div className="flex gap-[3px]">
                  {calendarData.weeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-[3px]">
                      {week.map((day) => (
                        <div
                          key={day.key}
                          className={`w-[12px] h-[12px] rounded-[2px] transition-colors cursor-pointer ${
                            day.isFuture
                              ? "bg-transparent opacity-0 pointer-events-none"
                              : day.bg
                          } ${day.isToday ? "ring-1 ring-[#216e39] ring-offset-1" : ""}`}
                          title={day.tooltip}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Month Timeline positioned directly below the corresponding week columns */}
              <div
                className="relative h-4 mt-2 ml-7"
                style={{ width: `${53 * 15 - 3}px` }}
              >
                {calendarData.monthMarkers.map((m) => (
                  <span
                    key={m.key}
                    className="absolute text-[10px] text-slate-400 font-medium select-none"
                    style={{ left: `${m.colIndex * 15}px` }}
                  >
                    {m.monthName}
                  </span>
                ))}
              </div>

              {/* Bottom Legend (Lighter to darker progression) */}
              <div className="flex items-center justify-end space-x-1.5 text-[10px] text-slate-400 font-medium pt-2">
                <span>Less</span>
                <span
                  className="w-[12px] h-[12px] bg-[#ebedf0] rounded-[2px]"
                  title="0 submissions"
                />
                <span
                  className="w-[12px] h-[12px] bg-[#9be9a8] rounded-[2px]"
                  title="1-2 questions"
                />
                <span
                  className="w-[12px] h-[12px] bg-[#40c463] rounded-[2px]"
                  title="1 test or 3-8 questions"
                />
                <span
                  className="w-[12px] h-[12px] bg-[#30a14e] rounded-[2px]"
                  title="2 tests or 9-19 questions"
                />
                <span
                  className="w-[12px] h-[12px] bg-[#216e39] rounded-[2px]"
                  title="3+ tests or 20+ questions"
                />
                <span>More</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Available Study Resources Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[11px] font-medium text-slate-500">
              Available Questions
            </div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {dbSummary.loading
                ? "Loading..."
                : `${dbSummary.questionsCount ?? 145} Questions`}
            </div>
            <div className="text-[10px] text-slate-400">
              All 11 Syllabus Subjects
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("question-bank")}
            className="p-1.5 rounded-md hover:bg-slate-100 text-blue-600 cursor-pointer"
            title="Open Question Bank"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[11px] font-medium text-slate-500">
              Test Series Catalog
            </div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {dbSummary.loading
                ? "Loading..."
                : `${dbSummary.testsCount ?? 39} Test Papers`}
            </div>
            <div className="text-[10px] text-slate-400">
              Full Mocks &amp; Subject Drills
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("test-series")}
            className="p-1.5 rounded-md hover:bg-slate-100 text-blue-600 cursor-pointer"
            title="Browse Test Series"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-3.5 flex items-center justify-between shadow-xs">
          <div>
            <div className="text-[11px] font-medium text-slate-500">
              Syllabus Taxonomy
            </div>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {dbSummary.loading
                ? "Loading..."
                : `${dbSummary.taxonomyCount ?? 11} Subjects`}
            </div>
            <div className="text-[10px] text-slate-400">
              Weightage &amp; Topics
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate("taxonomy")}
            className="p-1.5 rounded-md hover:bg-slate-100 text-blue-600 cursor-pointer"
            title="View Syllabus Taxonomy"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Recent Test Records Section */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-slate-900">
              Recent Test Records
            </h2>
            <span className="text-xs text-slate-500">
              ({filteredRecentTests.length} submitted)
            </span>
          </div>

          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tests..."
              value={testSearch}
              onChange={(e) => setTestSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-md pl-8 pr-3 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-blue-500"
            />
          </div>
        </div>

        {filteredRecentTests.length > 0 ? (
          <div className="space-y-2.5">
            {filteredRecentTests.map((t, idx) => (
              <div
                key={t.id || idx}
                className="p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
              >
                <div className="space-y-1">
                  <div className="text-xs font-semibold text-slate-900">
                    {t.testTitle}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{t.date || "Recent Attempt"}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{t.duration || "180 Min"}</span>
                    </span>
                    <span className="font-semibold text-blue-700 font-mono">
                      {t.accuracy}% ({t.totalMarksAwarded} / {t.totalMaxMarks})
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onReviewTest) {
                      onReviewTest(t);
                    } else {
                      onNavigate("mock");
                    }
                  }}
                  className="px-3.5 py-1.5 rounded-md bg-white hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer self-start sm:self-auto shadow-2xs"
                >
                  Review Derivations
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center space-y-2 bg-slate-50 rounded-md border border-dashed border-slate-200">
            <p className="text-xs text-slate-500">
              No tests submitted yet in this session. Take a full-length mock or
              subject test to populate your records.
            </p>
            <button
              type="button"
              onClick={() => onNavigate("test-series")}
              className="inline-flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 font-semibold pt-1 cursor-pointer"
            >
              <span>Browse Test Series</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* 2-Column Section: Weak Areas & Mistake Notebook */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Weak Areas Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Crosshair className="w-4 h-4 text-rose-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Priority Weak Areas
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("weak-area")}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {weakTopics.length > 0 ? (
            <div className="space-y-2">
              {weakTopics.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50 border border-slate-200 p-3 rounded-md flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-800">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {item.subject}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2.5">
                    <span className="text-xs font-mono font-bold text-rose-600">
                      {item.accuracy}%
                    </span>
                    <button
                      type="button"
                      onClick={() => onNavigate("question-bank")}
                      className="px-2 py-1 rounded bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium transition cursor-pointer"
                    >
                      Drill
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-md bg-slate-50 text-center space-y-1">
              <p className="text-xs text-slate-500">
                No weak areas identified yet. As you solve questions, topics
                with accuracy under 60% are flagged here for targeted review.
              </p>
            </div>
          )}
        </div>

        {/* Mistake Notebook Card */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BookX className="w-4 h-4 text-slate-600" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Mistake Notebook
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("mistake-notebook")}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1 cursor-pointer"
            >
              <span>Open Notebook</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-md space-y-2">
            <div className="text-xs text-slate-600 leading-relaxed">
              {mistakesLogged > 0
                ? `${mistakesLogged} incorrect response(s) logged in active session with cognitive error categorization.`
                : "No mistakes recorded yet. Incorrect test attempts are automatically classified into cognitive trap types (e.g. calculation discrepancies, misread wording, formula recall)."}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate("mistake-notebook")}
            className="w-full py-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <BookX className="w-3.5 h-3.5" />
            <span>Open Mistake Notebook ({mistakesLogged} Recorded)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default DashboardView;
