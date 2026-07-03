import { useEffect, useState } from "react";
import { HashRouter, NavLink, Route, Routes } from "react-router-dom";
import { seedContentIfNeeded } from "./db/seed";
import DashboardScreen from "./features/dashboard/DashboardScreen";
import ReviewScreen from "./features/review/ReviewScreen";
import QuizScreen from "./features/quiz/QuizScreen";
import WordBrowserScreen from "./features/browser/WordBrowserScreen";
import WordDetailScreen from "./features/browser/WordDetailScreen";
import ProgressScreen from "./features/progress/ProgressScreen";
import SettingsScreen from "./features/settings/SettingsScreen";

const NAV_ITEMS = [
  { to: "/", label: "首頁", icon: "🏠" },
  { to: "/review", label: "複習", icon: "📖" },
  { to: "/quiz", label: "測驗", icon: "✏️" },
  { to: "/browse", label: "單字", icon: "🔍" },
  { to: "/progress", label: "進度", icon: "📊" },
];

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    seedContentIfNeeded()
      .then(() => setReady(true))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 text-center">
        <div>
          <p className="mb-2 text-lg font-bold">資料載入失敗</p>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="animate-pulse text-slate-500">單字資料載入中…</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="mx-auto flex min-h-screen max-w-lg flex-col">
        <main className="flex-1 pb-20">
          <Routes>
            <Route path="/" element={<DashboardScreen />} />
            <Route path="/review" element={<ReviewScreen />} />
            <Route path="/quiz" element={<QuizScreen />} />
            <Route path="/browse" element={<WordBrowserScreen />} />
            <Route path="/word/:wordId" element={<WordDetailScreen />} />
            <Route path="/progress" element={<ProgressScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
          </Routes>
        </main>
        <nav className="fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white">
          <div className="mx-auto flex max-w-lg">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-1 flex-col items-center py-2 text-xs ${
                    isActive ? "font-bold text-blue-600" : "text-slate-500"
                  }`
                }
              >
                <span className="text-xl">{item.icon}</span>
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>
      </div>
    </HashRouter>
  );
}
