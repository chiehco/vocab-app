import { useEffect, useState } from "react";
import { HashRouter, Navigate, NavLink, Route, Routes, useLocation } from "react-router-dom";
import { seedContentIfNeeded } from "./db/seed";
import DashboardScreen from "./features/dashboard/DashboardScreen";
import ReviewScreen from "./features/review/ReviewScreen";
import SlashScreen from "./features/slash/SlashScreen";
import QuizScreen from "./features/quiz/QuizScreen";
import PlacementScreen from "./features/quiz/PlacementScreen";
import WordBrowserScreen from "./features/browser/WordBrowserScreen";
import WordDetailScreen from "./features/browser/WordDetailScreen";
import ProgressScreen from "./features/progress/ProgressScreen";
import SettingsScreen from "./features/settings/SettingsScreen";
import WordBeastPrototype from "./features/wordbeast/WordBeastPrototype";
import Lv1PilotScreen from "./features/wordbeast/Lv1PilotScreen";
import ArenaScreen from "./features/arena/ArenaScreen";
import SpellBarrageScreen from "./features/arena/SpellBarrageScreen";

const NAV_ITEMS = [
  { to: "/", label: "首頁", icon: "home" },
  { to: "/review", label: "複習", icon: "review" },
  { to: "/quiz", label: "馴化", icon: "trial" },
  { to: "/browse", label: "萬字譜", icon: "archive" },
  { to: "/progress", label: "足跡", icon: "trace" },
];

function NavIcon({ name }: { name: string }) {
  if (name === "home") return <svg viewBox="0 0 24 24"><path d="m4 11 8-7 8 7v9H4Z" /><path d="M9 20v-6h6v6" /></svg>;
  if (name === "review") return <svg viewBox="0 0 24 24"><path d="M4 5.5Q8 4 12 7v13q-4-3-8-1Z" /><path d="M20 5.5Q16 4 12 7v13q4-3 8-1Z" /></svg>;
  if (name === "trial") return <svg viewBox="0 0 24 24"><path d="M6 4h12l-1 16H7Z" /><path d="M9 8h6M9 12h6M10 16h4" /></svg>;
  if (name === "archive") return <svg viewBox="0 0 24 24"><path d="M5 4h14v16H5Z" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>;
  return <svg viewBox="0 0 24 24"><path d="M5 19V9M10 19V5M15 19v-7M20 19V3" /></svg>;
}

function AppLayout() {
  const location = useLocation();
  const immersive = location.pathname === "/slash" || location.pathname.startsWith("/wordbeast") || location.pathname.startsWith("/arena/spell-barrage");

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col">
      <main className={immersive ? "flex-1" : "flex-1 pb-20"}>
        <Routes>
          <Route path="/" element={<DashboardScreen />} />
          <Route path="/review" element={<ReviewScreen />} />
          <Route path="/slash" element={<SlashScreen />} />
          <Route path="/wordbeast" element={<WordBeastPrototype />} />
          <Route path="/wordbeast/lv1" element={<Lv1PilotScreen />} />
          <Route path="/quiz" element={<QuizScreen />} />
          <Route path="/placement" element={<PlacementScreen />} />
          <Route path="/browse" element={<WordBrowserScreen />} />
          <Route path="/word/:wordId" element={<WordDetailScreen />} />
          <Route path="/progress" element={<ProgressScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/arena" element={<ArenaScreen />} />
          <Route path="/arena/spell-barrage" element={<SpellBarrageScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      {!immersive && (
        <nav className="app-bottom-nav">
          <div className="app-bottom-nav-inner">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `app-nav-item ${isActive ? "active" : ""}`}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}

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
      <AppLayout />
    </HashRouter>
  );
}
